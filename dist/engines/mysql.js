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
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var mysql_1 = require("mysql");
var universalify_1 = require("universalify");
var __1 = require("..");
function extendsConn(conn) {
    conn.beginTransaction = universalify_1.fromCallback(conn.beginTransaction);
    conn.commit = universalify_1.fromCallback(conn.commit);
    conn.rollback = universalify_1.fromCallback(conn.rollback);
    conn.queryAsync = function (sql, args) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.query(sql, args, function (err, rows) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rows);
                }
            });
        });
    };
}
function EngineOverride(Base) {
    return /** @class */ (function (_super) {
        __extends(class_1, _super);
        function class_1() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        class_1.prototype.quotes = function (key) {
            return key.replace(/(?<!["'\w])\w+(?!["'\w])/, function (x) { return "`" + x + "`"; });
        };
        class_1.prototype.runSql = function (s) {
            if (s instanceof __1.SelectSql && s.isPage()) {
                var sql = s.sql, args = s.args;
                sql = sql.replace("select ", "select sql_calc_found_rows ");
                return this.execSQL([{ sql: sql, args: args }, "select found_rows() as total"], [], { transaction: false }).then(function (rows) {
                    return { list: rows[0], total: rows[1][0].total };
                });
            }
            if (s instanceof __1.InsertSql && s.returnId()) {
                return this.execSQL({ sql: s.sql, args: s.args, pack: function (rows) { return rows.insertId; } });
            }
            if (s instanceof __1.InsertOrUpdate && !s.hasWhere()) {
                var insert = s.insertSql();
                var set = s.wrapSet();
                var sql = insert.sql + " on duplicate key update " + set.sql + ";";
                var args = insert.args.concat(set.args);
                return this.execSQL(sql, args);
            }
            return _super.prototype.runSql.call(this, s);
        };
        class_1.prototype.getTables = function (db) {
            var _this = this;
            var pms = db ? Promise.resolve([{ db: db }]) : this.execSQL("select database() db");
            return pms.then(function (rows) {
                var db = rows[0].db;
                var sqls = [
                    "select DEFAULT_CHARACTER_SET_NAME,DEFAULT_COLLATION_NAME from information_schema.schemata where SCHEMA_NAME=?",
                    "select TABLE_NAME,ENGINE,AUTO_INCREMENT,TABLE_COLLATION,TABLE_COMMENT from information_schema.tables where TABLE_SCHEMA=? and TABLE_TYPE='BASE TABLE' order by CREATE_TIME",
                    "select TABLE_NAME,COLUMN_NAME,COLUMN_DEFAULT,IS_NULLABLE,DATA_TYPE,CHARACTER_MAXIMUM_LENGTH,CHARACTER_OCTET_LENGTH,NUMERIC_PRECISION,NUMERIC_SCALE,DATETIME_PRECISION,CHARACTER_SET_NAME,COLLATION_NAME,COLUMN_TYPE,COLUMN_KEY,EXTRA,COLUMN_COMMENT from information_schema.columns where TABLE_SCHEMA=? order by TABLE_NAME,ORDINAL_POSITION",
                    {
                        sql: "select s.TABLE_NAME,s.INDEX_NAME,s.NON_UNIQUE,k.REFERENCED_TABLE_NAME,group_concat(s.COLUMN_NAME order by SEQ_IN_INDEX) COLUMN_NAME,group_concat(k.REFERENCED_COLUMN_NAME order by SEQ_IN_INDEX) REFERENCED_COLUMN_NAME from " +
                            "\t(select * from information_schema.statistics where TABLE_SCHEMA=?) as s " +
                            "left join " +
                            "\t(select * from information_schema.key_column_usage where TABLE_SCHEMA=?) as k " +
                            "on s.TABLE_SCHEMA=k.TABLE_SCHEMA and s.TABLE_NAME=k.TABLE_NAME and s.INDEX_NAME=k.CONSTRAINT_NAME and s.COLUMN_NAME=k.COLUMN_NAME " +
                            "GROUP BY s.TABLE_NAME,s.INDEX_NAME,s.NON_UNIQUE,k.REFERENCED_TABLE_NAME " +
                            "UNION " +
                            "select k.TABLE_NAME,k.CONSTRAINT_NAME,s.NON_UNIQUE,k.REFERENCED_TABLE_NAME,group_concat(k.COLUMN_NAME order by SEQ_IN_INDEX) COLUMN_NAME,group_concat(k.REFERENCED_COLUMN_NAME order by SEQ_IN_INDEX) REFERENCED_COLUMN_NAME from " +
                            "\t(select * from information_schema.statistics where TABLE_SCHEMA=?) as s " +
                            "right join " +
                            "\t(select * from information_schema.key_column_usage where TABLE_SCHEMA=?) as k " +
                            "on s.TABLE_SCHEMA=k.TABLE_SCHEMA and s.TABLE_NAME=k.TABLE_NAME and s.INDEX_NAME=k.CONSTRAINT_NAME and s.COLUMN_NAME=k.COLUMN_NAME " +
                            "GROUP BY k.TABLE_NAME,k.CONSTRAINT_NAME,s.NON_UNIQUE,k.REFERENCED_TABLE_NAME",
                        args: [db, db, db, db],
                    },
                ];
                var args = [db];
                return _this.execSQL(sqls, args, { transaction: false }).then(function (out) {
                    var schemata = out[0][0];
                    var tables = out[1];
                    var fields = out[2];
                    var constraints = out[3];
                    var tbs = new Map();
                    var list = [];
                    for (var _i = 0, tables_1 = tables; _i < tables_1.length; _i++) {
                        var row = tables_1[_i];
                        var tb = new __1.TableBuilder(row.TABLE_NAME);
                        if (row.TABLE_COLLATION != schemata.DEFAULT_COLLATION_NAME)
                            tb.charset(row.TABLE_COLLATION.split("_")[0]);
                        if (row.ENGINE != "InnoDB")
                            tb.mysql_engine(row.ENGINE);
                        tb.comment(row.TABLE_COMMENT);
                        tbs.set(row.TABLE_NAME, tb);
                        list.push(tb);
                    }
                    for (var _a = 0, fields_1 = fields; _a < fields_1.length; _a++) {
                        var row = fields_1[_a];
                        var tb = tbs.get(row.TABLE_NAME);
                        tb.addField({
                            name: row.COLUMN_NAME,
                            type: row.COLUMN_TYPE.replace("bigint(20)", "bigint").replace("int(10)", "int").replace("int(11)", "int"),
                            table: row.TABLE_NAME,
                            default: row.COLUMN_DEFAULT,
                            comment: row.COLUMN_COMMENT,
                            charset: row.CHARACTER_SET_NAME == schemata.DEFAULT_CHARACTER_SET_NAME ? null : row.CHARACTER_SET_NAME,
                            null: row.IS_NULLABLE == "YES",
                            inc: row.EXTRA.toLowerCase() == "auto_increment",
                        });
                    }
                    for (var _b = 0, constraints_1 = constraints; _b < constraints_1.length; _b++) {
                        var row = constraints_1[_b];
                        var tb = tbs.get(row.TABLE_NAME);
                        var c = tb
                            .constraint(row.REFERENCED_TABLE_NAME ? "FOREIGN" : row.INDEX_NAME == "PRIMARY" ? "PRIMARY" : row.NON_UNIQUE ? "" : "UNIQUE", row.COLUMN_NAME)
                            .name(row.INDEX_NAME);
                        if (row.REFERENCED_TABLE_NAME)
                            c.references(row.REFERENCED_TABLE_NAME, row.REFERENCED_COLUMN_NAME);
                    }
                    return list.map(function (x) { return x.build(); });
                });
            });
        };
        class_1.prototype.fieldSql = function (field) {
            var s = this.quotes(field.name) + " " + field.type;
            var canDef = !/text|json/.test(field.type);
            if (field.charset)
                s += " CHARACTER SET " + field.charset;
            if (!field.null)
                s += " NOT NULL";
            else if (canDef && field.default == null)
                s += " DEFAULT NULL";
            if (field.inc)
                s += " AUTO_INCREMENT";
            if (canDef && field.default != null)
                s += " DEFAULT " + this.sqlval(field.default);
            if (field.comment)
                s += " COMMENT '" + field.comment.replace(/'/g, "\\'") + "'";
            return s;
        };
        class_1.prototype.constraintSql = function (constraint) {
            var _this = this;
            var field = "(" + constraint.fields.map(function (x) { return _this.quotes(x); }) + ")";
            if (constraint.type === "PRIMARY")
                return "PRIMARY KEY " + field;
            var name = this.quotes(constraint.name);
            if (constraint.type === "UNIQUE")
                return "UNIQUE KEY " + name + " " + field;
            if (constraint.type === "FOREIGN")
                return "CONSTRAINT " + name + " FOREIGN KEY " + field + " REFERENCES " + this.quotes(constraint.ref_table) + " (" + constraint.ref_fields.map(function (x) { return _this.quotes(x); }) + ")";
            return "KEY " + name + " " + field;
        };
        class_1.prototype.createTable = function (table) {
            var _this = this;
            var tail = ")";
            if (table.mysql_engine)
                tail += " ENGINE=" + table.mysql_engine;
            if (table.inc)
                tail += " AUTO_INCREMENT=" + table.inc;
            if (table.charset)
                tail += " DEFAULT CHARACTER SET " + table.charset;
            if (table.comment)
                tail += " COMMENT=" + this.sqlval(table.comment);
            var primary = table.primary;
            if (primary) {
                for (var _i = 0, _a = primary.fields; _i < _a.length; _i++) {
                    var key = _a[_i];
                    table.fields[key].null = false;
                }
            }
            var sql = [
                "CREATE TABLE " + this.quotes(table.name) + " (",
                __spreadArrays(table.mapField(function (field) {
                    return "\t" + _this.fieldSql(field);
                }), table
                    .mapConstraint(function (constraint) {
                    return "\t" + _this.constraintSql(constraint);
                })
                    .sort()).join(",\n"),
                tail + ";",
            ];
            return [sql.join("\n")];
        };
        class_1.prototype.migration = function (newTable, oldTable) {
            var _this = this;
            var list = newTable.migrationFrom(oldTable, function (a, b) { return a.strictEqual(b) && (a.comment || "") == (b.comment || ""); });
            var table = oldTable.name;
            return list.map(function (f) {
                // 约束
                if ("type" in f) {
                    if (f.type == "create") {
                        if (f.data.type == "FOREIGN")
                            return "alter table " + _this.quotes(table) + " add constraint " + _this.quotes(f.data.name) + " foreign key (" + f.data.fields.map(function (x) {
                                return _this.quotes(x);
                            }) + ") references " + _this.quotes(f.data.ref_table) + " (" + f.data.ref_fields.map(function (x) { return _this.quotes(x); }) + ")";
                        return "create " + f.data.type + " index " + _this.quotes(f.data.name) + " on " + _this.quotes(table) + " (" + f.data.fields.map(function (x) { return _this.quotes(x); }) + ")";
                    }
                    return "alter table " + _this.quotes(table) + " drop index " + _this.quotes(f.data.name);
                }
                // 字段
                if (f.from && f.to)
                    return "alter table " + _this.quotes(table) + " change " + _this.quotes(f.from.name) + " " + _this.fieldSql(f.to) + " " + (f.after ? "after " + f.after : "first");
                if (f.to)
                    return "alter table " + _this.quotes(table) + " add column " + _this.fieldSql(f.to) + " " + (f.after ? "after " + f.after : "first");
                return "alter table " + _this.quotes(table) + " drop column " + f.from.name;
            });
        };
        return class_1;
    }(Base));
}
var MysqlConnEngine = EngineOverride(/** @class */ (function (_super) {
    __extends(MysqlConnEngine, _super);
    function MysqlConnEngine(conn) {
        var _this = _super.call(this) || this;
        if (!conn.queryAsync)
            extendsConn(conn.constructor.prototype);
        _this.conn = conn;
        return _this;
    }
    MysqlConnEngine.prototype.beginTransaction = function () {
        return this.conn.beginTransaction();
    };
    MysqlConnEngine.prototype.commit = function () {
        return this.conn.commit();
    };
    MysqlConnEngine.prototype.rollback = function () {
        return this.conn.rollback();
    };
    MysqlConnEngine.prototype.queryAsync = function (sql, args, opts) {
        return this.conn.queryAsync(sql, args, opts);
    };
    MysqlConnEngine.prototype.end = function () {
        this.conn.release();
        return Promise.resolve();
    };
    return MysqlConnEngine;
}(__1.ConnEngine)));
module.exports = EngineOverride(/** @class */ (function (_super) {
    __extends(MysqlPoolEngine, _super);
    function MysqlPoolEngine(config) {
        var _this = _super.call(this) || this;
        _this.pool = mysql_1.createPool(config);
        return _this;
    }
    MysqlPoolEngine.prototype.getConnEngine = function () {
        return MysqlConnEngine.prototype;
    };
    MysqlPoolEngine.prototype.newConn = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.pool.getConnection(function (err, conn) {
                if (err) {
                    _this.log.error("can't connect to DB: " + err.toString());
                    reject(err);
                }
                else {
                    resolve(new MysqlConnEngine(conn));
                }
            });
        });
    };
    MysqlPoolEngine.prototype.end = function () {
        var _this = this;
        return new Promise(function (resolve, reject) { return _this.pool.end(function (err) { return (err ? reject(err) : resolve()); }); });
    };
    return MysqlPoolEngine;
}(__1.PoolEngine)));
