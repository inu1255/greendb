import {Runnable, Wherable, Base, Tablable} from "./mixins";
import {Table, TableChange, Field, Constraint} from ".";

/**
 * 把v转换为mysql可以接收的参数，把对象转换成json字符串
 * @param {any} v 值
 * @returns {String}
 */
export function val(v: any): string {
	if (v === undefined) v = null;
	return v && typeof v === "object" ? JSON.stringify(v) : v;
}

/**
 * 如果args为undefined则返回 def||[]
 * 如果args是一个Array则返回自己
 * 如果不是则返回[args]
 * @param {any} args
 * @param {Array} [def] 默认值
 * @returns {Array}
 */
export function arr<T>(args: T | T[], def?: T[]): T[] {
	if (args instanceof Array) return args;
	return args === undefined ? def || [] : [args];
}

export interface Paged<T> {
	[key: string]: any;
	total: number;
	list: T[];
}

export interface ISql {
	sql: string;
	args: any[];
	ignore_log?: boolean;
	pack?(x: any): any;
}

interface CloneAble {
	clone(): this;
}

function instanceOfCloneAble(o: any): o is CloneAble {
	return o && typeof o["clone"] === "function";
}

export interface ExecSqlOptions {
	[key: string]: any;
	transaction?: boolean;
	ignore?: boolean;
}

export interface IEngine {
	/** DQL/DML需要 */
	quotes(key: string): string;
	sqlval(v: any): string;
	runSql(s: ISql): Promise<any>;
	execSQL(
		sqls: Array<ISql | string> | ISql | string,
		args?: any[],
		ctx?: ExecSqlOptions
	): Promise<any>;
	/** DDL需要 */
	getTables(): Promise<Table[]>;
	createTable(table: Table): string[];
	migration(newTable: Table, oldTable: Table): string[];
}

export class Raw implements ISql, CloneAble {
	["constructor"]: typeof Raw;
	protected _sql: string;
	protected _args: any[];
	constructor(sql?: string, args?: any) {
		this._sql = sql || "";
		this._args = arr(args);
	}
	get sql() {
		return this._sql;
	}
	get args() {
		return this._args;
	}
	/**
	 * 用args替换sql中的?并返回字符串
	 * @returns {string}
	 */
	toString(): string {
		let i = 0;
		let args = this.args;
		return this.sql.replace(/\?/g, function () {
			let s = args[i++];
			if (typeof s === "string") return `'${s.replace(/'/g, "\\'")}'`;
			return s;
		});
	}
	load(b: ISql) {
		this._sql = b.sql;
		this._args = b.args;
	}
	clone(): this {
		let inst = {} as this;
		// @ts-ignore
		inst.__proto__ = this.constructor.prototype;
		for (let k in this) {
			if (k[0] == "_") {
				let v = this[k];
				inst[k] = instanceOfCloneAble(v) ? v.clone() : v;
			}
		}
		return inst;
	}
	/**
	 * 添加参数
	 * @param b 参数
	 */
	push(b: ISql) {
		this._sql += b.sql;
		this._args.push.apply(this._args, b.args);
		return this;
	}
	/**
	 * @param b
	 */
	concat(b: ISql) {
		return this.clone().push(b);
	}
}

/**
 * 用于构建sql的where语句
 */
export class Where extends Raw {
	clone() {
		return new Where(this._sql, this._args) as this;
	}
	isEmpty() {
		return this._sql.length < 1;
	}
	toWhere() {
		return this.isEmpty() ? "" : " where " + this.sql;
	}
	/**
	 * 加括号，将foo=? and bar=?变成(foo=? and bar=?)
	 * 之后调用and/or时，会变成(foo=? and bar=?) and/or baz=?
	 */
	build() {
		if (this._sql.length > 0) {
			this._sql = "(" + this.sql + ")";
		}
		return this;
	}
	/**
	 * 使用op拼接两个where语句，wb会加括号
	 * foo=? or bar=? 使用and拼接 baz=? or qux=? 变成 foo=? or bar=? and (baz=? or qux=?)
	 * 可以先调用build再拼接 变成 (foo=? or bar=?) and (baz=? or qux=?)
	 * @param {String} op and/or
	 * @param {Where} wb 另一个where语句
	 */
	add(op: string, wb: Where) {
		if (!wb.isEmpty()) {
			if (this._sql.length) this._sql += " " + op;
			this._sql += " " + wb.build().sql;
			this._args = this._args.concat(wb.args);
		}
		return this;
	}
	/**
	 * 参见 where 和 this.concat
	 * @param {Where|String|Array|Object} key
	 * @param {String} op
	 * @param {any} value
	 */
	and(key: string | {[key: string]: any} | Where, value: any) {
		let wb = key instanceof Where ? key : where(key, value);
		return this.add("and", wb);
	}
	/**
	 * 参见 where 和 this.concat
	 * @param {Where|String|Array|Object} key
	 * @param {String} op
	 * @param {any} value
	 */
	or(key: string | {[key: string]: any} | Where, value: any) {
		let wb = key instanceof Where ? key : where(key, value);
		return this.add("or", wb);
	}
}

export class Sql extends Runnable(Tablable(Raw)) {
	constructor(table: string) {
		super();
		this.table(table);
	}
	quotes(key: string) {
		return this._e ? this._e.quotes(key) : key;
	}
}

class SqlWhere<T> extends Wherable(Sql) implements Promise<T> {
	constructor(table: string) {
		super(table);
	}
	get sql() {
		return `${this._sql}${this.quotes(this._table)}${this._where.toWhere()}`;
	}
	get args() {
		return this._args.concat(this._where.args);
	}
}

export class InsertSql<T = any> extends Sql implements Promise<T> {
	protected _id: boolean;
	protected _ignore: string;
	private _data: any;
	constructor(table: string, data: any) {
		super(table);
		this._args = [];
		this._ignore = "";
		this._data = data;
	}
	engine(e: IEngine) {
		this.load(wrapInsert(this._data, (x) => e.quotes(x)));
		return super.engine(e);
	}
	get sql() {
		return `insert ${this._ignore}into ${this.quotes(this._table)} ${this._sql}`;
	}
	pack(rows) {
		if (this._id)
			for (let k in rows) {
				if (/id/i.test(k)) return rows[k];
			}
		return rows;
	}
	id() {
		this._id = true;
		return this;
	}
	returnId(): boolean {
		return this._id;
	}
	ignore() {
		this._ignore = "ignore ";
		return this;
	}
}

export class SelectSql<T = any> extends SqlWhere<T> {
	protected _page: boolean;
	protected _keys: string[];
	protected _count: boolean;
	protected _order: string;
	protected _limit: string;
	protected _first: boolean;
	protected _exclude: string[];
	constructor(table: string, keys?: string | string[]) {
		super(table);
		if (!keys || !keys.length) this._keys = ["*"];
		else if (typeof keys === "string") this._keys = keys.split(",");
		else this._keys = keys;
		this._order = "";
		this._limit = "";
		this._page = false;
	}
	get sql() {
		return `select ${this._keys.join(",")} from ${this.quotes(
			this._table
		)}${this._where.toWhere()}${this._order}${this._limit}`;
	}
	/**
	 * @param {String} [key]
	 */
	count(key?: string) {
		this._keys = [`count(${key || "*"}) cnt`];
		this._first = true;
		this._count = true;
		this._order = "";
		this._limit = "";
		return this;
	}
	orderBy(key: string) {
		this._order = key ? ` order by ${key}` : "";
		return this;
	}
	limit(offset: number, size: number) {
		offset = +offset;
		size = +size;
		if (size) this._limit = ` limit ${offset},${size}`;
		else if (offset) this._limit = ` limit ${offset}`;
		else this._limit = " limit 1";
		return this;
	}
	first() {
		if (!this._limit) this._limit = " limit 1";
		this._first = true;
		return this;
	}
	page(): Promise<Paged<T>> {
		this._page = true;
		return this as any;
	}
	isPage() {
		return this._page;
	}
	pack(rows: any[]) {
		let keys = this._exclude;
		if (keys && keys.length) {
			for (let row of rows) {
				for (let key of keys) {
					delete row[key];
				}
			}
		}
		if (this._first) {
			if (this._count) return +rows[0].cnt;
			return rows[0];
		}
		return rows;
	}
	exclude(keys: string[]): PromiseLike<any> {
		this._exclude = keys;
		return this;
	}
}

export class UpdateSql<T = any> extends SqlWhere<T> {
	private _data: any;
	constructor(table: string, data: any) {
		super(table);
		this._data = data;
	}
	engine(e: IEngine) {
		this.load(wrapSet(this._data, (x) => e.quotes(x)));
		return super.engine(e);
	}
	get sql(): string {
		return `update ${this.quotes(this._table)} set ${this._sql}${this._where.toWhere()}`;
	}
	run() {
		if (this._where.isEmpty()) return Promise.reject(`禁止update不带where语句: ${this.sql}`);
		return super.run();
	}
}

export class DeleteSql<T = any> extends SqlWhere<T> {
	constructor(table: string) {
		super(table);
		this._sql = "delete from ";
	}
	run() {
		if (this._where.isEmpty()) return Promise.reject(`禁止delete不带where语句: ${this.sql}`);
		return super.run();
	}
}

export class InsertNotExist<T = any>
	extends Wherable(Tablable(Runnable(Base)))
	implements Promise<T>
{
	protected _id: boolean;
	protected _data: any;
	constructor(table: string, data: any) {
		super();
		this.table(table);
		this._data = data;
	}
	selectSql() {
		return new SelectSql(this._table)
			.engine(this._e)
			.where(this._where.isEmpty() ? where(this._data) : this._where)
			.first();
	}
	insertSql() {
		let s = new InsertSql(this._table, this._data).engine(this._e);
		if (this._id) s.id();
		return s;
	}
	id() {
		this._id = true;
		return this;
	}
	returnId(): boolean {
		return this._id;
	}
}

export class InsertOrUpdate<T = any>
	extends Wherable(Tablable(Runnable(Base)))
	implements Promise<T>
{
	protected _id: boolean;
	protected _insertData: any;
	protected _updateData: any;
	protected _insert: InsertSql<T>;
	constructor(table: string, data: any, keys?: string[]) {
		super();
		this.table(table);
		this._insertData = data;
		keys = keys instanceof Array ? keys : Object.keys(data);
		let item = {};
		for (let k of keys) {
			item[k] = this._insertData[k];
		}
		this._updateData = item;
		this._insert = new InsertSql(this._table, this._insertData);
	}
	get(k: string) {
		return this._insertData[k];
	}
	insertSql() {
		return this._insert.engine(this._e);
	}
	updateSql() {
		return new UpdateSql(this._table, this._updateData).where(this._where).engine(this._e);
	}
	selectSql() {
		if (this._where.isEmpty()) return;
		return new SelectSql(this._table).where(this._where).first().engine(this._e);
	}
	wrapSet() {
		return wrapSet(this._updateData, (x) => this._e.quotes(x));
	}
	hasWhere() {
		return !this._where.isEmpty();
	}
	id() {
		return this._insert.id();
	}
}

/**
 * 生成set 字符串,如：
 * id=?,name=?
 * @param data
 */
function wrapSet(data: any, quotes: Function) {
	if (data instanceof Raw) return data;
	let keys = [];
	let args = [];
	for (let k in data) {
		let v = data[k];
		if (v === undefined) continue;
		if (v instanceof Raw) {
			keys.push(quotes(k) + "=(" + v.sql + ")");
			args.push.apply(args, v.args);
		} else {
			keys.push(quotes(k) + "=?");
			args.push(val(v));
		}
	}
	return new Raw(keys.join(","), args);
}

/**
 * 生成insert values 字符串,如：
 * (?,?)
 * @param data
 * @param keys 	如果没有传，会遍历data中所有数据(忽略undefined)；
 * 				如果是空数组，会遍历data中所有数据(忽略undefined),并在keys中记录相应的键；
 * 				如果是非空数组，会使用keys遍历data中的数据(undefined当成null)
 */
function warpValues(data: object, keys?: string[]) {
	let values = [];
	let args = [];
	if (!keys) {
		for (let k in data) {
			let v = data[k];
			if (v === undefined) continue;
			if (v instanceof Raw) {
				values.push(v.sql);
				args.push.apply(args, v.args);
			} else {
				values.push("?");
				args.push(val(v));
			}
		}
	} else if (keys.length) {
		for (let k of keys) {
			let v = data[k];
			if (v instanceof Raw) {
				values.push(v.sql);
				args.push.apply(args, v.args);
			} else {
				values.push("?");
				args.push(val(v));
			}
		}
	} else {
		for (let k in data) {
			let v = data[k];
			if (v === undefined) continue;
			keys.push(k);
			if (v instanceof Raw) {
				values.push(v.sql);
				args.push.apply(args, v.args);
			} else {
				values.push("?");
				args.push(val(v));
			}
		}
	}
	return new Raw(`(${values.join(",")})`, args);
}

/**
 * 生成insert 语句,如：
 * (id,name) values(?,?),(?,?)
 * @param data
 */
function wrapInsert(data, quotes: Function) {
	data = arr(data);
	if (data.length > 0) {
		let keys = [];
		let raw = warpValues(data[0], keys);
		let dst = new Raw(`(${keys.map(quotes as any).join(",")}) values${raw.sql}`, raw.args);
		for (let i = 1; i < data.length; i++) {
			let item = data[i];
			raw = warpValues(item, keys);
			dst.push({sql: `,${raw.sql}`, args: raw.args});
		}
		return dst;
	}
}

/**
 * 生成一个WhereBuilder
 * where("name","admin")
 * where("name like ?","adm%")
 * where({"name":"admin"})
 * @param key
 * @param value
 */
function where(key: string | {[key: string]: any}, value?: any) {
	if (typeof key === "string") {
		if (/\?/.test(key)) return new Where(key, value);
		if (value instanceof Raw) return new Where(`${key}=(${value.sql})`, value.args);
		if (value === null) return new Where(`${key} is null`);
		if (value == null) return new Where(key);
		return new Where(key + "=?", value);
	}
	let wb = new Where();
	for (let k in key) {
		let v = key[k];
		if (v !== undefined) wb.and(k, v);
	}
	return wb;
}

export function instanceOfSql(sql): sql is ISql {
	return sql && typeof sql.sql === "string" && sql.args instanceof Array;
}

export interface Logger {
	debug(message?: any, ...optionalParams: any[]): void;
	info(message?: any, ...optionalParams: any[]): void;
	error(message?: any, ...optionalParams: any[]): void;
}

export abstract class EngineConfig {}

export abstract class Engine implements IEngine {
	abstract execSQL(
		sqls: ISql | string | Array<ISql | string>,
		args?: Array<any>,
		opts?: ExecSqlOptions
	): Promise<any>;
	abstract withTransaction(fn: {(db: Engine): Promise<any>}): Promise<any>;
	abstract end(): Promise<any>;
	getTables(): Promise<Table[]> {
		throw new Error("Method not implemented.");
	}
	createTable(table: Table): string[] {
		throw new Error("Method not implemented.");
	}
	migration(newTable: Table, oldTable: Table): string[] {
		throw new Error("Method not implemented.");
	}
	//#region override 通过重载以下进行Engine定制
	quotes(key: string) {
		return key.replace(/(?<!["'\w])\w+(?!["'\w])/, (x) => `"${x}"`);
	}
	runSql(s: Sql): Promise<Paged<any>> {
		if (s instanceof SelectSql && s.isPage())
			return this.execSQL([s, s.clone().count()], [], {transaction: false}).then((rows) => {
				return {list: rows[0], total: rows[1]};
			});
		if (s instanceof InsertOrUpdate) {
			if (s.hasWhere())
				return this.withTransaction(function (db) {
					var select = s.selectSql();
					if (select)
						return db.execSQL(select).then((one) => {
							if (one) return db.execSQL(s.updateSql());
							return db.execSQL(s.insertSql());
						});
					return db.execSQL(s.insertSql()).catch((e) => db.execSQL(s.updateSql()));
				});
			return Promise.reject(
				new Error("can not insert or update with out where Engine=" + this.constructor.name)
			);
		}
		if (s instanceof InsertNotExist) {
			let s1 = s;
			return this.execSQL(s1.selectSql()).then((row) => {
				if (row) return s1.returnId() ? row.id : row;
				return this.execSQL(s1.insertSql());
			});
		}
		return this.execSQL(s);
	}
	//#endregion override 通过重载以上进行Engine定制
	protected log: Logger;
	constructor() {
		this.log = {info() {}, debug() {}, error() {}};
	}
	sqlval(v: any) {
		if (v == null) return "null";
		if (typeof v === "number") return v.toString();
		if (typeof v === "string") return `'${v.replace(/'/g, "''")}'`;
		if (v instanceof Raw) return v.toString();
		return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
	}
	setLogger(log?: Logger) {
		if (log) this.log = log;
		return this;
	}
	r(sql: string, args?: any) {
		return new Raw(sql, args);
	}
	where(key: string | {[key: string]: any}, value?: any) {
		return where(key, value);
	}
	select<T = any>(table: string, keys?: string | string[]) {
		return new SelectSql<T>(table, keys).engine(this);
	}
	insert(table: string, data: any) {
		return new InsertSql(table, data).engine(this);
	}
	update(table: string, data: any) {
		return new UpdateSql(table, data).engine(this);
	}
	delete(table: string) {
		return new DeleteSql(table).engine(this);
	}
	insertOrUpdate(table: string, data: any, keys?: string[]) {
		return new InsertOrUpdate(table, data, keys).engine(this);
	}
	insertNotExist(table: string, data: any) {
		return new InsertNotExist(table, data).engine(this);
	}
}

export abstract class ConnEngine extends Engine {
	abstract beginTransaction(): Promise<any>;
	abstract commit(): Promise<any>;
	abstract rollback(): Promise<any>;
	abstract queryAsync(sql: string, args?: Array<any>, opts?: ExecSqlOptions): Promise<any>;
	private SingleSQL(sql: string, args?: Array<any>, opts?: ExecSqlOptions): Promise<any> {
		if (opts.ignore) return this.queryAsync(sql, args, opts);
		var i = 0;
		var msg = sql.replace(/\?/g, function () {
			let s = args[i++];
			if (s == null) return "?";
			if (typeof s === "string") return `'${s.replace(/'/g, "\\'")}'`;
			return s;
		});
		return this.queryAsync(sql, args, opts).then(
			(rows) => {
				this.log.debug(msg);
				return rows;
			},
			(err) => {
				this.log.error(msg, err);
				return Promise.reject(err);
			}
		);
	}
	execSQL(
		sqls: ISql | string | Array<ISql | string>,
		args?: Array<any>,
		opts?: ExecSqlOptions
	): Promise<any> {
		let db = this;
		opts = opts || {};
		args = args || [];
		let ss = arr(sqls).filter((x) => x);
		for (let s of ss) {
			if (typeof s != "string" && !instanceOfSql(s))
				throw new Error("execSQL params must be string or ISql");
		}
		let autoTrans =
			opts.transaction == null ? sqls instanceof Array && sqls.length > 1 : opts.transaction;
		let pms: Promise<any> = Promise.resolve();
		if (autoTrans) pms = pms.then(() => db.beginTransaction());
		let out = [];
		for (let sql of ss) {
			pms = pms
				.then(() => {
					if (instanceOfSql(sql)) {
						let s = sql;
						opts.ignore = s.ignore_log;
						return db.SingleSQL(s.sql, s.args, opts).then((x) => (s.pack ? s.pack(x) : x));
					}
					return db.SingleSQL(sql, args, opts);
				})
				.then((x) => out.push(x));
		}
		if (autoTrans)
			pms = pms.then(
				() => db.commit(),
				(err) => db.rollback().then(() => Promise.reject(err))
			);
		pms = pms.then(() => (out.length > 1 ? out : out[0]));
		return pms;
	}
	withTransaction(fn: {(db: Engine): Promise<any>}) {
		let conn = this;
		return conn
			.beginTransaction()
			.then((_) => {
				return fn(conn);
			})
			.then(
				function (ret) {
					return conn.commit().then((_) => {
						return ret;
					});
				},
				function (err) {
					return conn.rollback().then((_) => {
						return Promise.reject(err);
					});
				}
			);
	}
}

export abstract class PoolEngine extends Engine {
	abstract newConn(): Promise<ConnEngine>;
	private withConn(fn: (conn: ConnEngine) => Promise<any>) {
		return this.newConn().then((conn) =>
			Promise.resolve(fn(conn)).then(
				(x) =>
					conn.end().then(
						() => x,
						() => x
					),
				(err) =>
					conn.end().then(
						() => Promise.reject(err),
						() => Promise.reject(err)
					)
			)
		);
	}
	execSQL(
		sqls: ISql | string | Array<ISql | string>,
		args?: Array<any>,
		opts?: ExecSqlOptions
	): Promise<any> {
		return this.withConn((conn) => {
			conn.setLogger(this.log);
			return conn.execSQL(sqls, args, opts);
		});
	}
	withTransaction(fn: {(db: Engine): Promise<any>}) {
		return this.withConn((conn) => {
			conn.setLogger(this.log);
			return conn.withTransaction(fn);
		});
	}
}
