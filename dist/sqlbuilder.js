"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
function instanceOfCloneAble(o) {
    return o && typeof o["clone"] === "function";
}
class Raw {
    constructor(sql, args) {
        this._sql = sql || "";
        this._args = utils_1.arr(args);
    }
    get sql() {
        return this._sql;
    }
    get args() {
        return this._args;
    }
    /**
     * 将用args替换sql中的?并返回字符串
     * @returns {string}
     */
    toString() {
        let i = 0;
        let args = this.args;
        return this.sql.replace(/\?/g, function () {
            let s = args[i++];
            if (typeof s === "string")
                return `'${s.replace(/'/g, "\\'")}'`;
            return s;
        });
    }
    load(b) {
        this._sql = b.sql;
        this._args = b.args;
    }
    clone() {
        let inst = new this.constructor();
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
    push(b) {
        this._sql += b.sql;
        this._args.push.apply(this._args, b.args);
        return this;
    }
    /**
     * @param b
     */
    concat(b) {
        return this.clone().push(b);
    }
}
exports.Raw = Raw;
/**
 * 用于构建sql的where语句
 */
class Where extends Raw {
    clone() {
        return new Where(this._sql, this._args);
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
    add(op, wb) {
        if (!wb.isEmpty()) {
            if (this._sql.length)
                this._sql += " " + op;
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
    and(key, value) {
        let wb = key instanceof Where ? key : where(key, value);
        return this.add("and", wb);
    }
    /**
     * 参见 where 和 this.concat
     * @param {Where|String|Array|Object} key
     * @param {String} op
     * @param {any} value
     */
    or(key, value) {
        let wb = key instanceof Where ? key : where(key, value);
        return this.add("or", wb);
    }
}
exports.Where = Where;
class Sql extends Raw {
    constructor(table) {
        super();
        this._table = table;
    }
    engine(e) {
        this._e = e;
        return this;
    }
    pms() {
        return this._e.SingleSQL(this);
    }
    $pms() {
        if (this.$$pms)
            return this.$$pms;
        return (this.$$pms = this.pms());
    }
    then(onfulfilled, onrejected) {
        return this.$pms().then(onfulfilled, onrejected);
    }
    catch(onrejected) {
        return this.$pms().catch(onrejected);
    }
    finally(onfinally) {
        return this.$pms().finally(onfinally);
    }
    table(table) {
        this._table = table;
        return this;
    }
}
class SqlWhere extends Sql {
    constructor(table) {
        super(table);
        this._where = new Where();
    }
    get sql() {
        return `${this._sql}${this._table}${this._where.toWhere()}`;
    }
    get args() {
        return this._args.concat(this._where.args);
    }
    where(key, value) {
        this._where.and(key, value);
        return this;
    }
    orWhere(key, value) {
        this._where.or(key, value);
        return this;
    }
    build() {
        this._where.build();
        return this;
    }
}
class InsertSql extends Sql {
    constructor(table, data) {
        super(table);
        this._args = [];
        this._ignore = "";
        this.load(wrapInsert(data));
    }
    get sql() {
        return `insert ${this._ignore}into ${this._table} ${this._sql}`;
    }
    pms() {
        return this._e.SingleSQL(this).then(rows => (this._id ? rows.insertId : rows));
    }
    id() {
        this._id = true;
        return this;
    }
    ignore() {
        this._ignore = "ignore ";
        return this;
    }
}
exports.InsertSql = InsertSql;
class SelectSql extends SqlWhere {
    constructor(table, keys) {
        super(table);
        if (!keys || !keys.length)
            this._keys = ["*"];
        else if (typeof keys === "string")
            this._keys = keys.split(",");
        else
            this._keys = keys;
        this._order = "";
        this._limit = "";
        this._page = false;
    }
    get sql() {
        return `select ${this._page ? "sql_calc_found_rows " : ""}${this._keys.join(",")} from ${this._table}${this._where.toWhere()}${this._order}${this._limit}`;
    }
    /**
     * @param {String} [key]
     */
    count(key) {
        this._keys = [`count(${key || "*"}) cnt`];
        this._first = true;
        this._count = true;
        return this;
    }
    orderBy(key) {
        this._order = key ? ` order by ${key}` : "";
        return this;
    }
    limit(offset, size) {
        offset = +offset;
        size = +size;
        if (size)
            this._limit = ` limit ${offset},${size}`;
        else if (offset)
            this._limit = ` limit ${offset}`;
        else
            this._limit = " limit 1";
        return this;
    }
    first() {
        if (!this._limit)
            this._limit = " limit 1";
        this._first = true;
        return this;
    }
    page() {
        this._page = true;
        return this;
    }
    pms() {
        if (this._page) {
            return this._e.execSQL([this, "select found_rows() as total"], [], { transaction: false }).then(rows => {
                return { list: rows[0], total: rows[1][0].total };
            });
        }
        return this._e.SingleSQL(this).then(rows => {
            if (this._first && rows instanceof Array) {
                if (this._count)
                    return rows[0].cnt;
                return rows[0];
            }
            return rows;
        });
    }
    exclude(keys) {
        if (keys.length) {
            return this.then(function (rows) {
                if (rows instanceof Array) {
                    for (let row of rows) {
                        for (let key of keys) {
                            delete row[key];
                        }
                    }
                }
                else if (typeof rows === "object") {
                    for (let key of keys) {
                        delete rows[key];
                    }
                }
                return rows;
            });
        }
        return this;
    }
}
exports.SelectSql = SelectSql;
class UpdateSql extends SqlWhere {
    constructor(table, data) {
        super(table);
        this.load(wrapSet(data));
    }
    get sql() {
        return `update ${this._table} set ${this._sql}${this._where.toWhere()}`;
    }
    pms() {
        if (this._where.isEmpty())
            return Promise.reject(`禁止update不带where语句: ${this.sql}`);
        return super.pms();
    }
}
exports.UpdateSql = UpdateSql;
class DeleteSql extends SqlWhere {
    constructor(table) {
        super(table);
        this._sql = "delete from ";
    }
    pms() {
        if (this._where.isEmpty())
            return Promise.reject(`禁止delete不带where语句: ${this.sql}`);
        return super.pms();
    }
}
exports.DeleteSql = DeleteSql;
class InsertNotExist extends SqlWhere {
    constructor(table, data) {
        super(table);
        this._data = data;
        this._keys = [];
        this.load(warpValues(data, this._keys));
    }
    get sql() {
        return `insert into ${this._table} (${this._keys}) (select ${this._sql} from dual where not exists (select * from ${this._table} ${this._where.toWhere()} limit 1))`;
    }
    pms() {
        if (this._where.isEmpty())
            this.where(this._data);
        return new SelectSql(this._table)
            .engine(this._e)
            .where(this._where)
            .first()
            .then(row => {
            if (row)
                return this._id ? row.id : row;
            let hander = new InsertSql(this._table, this._data).engine(this._e);
            if (this._id)
                hander.id();
            return hander;
        });
    }
    id() {
        this._id = true;
        return this;
    }
}
exports.InsertNotExist = InsertNotExist;
class InsertOrUpdate extends SqlWhere {
    constructor(table, data, keys) {
        super(table);
        this._data = data;
        this._keys = keys instanceof Array ? keys : Object.keys(data);
        this._insert = new InsertSql(table, data);
        let item = {};
        for (let k of this._keys) {
            item[k] = this._data[k];
        }
        this.load(wrapSet(item));
    }
    id() {
        this._id = true;
        return this;
    }
    pms() {
        if (this._where.isEmpty())
            return super.pms();
        return new SelectSql(this._table)
            .engine(this._e)
            .where(this._where)
            .first()
            .then(row => {
            if (row)
                return new UpdateSql(this._table, this._data).engine(this._e).where(this._where);
            if (this._id)
                this._insert.id();
            return this._insert.engine(this._e);
        });
    }
    toString() {
        if (this._where.isEmpty())
            return `${this._insert} on duplicate key update ${super.toString()};`;
        let select = new SelectSql(this._table).where(this._where).first();
        let update = new UpdateSql(this._table, this._data).where(this._where);
        return `if(${select}) { ${update} } else { ${this._insert} }`;
    }
    get sql() {
        if (this._where.isEmpty())
            return `${this._insert.sql} on duplicate key update ${this._sql};`;
        let select = new SelectSql(this._table).where(this._where).first();
        let update = new UpdateSql(this._table, this._data).where(this._where);
        return `if(${select.sql}) { ${update.sql} } else { ${this._insert.sql} }`;
    }
    get args() {
        if (this._where.isEmpty())
            return this._insert.args.concat(this._args);
        return this._where.args.concat(this._args, this._where.args, this._insert.args);
    }
}
exports.InsertOrUpdate = InsertOrUpdate;
/**
 * 生成set 字符串,如：
 * id=?,name=?
 * @param data
 */
function wrapSet(data) {
    if (data instanceof Raw)
        return data;
    let keys = [];
    let args = [];
    for (let k in data) {
        let v = data[k];
        if (v === undefined)
            continue;
        if (v instanceof Raw) {
            keys.push(k + "=(" + v.sql + ")");
            args.push.apply(args, v.args);
        }
        else {
            keys.push(k + "=?");
            args.push(utils_1.val(v));
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
function warpValues(data, keys) {
    let values = [];
    let args = [];
    if (!keys) {
        for (let k in data) {
            let v = data[k];
            if (v === undefined)
                continue;
            if (v instanceof Raw) {
                values.push(v.sql);
                args.push.apply(args, v.args);
            }
            else {
                values.push("?");
                args.push(utils_1.val(v));
            }
        }
    }
    else if (keys.length) {
        for (let k of keys) {
            let v = data[k];
            if (v instanceof Raw) {
                values.push(v.sql);
                args.push.apply(args, v.args);
            }
            else {
                values.push("?");
                args.push(utils_1.val(v));
            }
        }
    }
    else {
        for (let k in data) {
            let v = data[k];
            if (v === undefined)
                continue;
            keys.push(k);
            if (v instanceof Raw) {
                values.push(v.sql);
                args.push.apply(args, v.args);
            }
            else {
                values.push("?");
                args.push(utils_1.val(v));
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
function wrapInsert(data) {
    data = utils_1.arr(data);
    if (data.length > 0) {
        let keys = [];
        let raw = warpValues(data[0], keys);
        let dst = new Raw(`(${keys.join(",")}) values${raw.sql}`, raw.args);
        for (let i = 1; i < data.length; i++) {
            let item = data[i];
            raw = warpValues(item, keys);
            dst.push({ sql: `,${raw.sql}`, args: raw.args });
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
function where(key, value) {
    if (typeof key === "string") {
        if (/\?/.test(key))
            return new Where(key, value);
        if (value instanceof Raw)
            return new Where(`${key}=(${value.sql})`, value.args);
        if (value === null)
            return new Where(`${key} is null`);
        if (value == null)
            return new Where(key);
        return new Where(key + "=?", value);
    }
    let wb = new Where();
    for (let k in key) {
        let v = key[k];
        if (v !== undefined)
            wb.and(k, v);
    }
    return wb;
}
function instanceOfSql(sql) {
    return sql instanceof Raw;
}
exports.instanceOfSql = instanceOfSql;
function createBuilder(e) {
    return Object.assign(e, {
        r(sql, args) {
            return new Raw(sql, args);
        },
        where,
        select(table, keys) {
            return new SelectSql(table, keys).engine(e);
        },
        insert(table, data) {
            return new InsertSql(table, data).engine(e);
        },
        update(table, data) {
            return new UpdateSql(table, data).engine(e);
        },
        delete(table) {
            return new DeleteSql(table).engine(e);
        },
        insertOrUpdate(table, data, keys) {
            return new InsertOrUpdate(table, data, keys).engine(e);
        },
        insertNotExist(table, data) {
            return new InsertNotExist(table, data).engine(e);
        }
    });
}
exports.createBuilder = createBuilder;
