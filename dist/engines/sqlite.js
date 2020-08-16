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
var sqlite3_1 = require("sqlite3");
var __1 = require("..");
function EngineOverride(Base) {
    return /** @class */ (function (_super) {
        __extends(class_1, _super);
        function class_1() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        class_1.prototype.quotes = function (key) {
            return key.replace(/(?<!["'[\w])\w+(?!["'\]\w])/g, function (x) { return "[" + x + "]"; });
        };
        class_1.prototype.runSql = function (s) {
            var _this = this;
            if (s instanceof __1.InsertSql && s.returnId()) {
                return this.execSQL({ sql: s.sql, args: s.args, pack: function (rows) { return rows.lastID; } });
            }
            if (s instanceof __1.InsertOrUpdate && !s.hasWhere()) {
                var insert = s.insertSql();
                return this.execSQL(insert, [], { ignore: true }).catch(function (err) {
                    if (err.code == "SQLITE_CONSTRAINT") {
                        var u_1 = s.updateSql();
                        err.message.replace(/\w+\.(\w+)/g, function (x0, x1) {
                            u_1.where(x1, s.get(x1));
                        });
                        return _this.execSQL(u_1);
                    }
                    return Promise.reject(err);
                });
            }
            return _super.prototype.runSql.call(this, s);
        };
        class_1.prototype.parse = function (sql) {
            return new Promise(function (resolve, reject) {
                var parser = require("sqlite-parser");
                parser(sql, function (err, ast) {
                    err ? reject(err) : resolve(ast);
                });
            }).then(function (ast) {
                var create = ast.statement[0];
                var sb = new __1.TableBuilder(create.name.name);
                for (var _i = 0, _a = create.definition; _i < _a.length; _i++) {
                    var row = _a[_i];
                    if (row.variant == "column") {
                        var nil = true;
                        var inc = false;
                        var def = null;
                        for (var _b = 0, _c = row.definition; _b < _c.length; _b++) {
                            var d_1 = _c[_b];
                            if (d_1.variant == "default") {
                                if (d_1.value.variant != "null")
                                    def = d_1.value.value;
                            }
                            else if (d_1.variant == "not null")
                                nil = false;
                            else if (d_1.variant == "primary key") {
                                sb.constraint("PRIMARY", row.name).type("PRIMARY");
                                if (d_1.autoIncrement)
                                    inc = true;
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
                    }
                    else if (row.variant == "constraint") {
                        var c = sb
                            .constraint("", row.columns.map(function (x) { return x.name; }))
                            .name(row.name);
                        var d = row.definition[0];
                        if (d.variant == "foreign key") {
                            c.type("FOREIGN");
                            c.references(d.references.name, d.references.columns.map(function (x) { return x.name; }));
                        }
                        else if (d.variant == "unique")
                            c.type("UNIQUE");
                    }
                }
                return sb.build();
            });
        };
        class_1.prototype.getTables = function () {
            var _this = this;
            return this.execSQL("select name,sql from sqlite_master where type=\"table\" and name!='sqlite_sequence'").then(function (rows) {
                return Promise.all(rows.map(function (row) { return _this.parse(row.sql); }));
            });
        };
        class_1.prototype.fieldSql = function (field) {
            var s = this.quotes(field.name) +
                " " +
                field.type
                    .replace("bigint", "real")
                    .replace("int", "integer")
                    .replace(" unsigned", "")
                    .replace(/varchar\(\d+\)/, "varchar");
            var canDef = !/text|json/.test(field.type);
            if (!field.null)
                s += " NOT NULL";
            else if (canDef && field.default == null)
                s += " DEFAULT NULL";
            if (canDef && field.default != null)
                s += " DEFAULT " + this.sqlval(field.default);
            return s;
        };
        class_1.prototype.createTable = function (table) {
            var _this = this;
            var tail = ")";
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
                    var s = _this.fieldSql(field);
                    if (table.primary && field.name == table.primary.fields[0]) {
                        s += " PRIMARY KEY";
                        if (field.inc)
                            s += " AUTOINCREMENT";
                    }
                    return "\t" + s;
                }), table
                    .mapConstraint(function (constraint) {
                    var field = "(" + constraint.fields.map(function (x) { return _this.quotes(x); }) + ")";
                    if (constraint.type === "PRIMARY")
                        return "";
                    var name = _this.quotes(constraint.name);
                    if (constraint.type === "UNIQUE")
                        return "UNIQUE " + field;
                    if (constraint.type === "FOREIGN")
                        return "CONSTRAINT " + name + " FOREIGN KEY " + field + " REFERENCES " + _this.quotes(constraint.ref_table) + " (" + constraint.ref_fields.map(function (x) {
                            return _this.quotes(x);
                        }) + ")";
                    return "";
                })
                    .filter(function (x) { return x; })
                    .map(function (x) { return "\t" + x; })).join(",\n"),
                tail + ";",
            ];
            return [sql.join("\n")];
        };
        class_1.prototype.migration = function (newTable, oldTable) {
            var toFields = Object.values(newTable.fields);
            var fromFields = Object.values(oldTable.fields);
            var ss = [];
            for (var _i = 0, toFields_1 = toFields; _i < toFields_1.length; _i++) {
                var f1 = toFields_1[_i];
                var f0 = void 0, flike = void 0;
                for (var i = 0; i < fromFields.length; i++) {
                    var f = fromFields[i];
                    if (f1.equal(f)) {
                        f0 = f;
                        break;
                    }
                    if (!flike && f.type == f1.type && f.default == f1.default) {
                        flike = f;
                    }
                }
                if (!f0)
                    f0 = flike;
                if (f0) {
                    fromFields.splice(fromFields.indexOf(f0), 1);
                    ss.push(this.quotes(f0.name));
                }
                else {
                    // 多了个字段
                    ss.push(this.sqlval(f1.default));
                }
            }
            var table = oldTable.name;
            var tmp = "__tmp__" + table;
            return __spreadArrays([
                "create table " + this.quotes(tmp) + " as select * from " + this.quotes(table),
                "drop table " + this.quotes(table)
            ], this.createTable(newTable), [
                "insert into " + this.quotes(newTable.name) + " select " + ss.join() + " from " + this.quotes(tmp),
                "drop table " + this.quotes(tmp),
            ]);
        };
        return class_1;
    }(Base));
}
var SqliteConnEngine = EngineOverride(/** @class */ (function (_super) {
    __extends(SqliteConnEngine, _super);
    function SqliteConnEngine(conn) {
        var _this = _super.call(this) || this;
        _this.conn = conn;
        return _this;
    }
    SqliteConnEngine.prototype.beginTransaction = function () {
        return this.queryAsync("BEGIN TRANSACTION");
    };
    SqliteConnEngine.prototype.commit = function () {
        return this.queryAsync("COMMIT TRANSACTION");
    };
    SqliteConnEngine.prototype.rollback = function () {
        return this.queryAsync("ROLLBACK TRANSACTION");
    };
    SqliteConnEngine.prototype.queryAsync = function (sql, args) {
        var _this = this;
        var db = this.conn;
        var ss = sql.split("?");
        if (ss.length > 1) {
            sql = ss[0];
            var arr = [];
            for (var i = 1; i < ss.length; i++) {
                var s = ss[i];
                var arg = args[i - 1];
                if (arg instanceof Array && /\sin\s*\($/i.test(ss[i - 1])) {
                    sql += arg.map(function (x) { return _this.sqlval(x); }).join() + s;
                }
                else {
                    arr.push(arg);
                    sql += "?" + s;
                }
            }
            args = arr;
        }
        return new Promise(function (resolve, reject) {
            if (/^\s*select/i.test(sql))
                db.all(sql, args, function (err, rows) {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(rows);
                    }
                });
            else
                db.run(sql, args, function (err) {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(this);
                    }
                });
        });
    };
    SqliteConnEngine.prototype.end = function () {
        return this.conn.end();
    };
    return SqliteConnEngine;
}(__1.ConnEngine)));
module.exports = EngineOverride(/** @class */ (function (_super) {
    __extends(SqliteEngine, _super);
    function SqliteEngine(name) {
        var _this = _super.call(this) || this;
        name = name.replace(/^sqlite3:\/\//i, "");
        _this._filename = name || ":memory:";
        _this.pools = [];
        return _this;
    }
    SqliteEngine.prototype.getConnEngine = function () {
        return SqliteConnEngine.prototype;
    };
    SqliteEngine.prototype.newConn = function () {
        var _this = this;
        var pools = this.pools;
        return new Promise(function (resolve, reject) {
            var pool = new sqlite3_1.Database(_this._filename, function (err) {
                if (err) {
                    _this.log.error("can't connect to DB <" + _this._filename + ">:", err);
                    reject(err);
                }
                else {
                    pools.push(pool);
                    resolve(new SqliteConnEngine(pool));
                }
            });
            pool.end = function () {
                var _this = this;
                return new Promise(function (resolve, reject) {
                    var idx = pools.indexOf(_this);
                    if (idx >= 0)
                        pools.splice(idx, 1);
                    _this.close(function (err) { return (err ? reject(err) : resolve()); });
                });
            };
        });
    };
    SqliteEngine.prototype.end = function () {
        return Promise.all(this.pools.map(function (x) { return x.end(); }));
    };
    return SqliteEngine;
}(__1.PoolEngine)));
