import {Database} from "sqlite3";
import {ConnEngine, PoolEngine, InsertOrUpdate, IEngine, ISql, InsertSql, Table, TableChange, TableBuilder} from "..";
import {Field} from "../schema";

declare module "sqlite3" {
	interface Database {
		end(): Promise<any>;
	}
}

function EngineOverride<B extends new (...args: any[]) => IEngine>(Base: B) {
	return class extends Base {
		quotes(key: string) {
			return key.replace(/(?<!["'[\w])\w+(?!["'\]\w])/, (x) => `[${x}]`);
		}
		runSql(s: ISql) {
			if (s instanceof InsertSql && s.returnId()) {
				return this.execSQL({sql: s.sql, args: s.args, pack: (rows) => rows.lastID});
			}
			if (s instanceof InsertOrUpdate && !s.hasWhere()) {
				let insert = s.insertSql();
				return this.execSQL(insert, [], {ignore: true}).catch((err) => {
					if (err.code == "SQLITE_CONSTRAINT") {
						let u = s.updateSql();
						err.message.replace(/\w+\.(\w+)/g, function (x0, x1) {
							u.where(x1, s.get(x1));
						});
						return this.execSQL(u);
					}
					return Promise.reject(err);
				});
			}
			return super.runSql(s);
		}
		private parse(sql: string): Promise<Table> {
			return new Promise((resolve, reject) => {
				const parser = require("sqlite-parser");
				parser(sql, function (err, ast) {
					err ? reject(err) : resolve(ast);
				});
			}).then((ast: any) => {
				let create = ast.statement[0];
				let sb = new TableBuilder(create.name.name);
				for (let row of create.definition) {
					if (row.variant == "column") {
						let nil = true;
						let inc = false;
						let def = null;
						for (let d of row.definition) {
							if (d.variant == "default") {
								if (d.value.variant != "null") def = d.value.value;
							} else if (d.variant == "not null") nil = false;
							else if (d.variant == "primary key") {
								sb.constraint("PRIMARY", row.name).type("PRIMARY");
								if (d.autoIncrement) inc = true;
							}
						}
						sb.addField({
							name: row.name,
							type: row.datatype ? row.datatype.variant.replace("integer", "int") : null,
							table: create.name.name,
							default: def,
							comment: null,
							charset: null,
							null: nil,
							inc: inc,
						});
					} else if (row.variant == "constraint") {
						var c = sb
							.constraint(
								"",
								row.columns.map((x) => x.name)
							)
							.name(row.name);
						var d = row.definition[0];
						if (d.variant == "foreign key") {
							c.type("FOREIGN");
							c.references(
								d.references.name,
								d.references.columns.map((x) => x.name)
							);
						} else if (d.variant == "unique") c.type("UNIQUE");
					}
				}
				return sb.build();
			});
		}
		getTables(): Promise<Table[]> {
			return this.execSQL(`select name,sql from sqlite_master where type="table" and name!='sqlite_sequence'`).then((rows) => {
				return Promise.all(rows.map((row) => this.parse(row.sql)));
			});
		}
		private fieldSql(field: Field) {
			let s =
				this.quotes(field.name) +
				" " +
				field.type
					.replace("bigint", "real")
					.replace("int", "integer")
					.replace(" unsigned", "")
					.replace(/varchar\(\d+\)/, "varchar");
			let canDef = !/text|json/.test(field.type);
			if (!field.null) s += " NOT NULL";
			else if (canDef && field.default == null) s += " DEFAULT NULL";
			if (canDef && field.default != null) s += ` DEFAULT ${this.sqlval(field.default)}`;
			return s;
		}
		createTable(table: Table) {
			let tail = ")";
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
						let s = this.fieldSql(field);
						if (table.primary && field.name == table.primary.fields[0]) {
							s += " PRIMARY KEY";
							if (field.inc) s += " AUTOINCREMENT";
						}
						return "\t" + s;
					}),
					...table
						.mapConstraint((constraint) => {
							let field = `(${constraint.fields.map((x) => this.quotes(x))})`;
							if (constraint.type === "PRIMARY") return ``;
							let name = this.quotes(constraint.name);
							if (constraint.type === "UNIQUE") return `UNIQUE ${field}`;
							if (constraint.type === "FOREIGN")
								return `CONSTRAINT ${name} FOREIGN KEY ${field} REFERENCES ${this.quotes(constraint.ref_table)} (${constraint.ref_fields.map((x) =>
									this.quotes(x)
								)})`;
							return "";
						})
						.filter((x) => x)
						.map((x) => "\t" + x),
				].join(",\n"),
				tail + ";",
			];
			return [sql.join("\n")];
		}
		migration(newTable: Table, oldTable: Table): string[] {
			let toFields = Object.values(newTable.fields);
			let fromFields = Object.values(oldTable.fields);
			let ss = [];
			for (let f1 of toFields) {
				let f0: Field, flike: Field;
				for (let i = 0; i < fromFields.length; i++) {
					let f = fromFields[i];
					if (f1.equal(f)) {
						f0 = f;
						break;
					}
					if (!flike && f.type == f1.type && f.default == f1.default) {
						flike = f;
					}
				}
				if (!f0) f0 = flike;
				if (f0) {
					fromFields.splice(fromFields.indexOf(f0), 1);
					ss.push(this.quotes(f0.name));
				} else {
					// 多了个字段
					ss.push(this.sqlval(f1.default));
				}
			}
			let table = oldTable.name;
			let tmp = "__tmp__" + table;
			return [
				`create table ${this.quotes(tmp)} as select * from ${this.quotes(table)}`,
				`drop table ${this.quotes(table)}`,
				...this.createTable(newTable),
				`insert into ${this.quotes(newTable.name)} select ${ss.join()} from ${this.quotes(tmp)}`,
				`drop table ${this.quotes(tmp)}`,
			];
		}
	};
}

const SqliteConnEngine = EngineOverride(
	class SqliteConnEngine extends ConnEngine {
		conn: Database;
		constructor(conn: Database) {
			super();
			this.conn = conn;
		}
		beginTransaction(): Promise<any> {
			return this.queryAsync("BEGIN TRANSACTION");
		}
		commit(): Promise<any> {
			return this.queryAsync("COMMIT TRANSACTION");
		}
		rollback(): Promise<any> {
			return this.queryAsync("ROLLBACK TRANSACTION");
		}
		queryAsync(sql: string, args?: any[]) {
			let db = this.conn;
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
						sql += "?" + s;
					}
				}
				args = arr;
			}
			return new Promise((resolve, reject) => {
				if (/^\s*select/i.test(sql))
					db.all(sql, args, function (err, rows) {
						if (err) {
							reject(err);
						} else {
							resolve(rows);
						}
					});
				else
					db.run(sql, args, function (err) {
						if (err) {
							reject(err);
						} else {
							resolve(this);
						}
					});
			});
		}
		end(): Promise<any> {
			return this.conn.end();
		}
	}
);

export = EngineOverride(
	class SqliteEngine extends PoolEngine {
		private _filename: string;
		private pools: Database[];
		protected getConnEngine(): ConnEngine {
			return SqliteConnEngine.prototype;
		}
		constructor(name: string) {
			super();
			name = name.replace(/^sqlite3:\/\//i, "");
			this._filename = name || ":memory:";
			this.pools = [];
		}
		newConn(): Promise<ConnEngine> {
			let pools = this.pools;
			return new Promise((resolve, reject) => {
				let pool = new Database(this._filename, (err) => {
					if (err) {
						this.log.error("can't connect to DB <" + this._filename + ">:", err);
						reject(err);
					} else {
						pools.push(pool);
						resolve(new SqliteConnEngine(pool));
					}
				});
				pool.end = function () {
					return new Promise((resolve, reject) => {
						var idx = pools.indexOf(this);
						if (idx >= 0) pools.splice(idx, 1);
						this.close((err) => (err ? reject(err) : resolve()));
					});
				};
			});
		}
		end(): Promise<any> {
			return Promise.all(this.pools.map((x) => x.end()));
		}
	}
);
