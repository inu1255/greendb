"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PoolEngine = exports.ConnEngine = exports.Engine = exports.EngineConfig = exports.instanceOfSql = exports.InsertOrUpdate = exports.InsertNotExist = exports.DeleteSql = exports.UpdateSql = exports.SelectSql = exports.InsertSql = exports.Sql = exports.Where = exports.Raw = exports.arr = exports.val = void 0;
var mixins_1 = require("./mixins");
/**
 * 把v转换为mysql可以接收的参数，把对象转换成json字符串
 * @param {any} v 值
 * @returns {String}
 */
function val(v) {
    if (v === undefined)
        v = null;
    return v && typeof v === "object" ? JSON.stringify(v) : v;
}
exports.val = val;
/**
 * 如果args为undefined则返回 def||[]
 * 如果args是一个Array则返回自己
 * 如果不是则返回[args]
 * @param {any} args
 * @param {Array} [def] 默认值
 * @returns {Array}
 */
function arr(args, def) {
    if (args instanceof Array)
        return args;
    return args === undefined ? def || [] : [args];
}
exports.arr = arr;
function instanceOfCloneAble(o) {
    return o && typeof o["clone"] === "function";
}
var Raw = /** @class */ (function () {
    function Raw(sql, args) {
        this._sql = sql || "";
        this._args = arr(args);
    }
    Object.defineProperty(Raw.prototype, "sql", {
        get: function () {
            return this._sql;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Raw.prototype, "args", {
        get: function () {
            return this._args;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * 用args替换sql中的?并返回字符串
     * @returns {string}
     */
    Raw.prototype.toString = function () {
        var i = 0;
        var args = this.args;
        return this.sql.replace(/\?/g, function () {
            var s = args[i++];
            if (typeof s === "string")
                return "'" + s.replace(/'/g, "\\'") + "'";
            return s;
        });
    };
    Raw.prototype.load = function (b) {
        this._sql = b.sql;
        this._args = b.args;
    };
    Raw.prototype.clone = function () {
        var inst = {};
        // @ts-ignore
        inst.__proto__ = this.constructor.prototype;
        for (var k in this) {
            if (k[0] == "_") {
                var v = this[k];
                inst[k] = instanceOfCloneAble(v) ? v.clone() : v;
            }
        }
        return inst;
    };
    /**
     * 添加参数
     * @param b 参数
     */
    Raw.prototype.push = function (b) {
        this._sql += b.sql;
        this._args.push.apply(this._args, b.args);
        return this;
    };
    /**
     * @param b
     */
    Raw.prototype.concat = function (b) {
        return this.clone().push(b);
    };
    return Raw;
}());
exports.Raw = Raw;
/**
 * 用于构建sql的where语句
 */
var Where = /** @class */ (function (_super) {
    __extends(Where, _super);
    function Where() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Where.prototype.clone = function () {
        return new Where(this._sql, this._args);
    };
    Where.prototype.isEmpty = function () {
        return this._sql.length < 1;
    };
    Where.prototype.toWhere = function () {
        return this.isEmpty() ? "" : " where " + this.sql;
    };
    /**
     * 加括号，将foo=? and bar=?变成(foo=? and bar=?)
     * 之后调用and/or时，会变成(foo=? and bar=?) and/or baz=?
     */
    Where.prototype.build = function () {
        if (this._sql.length > 0) {
            this._sql = "(" + this.sql + ")";
        }
        return this;
    };
    /**
     * 使用op拼接两个where语句，wb会加括号
     * foo=? or bar=? 使用and拼接 baz=? or qux=? 变成 foo=? or bar=? and (baz=? or qux=?)
     * 可以先调用build再拼接 变成 (foo=? or bar=?) and (baz=? or qux=?)
     * @param {String} op and/or
     * @param {Where} wb 另一个where语句
     */
    Where.prototype.add = function (op, wb) {
        if (!wb.isEmpty()) {
            if (this._sql.length)
                this._sql += " " + op;
            this._sql += " " + wb.build().sql;
            this._args = this._args.concat(wb.args);
        }
        return this;
    };
    /**
     * 参见 where 和 this.concat
     * @param {Where|String|Array|Object} key
     * @param {String} op
     * @param {any} value
     */
    Where.prototype.and = function (key, value) {
        var wb = key instanceof Where ? key : where(key, value);
        return this.add("and", wb);
    };
    /**
     * 参见 where 和 this.concat
     * @param {Where|String|Array|Object} key
     * @param {String} op
     * @param {any} value
     */
    Where.prototype.or = function (key, value) {
        var wb = key instanceof Where ? key : where(key, value);
        return this.add("or", wb);
    };
    return Where;
}(Raw));
exports.Where = Where;
var Sql = /** @class */ (function (_super) {
    __extends(Sql, _super);
    function Sql(table) {
        var _this = _super.call(this) || this;
        _this.table(table);
        return _this;
    }
    Sql.prototype.quotes = function (key) {
        return this._e ? this._e.quotes(key) : key;
    };
    return Sql;
}(mixins_1.Runnable(mixins_1.Tablable(Raw))));
exports.Sql = Sql;
var SqlWhere = /** @class */ (function (_super) {
    __extends(SqlWhere, _super);
    function SqlWhere(table) {
        return _super.call(this, table) || this;
    }
    Object.defineProperty(SqlWhere.prototype, "sql", {
        get: function () {
            return "" + this._sql + this.quotes(this._table) + this._where.toWhere();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(SqlWhere.prototype, "args", {
        get: function () {
            return this._args.concat(this._where.args);
        },
        enumerable: false,
        configurable: true
    });
    return SqlWhere;
}(mixins_1.Wherable(Sql)));
var InsertSql = /** @class */ (function (_super) {
    __extends(InsertSql, _super);
    function InsertSql(table, data) {
        var _this = _super.call(this, table) || this;
        _this._args = [];
        _this._ignore = "";
        _this._data = data;
        return _this;
    }
    InsertSql.prototype.engine = function (e) {
        this.load(wrapInsert(this._data, function (x) { return e.quotes(x); }));
        return _super.prototype.engine.call(this, e);
    };
    Object.defineProperty(InsertSql.prototype, "sql", {
        get: function () {
            return "insert " + this._ignore + "into " + this.quotes(this._table) + " " + this._sql;
        },
        enumerable: false,
        configurable: true
    });
    InsertSql.prototype.pack = function (rows) {
        if (this._id)
            for (var k in rows) {
                if (/id/i.test(k))
                    return rows[k];
            }
        return rows;
    };
    InsertSql.prototype.id = function () {
        this._id = true;
        return this;
    };
    InsertSql.prototype.returnId = function () {
        return this._id;
    };
    InsertSql.prototype.ignore = function () {
        this._ignore = "ignore ";
        return this;
    };
    return InsertSql;
}(Sql));
exports.InsertSql = InsertSql;
var SelectSql = /** @class */ (function (_super) {
    __extends(SelectSql, _super);
    function SelectSql(table, keys) {
        var _this = _super.call(this, table) || this;
        if (!keys || !keys.length)
            _this._keys = ["*"];
        else if (typeof keys === "string")
            _this._keys = keys.split(",");
        else
            _this._keys = keys;
        _this._order = "";
        _this._limit = "";
        _this._page = false;
        return _this;
    }
    Object.defineProperty(SelectSql.prototype, "sql", {
        get: function () {
            return "select " + this._keys.join(",") + " from " + this.quotes(this._table) + this._where.toWhere() + this._order + this._limit;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * @param {String} [key]
     */
    SelectSql.prototype.count = function (key) {
        this._keys = ["count(" + (key || "*") + ") cnt"];
        this._first = true;
        this._count = true;
        this._order = "";
        this._limit = "";
        return this;
    };
    SelectSql.prototype.orderBy = function (key) {
        this._order = key ? " order by " + key : "";
        return this;
    };
    SelectSql.prototype.limit = function (offset, size) {
        offset = +offset;
        size = +size;
        if (size)
            this._limit = " limit " + offset + "," + size;
        else if (offset)
            this._limit = " limit " + offset;
        else
            this._limit = " limit 1";
        return this;
    };
    SelectSql.prototype.first = function () {
        if (!this._limit)
            this._limit = " limit 1";
        this._first = true;
        return this;
    };
    SelectSql.prototype.page = function () {
        this._page = true;
        return this;
    };
    SelectSql.prototype.isPage = function () {
        return this._page;
    };
    SelectSql.prototype.pack = function (rows) {
        var keys = this._exclude;
        if (keys && keys.length) {
            for (var _i = 0, rows_1 = rows; _i < rows_1.length; _i++) {
                var row = rows_1[_i];
                for (var _a = 0, keys_1 = keys; _a < keys_1.length; _a++) {
                    var key = keys_1[_a];
                    delete row[key];
                }
            }
        }
        if (this._first) {
            if (this._count)
                return +rows[0].cnt;
            return rows[0];
        }
        return rows;
    };
    SelectSql.prototype.exclude = function (keys) {
        this._exclude = keys;
        return this;
    };
    return SelectSql;
}(SqlWhere));
exports.SelectSql = SelectSql;
var UpdateSql = /** @class */ (function (_super) {
    __extends(UpdateSql, _super);
    function UpdateSql(table, data) {
        var _this = _super.call(this, table) || this;
        _this._data = data;
        return _this;
    }
    UpdateSql.prototype.engine = function (e) {
        this.load(wrapSet(this._data, function (x) { return e.quotes(x); }));
        return _super.prototype.engine.call(this, e);
    };
    Object.defineProperty(UpdateSql.prototype, "sql", {
        get: function () {
            return "update " + this.quotes(this._table) + " set " + this._sql + this._where.toWhere();
        },
        enumerable: false,
        configurable: true
    });
    UpdateSql.prototype.run = function () {
        if (this._where.isEmpty())
            return Promise.reject("\u7981\u6B62update\u4E0D\u5E26where\u8BED\u53E5: " + this.sql);
        return _super.prototype.run.call(this);
    };
    return UpdateSql;
}(SqlWhere));
exports.UpdateSql = UpdateSql;
var DeleteSql = /** @class */ (function (_super) {
    __extends(DeleteSql, _super);
    function DeleteSql(table) {
        var _this = _super.call(this, table) || this;
        _this._sql = "delete from ";
        return _this;
    }
    DeleteSql.prototype.run = function () {
        if (this._where.isEmpty())
            return Promise.reject("\u7981\u6B62delete\u4E0D\u5E26where\u8BED\u53E5: " + this.sql);
        return _super.prototype.run.call(this);
    };
    return DeleteSql;
}(SqlWhere));
exports.DeleteSql = DeleteSql;
var InsertNotExist = /** @class */ (function (_super) {
    __extends(InsertNotExist, _super);
    function InsertNotExist(table, data) {
        var _this = _super.call(this) || this;
        _this.table(table);
        _this._data = data;
        return _this;
    }
    InsertNotExist.prototype.selectSql = function () {
        return new SelectSql(this._table)
            .engine(this._e)
            .where(this._where.isEmpty() ? where(this._data) : this._where)
            .first();
    };
    InsertNotExist.prototype.insertSql = function () {
        var s = new InsertSql(this._table, this._data).engine(this._e);
        if (this._id)
            s.id();
        return s;
    };
    InsertNotExist.prototype.id = function () {
        this._id = true;
        return this;
    };
    InsertNotExist.prototype.returnId = function () {
        return this._id;
    };
    return InsertNotExist;
}(mixins_1.Wherable(mixins_1.Tablable(mixins_1.Runnable(mixins_1.Base)))));
exports.InsertNotExist = InsertNotExist;
var InsertOrUpdate = /** @class */ (function (_super) {
    __extends(InsertOrUpdate, _super);
    function InsertOrUpdate(table, data, keys) {
        var _this = _super.call(this) || this;
        _this.table(table);
        _this._insertData = data;
        keys = keys instanceof Array ? keys : Object.keys(data);
        var item = {};
        for (var _i = 0, keys_2 = keys; _i < keys_2.length; _i++) {
            var k = keys_2[_i];
            item[k] = _this._insertData[k];
        }
        _this._updateData = item;
        _this._insert = new InsertSql(_this._table, _this._insertData);
        return _this;
    }
    InsertOrUpdate.prototype.get = function (k) {
        return this._insertData[k];
    };
    InsertOrUpdate.prototype.insertSql = function () {
        return this._insert.engine(this._e);
    };
    InsertOrUpdate.prototype.updateSql = function () {
        return new UpdateSql(this._table, this._updateData).where(this._where).engine(this._e);
    };
    InsertOrUpdate.prototype.selectSql = function () {
        if (this._where.isEmpty())
            return;
        return new SelectSql(this._table).where(this._where).first().engine(this._e);
    };
    InsertOrUpdate.prototype.wrapSet = function () {
        var _this = this;
        return wrapSet(this._updateData, function (x) { return _this._e.quotes(x); });
    };
    InsertOrUpdate.prototype.hasWhere = function () {
        return !this._where.isEmpty();
    };
    InsertOrUpdate.prototype.id = function () {
        return this._insert.id();
    };
    return InsertOrUpdate;
}(mixins_1.Wherable(mixins_1.Tablable(mixins_1.Runnable(mixins_1.Base)))));
exports.InsertOrUpdate = InsertOrUpdate;
/**
 * 生成set 字符串,如：
 * id=?,name=?
 * @param data
 */
function wrapSet(data, quotes) {
    if (data instanceof Raw)
        return data;
    var keys = [];
    var args = [];
    for (var k in data) {
        var v = data[k];
        if (v === undefined)
            continue;
        if (v instanceof Raw) {
            keys.push(quotes(k) + "=(" + v.sql + ")");
            args.push.apply(args, v.args);
        }
        else {
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
function warpValues(data, keys) {
    var values = [];
    var args = [];
    if (!keys) {
        for (var k in data) {
            var v = data[k];
            if (v === undefined)
                continue;
            if (v instanceof Raw) {
                values.push(v.sql);
                args.push.apply(args, v.args);
            }
            else {
                values.push("?");
                args.push(val(v));
            }
        }
    }
    else if (keys.length) {
        for (var _i = 0, keys_3 = keys; _i < keys_3.length; _i++) {
            var k = keys_3[_i];
            var v = data[k];
            if (v instanceof Raw) {
                values.push(v.sql);
                args.push.apply(args, v.args);
            }
            else {
                values.push("?");
                args.push(val(v));
            }
        }
    }
    else {
        for (var k in data) {
            var v = data[k];
            if (v === undefined)
                continue;
            keys.push(k);
            if (v instanceof Raw) {
                values.push(v.sql);
                args.push.apply(args, v.args);
            }
            else {
                values.push("?");
                args.push(val(v));
            }
        }
    }
    return new Raw("(" + values.join(",") + ")", args);
}
/**
 * 生成insert 语句,如：
 * (id,name) values(?,?),(?,?)
 * @param data
 */
function wrapInsert(data, quotes) {
    data = arr(data);
    if (data.length > 0) {
        var keys = [];
        var raw = warpValues(data[0], keys);
        var dst = new Raw("(" + keys.map(quotes).join(",") + ") values" + raw.sql, raw.args);
        for (var i = 1; i < data.length; i++) {
            var item = data[i];
            raw = warpValues(item, keys);
            dst.push({ sql: "," + raw.sql, args: raw.args });
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
            return new Where(key + "=(" + value.sql + ")", value.args);
        if (value === null)
            return new Where(key + " is null");
        if (value == null)
            return new Where(key);
        return new Where(key + "=?", value);
    }
    var wb = new Where();
    for (var k in key) {
        var v = key[k];
        if (v !== undefined)
            wb.and(k, v);
    }
    return wb;
}
function instanceOfSql(sql) {
    return sql && typeof sql.sql === "string" && sql.args instanceof Array;
}
exports.instanceOfSql = instanceOfSql;
var EngineConfig = /** @class */ (function () {
    function EngineConfig() {
    }
    return EngineConfig;
}());
exports.EngineConfig = EngineConfig;
var Engine = /** @class */ (function () {
    function Engine() {
        this.log = { info: function () { }, debug: function () { }, error: function () { } };
    }
    Engine.prototype.getTables = function () {
        throw new Error("Method not implemented.");
    };
    Engine.prototype.createTable = function (table) {
        throw new Error("Method not implemented.");
    };
    Engine.prototype.migration = function (newTable, oldTable) {
        throw new Error("Method not implemented.");
    };
    //#region override 通过重载以下进行Engine定制
    Engine.prototype.quotes = function (key) {
        return key.replace(/(?<!["'\w])\w+(?!["'\w])/, function (x) { return "\"" + x + "\""; });
    };
    Engine.prototype.runSql = function (s) {
        var _this = this;
        if (s instanceof SelectSql && s.isPage())
            return this.execSQL([s, s.clone().count()], [], {
                transaction: false,
                ignore: s.ignore_log,
            }).then(function (rows) {
                return { list: rows[0], total: rows[1] };
            });
        if (s instanceof InsertOrUpdate) {
            if (s.hasWhere())
                return this.withTransaction(function (db) {
                    var select = s.selectSql();
                    if (select)
                        return db.execSQL(select, null, { ignore: s.ignore_log }).then(function (one) {
                            if (one)
                                return db.execSQL(s.updateSql(), null, { ignore: s.ignore_log });
                            return db.execSQL(s.insertSql(), null, { ignore: s.ignore_log });
                        });
                    return db
                        .execSQL(s.insertSql(), null, { ignore: s.ignore_log })
                        .catch(function (e) { return db.execSQL(s.updateSql(), null, { ignore: s.ignore_log }); });
                });
            return Promise.reject(new Error("can not insert or update with out where Engine=" + this.constructor.name));
        }
        if (s instanceof InsertNotExist) {
            var s1_1 = s;
            return this.execSQL(s1_1.selectSql()).then(function (row) {
                if (row)
                    return s1_1.returnId() ? row.id : row;
                return _this.execSQL(s1_1.insertSql());
            });
        }
        return this.execSQL(s);
    };
    Engine.prototype.sqlval = function (v) {
        if (v == null)
            return "null";
        if (typeof v === "number")
            return v.toString();
        if (typeof v === "string")
            return "'" + v.replace(/'/g, "''") + "'";
        if (v instanceof Raw)
            return v.toString();
        return "'" + JSON.stringify(v).replace(/'/g, "''") + "'";
    };
    Engine.prototype.setLogger = function (log) {
        if (log)
            this.log = log;
        return this;
    };
    Engine.prototype.r = function (sql, args) {
        return new Raw(sql, args);
    };
    Engine.prototype.where = function (key, value) {
        return where(key, value);
    };
    Engine.prototype.select = function (table, keys) {
        return new SelectSql(table, keys).engine(this);
    };
    Engine.prototype.insert = function (table, data) {
        return new InsertSql(table, data).engine(this);
    };
    Engine.prototype.update = function (table, data) {
        return new UpdateSql(table, data).engine(this);
    };
    Engine.prototype.delete = function (table) {
        return new DeleteSql(table).engine(this);
    };
    Engine.prototype.insertOrUpdate = function (table, data, keys) {
        return new InsertOrUpdate(table, data, keys).engine(this);
    };
    Engine.prototype.insertNotExist = function (table, data) {
        return new InsertNotExist(table, data).engine(this);
    };
    return Engine;
}());
exports.Engine = Engine;
var ConnEngine = /** @class */ (function (_super) {
    __extends(ConnEngine, _super);
    function ConnEngine() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ConnEngine.prototype.SingleSQL = function (sql, args, opts) {
        var _this = this;
        if (opts.ignore)
            return this.queryAsync(sql, args, opts);
        var i = 0;
        var msg = sql.replace(/\?/g, function () {
            var s = args[i++];
            if (s == null)
                return "?";
            if (typeof s === "string")
                return "'" + s.replace(/'/g, "\\'") + "'";
            return s;
        });
        return this.queryAsync(sql, args, opts).then(function (rows) {
            _this.log.debug(msg);
            return rows;
        }, function (err) {
            _this.log.error(msg, err);
            return Promise.reject(err);
        });
    };
    ConnEngine.prototype.execSQL = function (sqls, args, opts) {
        var db = this;
        opts = opts || {};
        args = args || [];
        var ss = arr(sqls).filter(function (x) { return x; });
        for (var _i = 0, ss_1 = ss; _i < ss_1.length; _i++) {
            var s = ss_1[_i];
            if (typeof s != "string" && !instanceOfSql(s))
                throw new Error("execSQL params must be string or ISql");
        }
        var autoTrans = opts.transaction == null ? sqls instanceof Array && sqls.length > 1 : opts.transaction;
        var pms = Promise.resolve();
        if (autoTrans)
            pms = pms.then(function () { return db.beginTransaction(); });
        var out = [];
        var _loop_1 = function (sql) {
            pms = pms
                .then(function () {
                if (instanceOfSql(sql)) {
                    var s_1 = sql;
                    opts.ignore = s_1.ignore_log;
                    return db.SingleSQL(s_1.sql, s_1.args, opts).then(function (x) { return (s_1.pack ? s_1.pack(x) : x); });
                }
                return db.SingleSQL(sql, args, opts);
            })
                .then(function (x) { return out.push(x); });
        };
        for (var _a = 0, ss_2 = ss; _a < ss_2.length; _a++) {
            var sql = ss_2[_a];
            _loop_1(sql);
        }
        if (autoTrans)
            pms = pms.then(function () { return db.commit(); }, function (err) { return db.rollback().then(function () { return Promise.reject(err); }); });
        pms = pms.then(function () { return (out.length > 1 ? out : out[0]); });
        return pms;
    };
    ConnEngine.prototype.withTransaction = function (fn) {
        var conn = this;
        return conn
            .beginTransaction()
            .then(function (_) {
            return fn(conn);
        })
            .then(function (ret) {
            return conn.commit().then(function (_) {
                return ret;
            });
        }, function (err) {
            return conn.rollback().then(function (_) {
                return Promise.reject(err);
            });
        });
    };
    return ConnEngine;
}(Engine));
exports.ConnEngine = ConnEngine;
var PoolEngine = /** @class */ (function (_super) {
    __extends(PoolEngine, _super);
    function PoolEngine() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    PoolEngine.prototype.withConn = function (fn) {
        return this.newConn().then(function (conn) {
            return Promise.resolve(fn(conn)).then(function (x) {
                return conn.end().then(function () { return x; }, function () { return x; });
            }, function (err) {
                return conn.end().then(function () { return Promise.reject(err); }, function () { return Promise.reject(err); });
            });
        });
    };
    PoolEngine.prototype.execSQL = function (sqls, args, opts) {
        var _this = this;
        return this.withConn(function (conn) {
            conn.setLogger(_this.log);
            return conn.execSQL(sqls, args, opts);
        });
    };
    PoolEngine.prototype.withTransaction = function (fn) {
        var _this = this;
        return this.withConn(function (conn) {
            conn.setLogger(_this.log);
            return conn.withTransaction(fn);
        });
    };
    return PoolEngine;
}(Engine));
exports.PoolEngine = PoolEngine;
