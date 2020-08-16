import {PoolConnection, Pool, PoolConfig, createPool} from "mysql";
import {fromCallback} from "universalify";
import {ExecSqlOptions, ConnEngine, PoolEngine, SelectSql, InsertOrUpdate, ISql, IEngine, InsertSql, Table, TableBuilder, Field, Constraint, TableChange} from "..";

declare module "mysql" {
	interface PoolConnection {
		beginTransaction(): Promise<any>;
		commit(): Promise<any>;
		rollback(): Promise<any>;
		queryAsync(sql: string, args?: Array<any>, opts?: ExecSqlOptions): Promise<any>;
	}
}

function extendsConn(conn: PoolConnection) {
	conn.beginTransaction = fromCallback(conn.beginTransaction) as any;
	conn.commit = fromCallback(conn.commit) as any;
	conn.rollback = fromCallback(conn.rollback) as any;
	conn.queryAsync = function (sql: string, args?: Array<any>) {
		return new Promise((resolve, reject) => {
			this.query(sql, args, function (err, rows) {
				if (err) {
					reject(err);
				} else {
					resolve(rows);
				}
			});
		});
	};
}

interface SchemaTable {
	TABLE_NAME: string;
	ENGINE: "MyISAM" | "InnoDB";
	AUTO_INCREMENT: string;
	TABLE_COLLATION: string;
	TABLE_COMMENT: string;
}

interface SchemaField {
	/** 表名 */
	TABLE_NAME: string;
	/** 列名 */
	COLUMN_NAME: string;
	COLUMN_DEFAULT: null;
	IS_NULLABLE: "YES" | "NO";
	DATA_TYPE: string;
	CHARACTER_MAXIMUM_LENGTH?: number;
	CHARACTER_OCTET_LENGTH?: number;
	NUMERIC_PRECISION?: number;
	NUMERIC_SCALE?: number;
	DATETIME_PRECISION?: number;
	CHARACTER_SET_NAME?: string;
	COLLATION_NAME?: string;
	COLUMN_TYPE: string;
	COLUMN_KEY: "" | "MUL" | "PRI" | "UNI";
	EXTRA: "auto_increment" | "";
	COLUMN_COMMENT: string;
}

interface SchemaConstraint {
	TABLE_NAME: string;
	INDEX_NAME: string;
	NON_UNIQUE: number;
	REFERENCED_TABLE_NAME: string;
	COLUMN_NAME: string;
	REFERENCED_COLUMN_NAME: string;
}

function EngineOverride<B extends new (...args: any[]) => IEngine>(Base: B) {
	return class extends Base {
		quotes(key: string) {
			return key.replace(/(?<!["'\w])\w+(?!["'\w])/g, (x) => `\`${x}\``);
		}
		runSql(s: ISql) {
			if (s instanceof SelectSql && s.isPage()) {
				let {sql, args} = s;
				sql = sql.replace("select ", "select sql_calc_found_rows ");
				return this.execSQL([{sql, args}, "select found_rows() as total"], [], {transaction: false}).then((rows) => {
					return {list: rows[0], total: rows[1][0].total};
				});
			}
			if (s instanceof InsertSql && s.returnId()) {
				return this.execSQL({sql: s.sql, args: s.args, pack: (rows) => rows.insertId});
			}
			if (s instanceof InsertOrUpdate && !s.hasWhere()) {
				let insert = s.insertSql();
				let set = s.wrapSet();
				let sql = `${insert.sql} on duplicate key update ${set.sql};`;
				let args = insert.args.concat(set.args);
				return this.execSQL(sql, args);
			}
			return super.runSql(s);
		}
		getTables(db?: string): Promise<Table[]> {
			let pms = db ? Promise.resolve([{db}]) : this.execSQL(`select database() db`);
			return pms.then((rows) => {
				let db = rows[0].db;
				let sqls = [
					`select DEFAULT_CHARACTER_SET_NAME,DEFAULT_COLLATION_NAME from information_schema.schemata where SCHEMA_NAME=?`,
					`select TABLE_NAME,ENGINE,AUTO_INCREMENT,TABLE_COLLATION,TABLE_COMMENT from information_schema.tables where TABLE_SCHEMA=? and TABLE_TYPE='BASE TABLE' order by CREATE_TIME`,
					`select TABLE_NAME,COLUMN_NAME,COLUMN_DEFAULT,IS_NULLABLE,DATA_TYPE,CHARACTER_MAXIMUM_LENGTH,CHARACTER_OCTET_LENGTH,NUMERIC_PRECISION,NUMERIC_SCALE,DATETIME_PRECISION,CHARACTER_SET_NAME,COLLATION_NAME,COLUMN_TYPE,COLUMN_KEY,EXTRA,COLUMN_COMMENT from information_schema.columns where TABLE_SCHEMA=? order by TABLE_NAME,ORDINAL_POSITION`,
					{
						sql:
							`select s.TABLE_NAME,s.INDEX_NAME,s.NON_UNIQUE,k.REFERENCED_TABLE_NAME,group_concat(s.COLUMN_NAME order by SEQ_IN_INDEX) COLUMN_NAME,group_concat(k.REFERENCED_COLUMN_NAME order by SEQ_IN_INDEX) REFERENCED_COLUMN_NAME from ` +
							`	(select * from information_schema.statistics where TABLE_SCHEMA=?) as s ` +
							`left join ` +
							`	(select * from information_schema.key_column_usage where TABLE_SCHEMA=?) as k ` +
							`on s.TABLE_SCHEMA=k.TABLE_SCHEMA and s.TABLE_NAME=k.TABLE_NAME and s.INDEX_NAME=k.CONSTRAINT_NAME and s.COLUMN_NAME=k.COLUMN_NAME ` +
							`GROUP BY s.TABLE_NAME,s.INDEX_NAME,s.NON_UNIQUE,k.REFERENCED_TABLE_NAME ` +
							`UNION ` +
							`select k.TABLE_NAME,k.CONSTRAINT_NAME,s.NON_UNIQUE,k.REFERENCED_TABLE_NAME,group_concat(k.COLUMN_NAME order by SEQ_IN_INDEX) COLUMN_NAME,group_concat(k.REFERENCED_COLUMN_NAME order by SEQ_IN_INDEX) REFERENCED_COLUMN_NAME from ` +
							`	(select * from information_schema.statistics where TABLE_SCHEMA=?) as s ` +
							`right join ` +
							`	(select * from information_schema.key_column_usage where TABLE_SCHEMA=?) as k ` +
							`on s.TABLE_SCHEMA=k.TABLE_SCHEMA and s.TABLE_NAME=k.TABLE_NAME and s.INDEX_NAME=k.CONSTRAINT_NAME and s.COLUMN_NAME=k.COLUMN_NAME ` +
							`GROUP BY k.TABLE_NAME,k.CONSTRAINT_NAME,s.NON_UNIQUE,k.REFERENCED_TABLE_NAME`,
						args: [db, db, db, db],
					},
				];
				let args = [db];
				return this.execSQL(sqls, args, {transaction: false}).then((out) => {
					let schemata = out[0][0];
					let tables: SchemaTable[] = out[1];
					let fields: SchemaField[] = out[2];
					let constraints: SchemaConstraint[] = out[3];
					let tbs = new Map<string, TableBuilder>();
					let list: TableBuilder[] = [];
					for (let row of tables) {
						let tb = new TableBuilder(row.TABLE_NAME);
						if (row.TABLE_COLLATION != schemata.DEFAULT_COLLATION_NAME) tb.charset(row.TABLE_COLLATION.split("_")[0]);
						if (row.ENGINE != "InnoDB") tb.mysql_engine(row.ENGINE);
						tb.comment(row.TABLE_COMMENT);
						tbs.set(row.TABLE_NAME, tb);
						list.push(tb);
					}
					for (let row of fields) {
						let tb = tbs.get(row.TABLE_NAME);
						tb.addField({
							name: row.COLUMN_NAME,
							type: row.COLUMN_TYPE.replace("bigint(20)", "bigint").replace("int(10)", "int"),
							table: row.TABLE_NAME,
							default: row.COLUMN_DEFAULT,
							comment: row.COLUMN_COMMENT,
							charset: row.CHARACTER_SET_NAME == schemata.DEFAULT_CHARACTER_SET_NAME ? null : row.CHARACTER_SET_NAME,
							null: row.IS_NULLABLE == "YES",
							inc: row.EXTRA.toLowerCase() == "auto_increment",
						});
					}
					for (let row of constraints) {
						let tb = tbs.get(row.TABLE_NAME);
						let c = tb
							.constraint(row.REFERENCED_TABLE_NAME ? "FOREIGN" : row.INDEX_NAME == "PRIMARY" ? "PRIMARY" : row.NON_UNIQUE ? "" : "UNIQUE", row.COLUMN_NAME)
							.name(row.INDEX_NAME);
						if (row.REFERENCED_TABLE_NAME) c.references(row.REFERENCED_TABLE_NAME, row.REFERENCED_COLUMN_NAME);
					}
					return list.map((x) => x.build());
				});
			});
		}
		private fieldSql(field: Field) {
			let s = this.quotes(field.name) + " " + field.type;
			let canDef = !/text|json/.test(field.type);
			if (field.charset) s += " CHARACTER SET " + field.charset;
			if (!field.null) s += " NOT NULL";
			else if (canDef && field.default == null) s += " DEFAULT NULL";
			if (field.inc) s += " AUTO_INCREMENT";
			if (canDef && field.default != null) s += ` DEFAULT ${this.sqlval(field.default)}`;
			if (field.comment) s += ` COMMENT '${field.comment.replace(/'/g, "\\'")}'`;
			return s;
		}
		private constraintSql(constraint: Constraint) {
			let field = `(${constraint.fields.map((x) => this.quotes(x))})`;
			if (constraint.type === "PRIMARY") return `PRIMARY KEY ${field}`;
			let name = this.quotes(constraint.name);
			if (constraint.type === "UNIQUE") return `UNIQUE KEY ${name} ${field}`;
			if (constraint.type === "FOREIGN")
				return `CONSTRAINT ${name} FOREIGN KEY ${field} REFERENCES ${this.quotes(constraint.ref_table)} (${constraint.ref_fields.map((x) => this.quotes(x))})`;
			return `KEY ${name} ${field}`;
		}
		createTable(table: Table) {
			let tail = ")";
			if (table.mysql_engine) tail += " ENGINE=" + table.mysql_engine;
			if (table.inc) tail += " AUTO_INCREMENT=" + table.inc;
			if (table.charset) tail += " DEFAULT CHARACTER SET " + table.charset;
			if (table.comment) tail += ` COMMENT=${this.sqlval(table.comment)}`;
			let primary = table.primary;
			if (primary) {
				for (let key of primary.fields) {
					table.fields[key].null = false;
				}
			}
			let sql = [
				`CREATE TABLE ${this.quotes(table.name)} (`,
				[
					...table.mapField((field) => {
						return "\t" + this.fieldSql(field);
					}),
					...table
						.mapConstraint((constraint) => {
							return "\t" + this.constraintSql(constraint);
						})
						.sort(),
				].join(",\n"),
				tail + ";",
			];
			return [sql.join("\n")];
		}
		migration(newTable: Table, oldTable: Table): string[] {
			let list = newTable.migrationFrom(oldTable, (a, b) => a.strictEqual(b) && a.comment == b.comment);
			let table = oldTable.name;
			return list.map((f) => {
				// 约束
				if ("type" in f) {
					if (f.type == "create") {
						if (f.data.type == "FOREIGN")
							return `alter table ${this.quotes(table)} add constraint ${this.quotes(f.data.name)} foreign key (${f.data.fields.map((x) =>
								this.quotes(x)
							)}) references ${this.quotes(f.data.ref_table)} (${f.data.ref_fields.map((x) => this.quotes(x))})`;
						return `create ${f.data.type} index ${this.quotes(f.data.name)} on ${this.quotes(table)} (${f.data.fields.map((x) => this.quotes(x))})`;
					}
					return `alter table ${this.quotes(table)} drop index ${this.quotes(f.data.name)}`;
				}
				// 字段
				if (f.from && f.to) return `alter table ${this.quotes(table)} change ${this.quotes(f.from.name)} ${this.fieldSql(f.to)} ${f.after ? "after " + f.after : "first"}`;
				if (f.to) return `alter table ${this.quotes(table)} add column ${this.fieldSql(f.to)} ${f.after ? "after " + f.after : "first"}`;
				return `alter table ${this.quotes(table)} drop column ${f.from.name}`;
			});
		}
	};
}

const MysqlConnEngine = EngineOverride(
	class MysqlConnEngine extends ConnEngine {
		private conn: PoolConnection;
		constructor(conn: PoolConnection) {
			super();
			if (!conn.queryAsync) extendsConn(conn.constructor.prototype);
			this.conn = conn;
		}
		beginTransaction(): Promise<any> {
			return this.conn.beginTransaction();
		}
		commit(): Promise<any> {
			return this.conn.commit();
		}
		rollback(): Promise<any> {
			return this.conn.rollback();
		}
		queryAsync(sql: string, args?: any[], opts?: ExecSqlOptions): Promise<any> {
			return this.conn.queryAsync(sql, args, opts);
		}
		end(): Promise<any> {
			this.conn.release();
			return Promise.resolve();
		}
	}
);

export = EngineOverride(
	class MysqlPoolEngine extends PoolEngine {
		private pool: Pool;
		constructor(config: string | PoolConfig) {
			super();
			this.pool = createPool(config);
		}
		protected getConnEngine() {
			return MysqlConnEngine.prototype;
		}
		newConn(): Promise<ConnEngine> {
			return new Promise((resolve, reject) => {
				this.pool.getConnection((err, conn) => {
					if (err) {
						this.log.error("can't connect to DB: " + err.toString());
						reject(err);
					} else {
						resolve(new MysqlConnEngine(conn));
					}
				});
			});
		}
		end() {
			return new Promise((resolve, reject) => this.pool.end((err) => (err ? reject(err) : resolve())));
		}
	}
);
