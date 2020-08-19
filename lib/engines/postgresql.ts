import {Pool, PoolConfig, PoolClient} from "pg";
import {ConnEngine, PoolEngine, IEngine, ISql, InsertSql, SelectSql, InsertOrUpdate, Table} from "..";
import {TableBuilder, Field} from "../schema";
import {table} from "console";
import {parse} from "url";

interface PgTable {
	oid: number;
	relname: string;
}

interface PgColumn {
	table_name: string;
	column_name: string;
	ordinal_position: number;
	column_default: string;
	is_nullable: string;
	data_type: string;
	character_maximum_length: number;
	udt_name: string;
}

interface PgConstraint {
	conname: string;
	contype: "f" | "c" | "u" | "p";
	conrelid: number;
	confrelid: number;
	conkeyname: string;
	confkeyname: string;
}

interface PgIndex {
	tablename: string;
	indexname: string;
	indexdef: string;
}

class PgSelectSql<T> extends SelectSql<T> {
	limit(offset: number, size: number) {
		offset = +offset;
		size = +size;
		if (size && offset) this._limit = ` limit ${size} offset ${offset}`;
		else if (size) this._limit = ` limit ${size}`;
		else if (offset) this._limit = ` offset ${offset}`;
		else this._limit = " limit 1";
		return this;
	}
}

const TYPE_MAP = {
	int8: "bigint",
	float8: "float",
};

function EngineOverride<B extends new (...args: any[]) => IEngine>(Base: B) {
	return class extends Base {
		runSql(s: ISql) {
			if (s instanceof InsertSql && s.returnId()) {
				return this.execSQL({sql: s.sql + " returning id", args: s.args, pack: (rows) => rows[0].id});
			}
			if (s instanceof InsertOrUpdate && !s.hasWhere()) {
				let insert = s.insertSql();
				return this.execSQL(insert, [], {ignore: true}).catch((err) => {
					if (/^duplicate/.test(err.message)) {
						let m = /Key \(([^)]+)/.exec(err.detail);
						if (m) {
							let u = s.updateSql();
							for (let k of m[1].split(",")) {
								k = k.trim();
								u.where(k, s.get(k));
							}
							return this.execSQL(u);
						}
					}
					return Promise.reject(err);
				});
			}
			return super.runSql(s);
		}
		select<T = any>(table: string, keys?: string | string[]) {
			return new PgSelectSql<T>(table, keys).engine(this);
		}
		getTables(db?: string, nspname = "public") {
			let pms = db ? Promise.resolve([{db}]) : this.execSQL(`select current_database() db`);
			return pms
				.then((rows) => rows[0].db)
				.then((x) => {
					db = x;
					return this.execSQL("select oid from pg_namespace where nspname=?", [nspname]).then((rows) => rows[0].oid);
				})
				.then((oid) => {
					return this.execSQL(`select oid,relname from pg_class where relkind='r' and relpersistence='p' and relnamespace=?`, [oid]).then((tables: PgTable[]) => ({
						db,
						tables,
					}));
				})
				.then(({db, tables}) => {
					let sqls = [
						{
							sql: `select table_name,column_name,ordinal_position,column_default,is_nullable,data_type,character_maximum_length,udt_name from information_schema.columns where table_catalog=? and table_schema=? order by table_name,ordinal_position`,
							args: [db, nspname],
						},
						{
							sql:
								"select conrelid,conname,contype,confrelid," +
								"	(select string_agg(attname,',') from pg_attribute,unnest(conkey) as n where attnum>0 and attrelid=conrelid and attnum=n) conkeyname," +
								"	(select string_agg(attname,',') from pg_attribute,unnest(confkey) as n where attnum>0 and attrelid=confrelid and attnum=n) confkeyname " +
								"from pg_constraint where conrelid in (?)",
							args: [tables.map((x) => x.oid)],
						},
						{sql: `select tablename,indexname,indexdef from pg_indexes where schemaname=?`, args: [nspname]},
					];
					return this.execSQL(sqls, [], {transaction: false}).then((out) => ({
						tables,
						columns: out[0] as PgColumn[],
						constraints: out[1] as PgConstraint[],
						indexs: out[2] as PgIndex[],
					}));
				})
				.then(({tables, columns, constraints, indexs}) => {
					let o2t = new Map<number, string>();
					let n2t = new Map<string, TableBuilder>();
					let list: TableBuilder[] = [];
					for (let row of tables) {
						let t = new TableBuilder(row.relname);
						n2t.set(row.relname, t);
						o2t.set(row.oid, row.relname);
						list.push(t);
					}
					for (let row of columns) {
						let t = n2t.get(row.table_name);
						let def = row.column_default;
						let inc = false;
						if (def) {
							if (def.startsWith("nextval(")) (inc = true), (def = null);
							else {
								var idx = def.indexOf(":");
								if (idx >= 0) def = def.slice(0, idx);
								if (def[0] == def[def.length - 1] && def[0] == "'") def = def.slice(1, -1);
							}
						}
						t.addField({
							name: row.column_name,
							type: inc && row.udt_name == "int8" ? "int unsigned" : TYPE_MAP[row.udt_name] || row.udt_name,
							table: row.table_name,
							default: def,
							comment: null,
							charset: null,
							null: row.is_nullable == "YES",
							inc,
						});
					}
					for (let row of constraints) {
						let t = n2t.get(o2t.get(row.conrelid));
						if (row.contype == "u") t.constraint("UNIQUE", row.conkeyname).name(row.conname);
						else if (row.contype == "p") t.constraint("PRIMARY", row.conkeyname).name(row.conname);
						else if (row.contype == "f") t.constraint("FOREIGN", row.conkeyname).name(row.conname).references(o2t.get(row.confrelid), row.confkeyname);
					}
					for (let row of indexs) {
						let t = n2t.get(row.tablename);
						if (row.indexdef.startsWith("CREATE INDEX ")) {
							let m = /\(([^)]+)/.exec(row.indexdef);
							t.constraint("", m[1]).name(row.indexname);
						}
						// else if(row.indexdef.startsWith('CREATE UNIQUE INDEX '));
					}
					return list.map((x) => x.build());
				});
		}
		private fieldType(type: string) {
			return type.replace(/int unsigned/, "bigint").replace(/varchar\(\d+\)/, "varchar");
		}
		private fieldSql(field: Field) {
			let s = this.quotes(field.name) + " " + (field.inc ? "serial" : this.fieldType(field.type));
			let canDef = !field.inc && !/text|json/.test(field.type);
			if (!field.null) s += " NOT NULL";
			if (canDef) {
				if (field.default == null) s += " DEFAULT NULL";
				else s += ` DEFAULT ${this.sqlval(field.default)}`;
			}
			return s;
		}
		createTable(table: Table) {
			let tail = ")";
			if (table.charset) tail += ` ENCODING '${table.charset}'`;
			let primary = table.primary;
			if (primary) {
				for (let key of primary.fields) {
					table.fields[key].null = false;
				}
			}
			let sqls = [];
			let sql = [
				`CREATE TABLE ${this.quotes(table.name)} (`,
				[
					...table
						.mapField((x) => x)
						.sort((a, b) => {
							let t = 0;
							if (primary) {
								t = primary.fields.indexOf(a.name) - primary.fields.indexOf(b.name);
								if (t) return t;
							}
							t = +a.null - +b.null;
							if (t) return t;
							if (a.name == b.name) return 0;
							return a.name > b.name ? 1 : -1;
						})
						.map((field) => {
							return "\t" + this.fieldSql(field);
						}),
					...table
						.mapConstraint((x) => x)
						.sort((a, b) => {
							let t = +(b.type == "PRIMARY") - +(a.type == "PRIMARY");
							if (t) return t;
							if (a.name == b.name) return 0;
							return a.name > b.name ? 1 : -1;
						})
						.map((constraint) => {
							let field = `(${constraint.fields.map((x) => this.quotes(x))})`;
							if (constraint.type === "PRIMARY") return `PRIMARY KEY ${field}`;
							let name = this.quotes(constraint.name);
							if (constraint.type === "UNIQUE") return `CONSTRAINT ${name} UNIQUE ${field}`;
							if (constraint.type === "FOREIGN")
								return `CONSTRAINT ${name} FOREIGN KEY ${field} REFERENCES ${this.quotes(constraint.ref_table)} (${constraint.ref_fields.map((x) =>
									this.quotes(x)
								)})`;
							sqls.push(`CREATE INDEX ${name} ON ${this.quotes(table.name)}${field}`);
							return ``;
						})
						.filter((x) => x)
						.map((x) => "\t" + x),
				].join(",\n"),
				tail + ";",
			];
			sqls.unshift(sql.join("\n"));
			return sqls;
		}
		migration(newTable: Table, oldTable: Table): string[] {
			let list = newTable.migrationFrom(oldTable, (a, b) => a.strictEqual(b, this.fieldType.bind(this)));
			let table = oldTable.name;
			let tmps = list.map((f) => {
				// 约束
				if ("type" in f) {
					if (f.type == "create") {
						if (f.data.type == "FOREIGN")
							return `alter table ${this.quotes(table)} add constraint ${this.quotes(f.data.name)} foreign key (${f.data.fields.map((x) =>
								this.quotes(x)
							)}) references ${this.quotes(f.data.ref_table)} (${f.data.ref_fields.map((x) => this.quotes(x))})`;
						if (f.data.type == "UNIQUE")
							return `alter table ${this.quotes(table)} add constraint ${this.quotes(f.data.name)} unique (${f.data.fields.map((x) => this.quotes(x))})`;
						return `create ${f.data.type} index ${this.quotes(f.data.name)} on ${this.quotes(table)} (${f.data.fields.map((x) => this.quotes(x))})`;
					}
					if (f.data.type) return `alter table ${this.quotes(table)} drop constraint ${this.quotes(f.data.name)}`;
					return `drop index ${this.quotes(f.data.name)}`;
				}
				// 字段
				if (f.from && f.to) {
					let sqls: string[] = [];
					if (f.from.name != f.to.name) sqls.push(`alter table ${this.quotes(table)} rename ${this.quotes(f.from.name)} to ${this.quotes(f.to.name)}`);
					if (f.from.type != f.to.type) sqls.push(`alter table ${this.quotes(table)} alter column ${this.quotes(f.to.name)} type ${this.fieldType(f.to.type)}`);
					let canDef = !/text|json/.test(f.to.type);
					if (!f.to.null) sqls.push(`alter table ${this.quotes(table)} alter column ${this.quotes(f.to.name)} set not null`);
					if (canDef) {
						// sqls.push(`alter table ${this.quotes(table)} alter column ${this.quotes(f.to.name)} drop default`);
						if (f.to.inc) {
							sqls.push(`CREATE SEQUENCE if not exists ${table}_id_seq`);
							sqls.push(`alter table ${this.quotes(table)} alter column ${this.quotes(f.to.name)} set default nextval('${table}_id_seq')`);
						} else if (f.to.default == null) sqls.push(`alter table ${this.quotes(table)} alter column ${this.quotes(f.to.name)} set default null`);
						if (f.to.default != null) sqls.push(`alter table ${this.quotes(table)} alter column ${this.quotes(f.to.name)} set DEFAULT ${this.sqlval(f.to.default)}`);
					}
					return sqls;
				}
				if (f.to) return `alter table ${this.quotes(table)} add column ${this.fieldSql(f.to)}`;
				return `alter table ${this.quotes(table)} drop column ${f.from.name}`;
			});
			return tmps.reduce<string[]>((a, b) => (b instanceof Array ? a.push(...b) : a.push(b), a), []);
		}
	};
}

const PgConnEngine = EngineOverride(
	class PgConnEngine extends ConnEngine {
		private conn: PoolClient;
		constructor(conn: PoolClient) {
			super();
			this.conn = conn;
		}
		beginTransaction(): Promise<any> {
			return this.conn.query("BEGIN");
		}
		commit(): Promise<any> {
			return this.conn.query("COMMIT");
		}
		rollback(): Promise<any> {
			return this.conn.query("ROLLBACK");
		}
		queryAsync(sql: string, args?: any[]): Promise<any> {
			let ss = sql.split("?");
			if (ss.length > 1) {
				sql = ss[0];
				let arr = [];
				for (let i = 1; i < ss.length; i++) {
					let s = ss[i];
					let arg = args[i - 1];
					if (arg instanceof Array && /\sin\s*\($/i.test(ss[i - 1])) {
						sql += arg.map((x) => this.sqlval(x)).join() + s;
					} else {
						arr.push(arg);
						sql += "$" + arr.length + s;
					}
				}
				args = arr;
			}
			return this.conn.query(sql, args).then((x) => {
				return x.rows;
			});
		}
		end(): Promise<any> {
			this.conn.release();
			return Promise.resolve();
		}
	}
);

export = EngineOverride(
	class PgEngine extends PoolEngine {
		private pool: Pool;
		constructor(config: PoolConfig | string) {
			super();
			if (typeof config === "string") {
				let u = parse(config);
				let [user, password] = u.auth.split(":");
				config = {
					host: u.hostname,
					user,
					password,
					database: u.path.slice(1),
				};
			}
			this.pool = new Pool(config);
		}
		protected getConnEngine() {
			return PgConnEngine.prototype;
		}
		newConn(): Promise<ConnEngine> {
			return this.pool.connect().then((client) => new PgConnEngine(client));
		}
		end() {
			return this.pool.end();
		}
	}
);
