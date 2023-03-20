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
var pg_1 = require("pg");
var __1 = require("..");
var schema_1 = require("../schema");
var url_1 = require("url");
var PgSelectSql = /** @class */ (function (_super) {
    __extends(PgSelectSql, _super);
    function PgSelectSql() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    PgSelectSql.prototype.limit = function (offset, size) {
        offset = +offset;
        size = +size;
        if (size && offset)
            this._limit = " limit " + size + " offset " + offset;
        else if (size)
            this._limit = " limit " + size;
        else if (offset)
            this._limit = " offset " + offset;
        else
            this._limit = " limit 1";
        return this;
    };
    return PgSelectSql;
}(__1.SelectSql));
var TYPE_MAP = {
    int8: "bigint",
    float8: "float",
};
function EngineOverride(Base) {
    return /** @class */ (function (_super) {
        __extends(class_1, _super);
        function class_1() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        class_1.prototype.runSql = function (s) {
            var _this = this;
            if (s instanceof __1.InsertSql && s.returnId()) {
                return this.execSQL({ sql: s.sql + " returning id", args: s.args, ignore_log: s.ignore_log, pack: function (rows) { return rows[0].id; } });
            }
            if (s instanceof __1.InsertOrUpdate && !s.hasWhere()) {
                var insert = s.insertSql();
                return this.execSQL(insert, [], { ignore: true }).catch(function (err) {
                    if (/^duplicate/.test(err.message)) {
                        var m = /Key \(([^)]+)/.exec(err.detail);
                        if (m) {
                            var u = s.updateSql();
                            for (var _i = 0, _a = m[1].split(","); _i < _a.length; _i++) {
                                var k = _a[_i];
                                k = k.trim();
                                u.where(k, s.get(k));
                            }
                            return _this.execSQL(u);
                        }
                    }
                    return Promise.reject(err);
                });
            }
            return _super.prototype.runSql.call(this, s);
        };
        class_1.prototype.select = function (table, keys) {
            return new PgSelectSql(table, keys).engine(this);
        };
        class_1.prototype.getTables = function (db, nspname) {
            var _this = this;
            if (nspname === void 0) { nspname = "public"; }
            var pms = db ? Promise.resolve([{ db: db }]) : this.execSQL("select current_database() db");
            return pms
                .then(function (rows) { return rows[0].db; })
                .then(function (x) {
                db = x;
                return _this.execSQL("select oid from pg_namespace where nspname=?", [nspname]).then(function (rows) { return rows[0].oid; });
            })
                .then(function (oid) {
                return _this.execSQL("select oid,relname from pg_class where relkind='r' and relpersistence='p' and relnamespace=?", [oid]).then(function (tables) { return ({
                    db: db,
                    tables: tables,
                }); });
            })
                .then(function (_a) {
                var db = _a.db, tables = _a.tables;
                var sqls = [
                    {
                        sql: "select table_name,column_name,ordinal_position,column_default,is_nullable,data_type,character_maximum_length,udt_name from information_schema.columns where table_catalog=? and table_schema=? order by table_name,ordinal_position",
                        args: [db, nspname],
                    },
                    {
                        sql: "select conrelid,conname,contype,confrelid," +
                            "	(select string_agg(attname,',') from pg_attribute,unnest(conkey) as n where attnum>0 and attrelid=conrelid and attnum=n) conkeyname," +
                            "	(select string_agg(attname,',') from pg_attribute,unnest(confkey) as n where attnum>0 and attrelid=confrelid and attnum=n) confkeyname " +
                            "from pg_constraint where conrelid in (?)",
                        args: [tables.map(function (x) { return x.oid; })],
                    },
                    { sql: "select tablename,indexname,indexdef from pg_indexes where schemaname=?", args: [nspname] },
                ];
                return _this.execSQL(sqls, [], { transaction: false }).then(function (out) { return ({
                    tables: tables,
                    columns: out[0],
                    constraints: out[1],
                    indexs: out[2],
                }); });
            })
                .then(function (_a) {
                var tables = _a.tables, columns = _a.columns, constraints = _a.constraints, indexs = _a.indexs;
                var o2t = new Map();
                var n2t = new Map();
                var list = [];
                for (var _i = 0, tables_1 = tables; _i < tables_1.length; _i++) {
                    var row = tables_1[_i];
                    var t = new schema_1.TableBuilder(row.relname);
                    n2t.set(row.relname, t);
                    o2t.set(row.oid, row.relname);
                    list.push(t);
                }
                for (var _b = 0, columns_1 = columns; _b < columns_1.length; _b++) {
                    var row = columns_1[_b];
                    var t = n2t.get(row.table_name);
                    var def = row.column_default;
                    var inc = false;
                    if (def) {
                        if (def.startsWith("nextval("))
                            (inc = true), (def = null);
                        else {
                            var idx = def.indexOf(":");
                            if (idx >= 0)
                                def = def.slice(0, idx);
                            if (def[0] == def[def.length - 1] && def[0] == "'")
                                def = def.slice(1, -1);
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
                        inc: inc,
                    });
                }
                for (var _c = 0, constraints_1 = constraints; _c < constraints_1.length; _c++) {
                    var row = constraints_1[_c];
                    var t = n2t.get(o2t.get(row.conrelid));
                    if (row.contype == "u")
                        t.constraint("UNIQUE", row.conkeyname).name(row.conname);
                    else if (row.contype == "p")
                        t.constraint("PRIMARY", row.conkeyname).name(row.conname);
                    else if (row.contype == "f")
                        t.constraint("FOREIGN", row.conkeyname).name(row.conname).references(o2t.get(row.confrelid), row.confkeyname);
                }
                for (var _d = 0, indexs_1 = indexs; _d < indexs_1.length; _d++) {
                    var row = indexs_1[_d];
                    var t = n2t.get(row.tablename);
                    if (row.indexdef.startsWith("CREATE INDEX ")) {
                        var m = /\(([^)]+)/.exec(row.indexdef);
                        t.constraint("", m[1]).name(row.indexname);
                    }
                    // else if(row.indexdef.startsWith('CREATE UNIQUE INDEX '));
                }
                return list.map(function (x) { return x.build(); });
            });
        };
        class_1.prototype.fieldType = function (type) {
            return type.replace(/int unsigned/, "bigint").replace(/varchar\(\d+\)/, "varchar");
        };
        class_1.prototype.fieldSql = function (field) {
            var s = this.quotes(field.name) + " " + (field.inc ? "serial" : this.fieldType(field.type));
            var canDef = !field.inc && !/text|json/.test(field.type);
            if (!field.null)
                s += " NOT NULL";
            if (canDef) {
                if (field.default == null)
                    s += " DEFAULT NULL";
                else
                    s += " DEFAULT " + this.sqlval(field.default);
            }
            return s;
        };
        class_1.prototype.createTable = function (table) {
            var _this = this;
            var tail = ")";
            if (table.charset)
                tail += " ENCODING '" + table.charset + "'";
            var primary = table.primary;
            if (primary) {
                for (var _i = 0, _a = primary.fields; _i < _a.length; _i++) {
                    var key = _a[_i];
                    table.fields[key].null = false;
                }
            }
            var sqls = [];
            var sql = [
                "CREATE TABLE " + this.quotes(table.name) + " (",
                __spreadArrays(table
                    .mapField(function (x) { return x; })
                    .sort(function (a, b) {
                    var t = 0;
                    if (primary) {
                        t = primary.fields.indexOf(a.name) - primary.fields.indexOf(b.name);
                        if (t)
                            return t;
                    }
                    t = +a.null - +b.null;
                    if (t)
                        return t;
                    if (a.name == b.name)
                        return 0;
                    return a.name > b.name ? 1 : -1;
                })
                    .map(function (field) {
                    return "\t" + _this.fieldSql(field);
                }), table
                    .mapConstraint(function (x) { return x; })
                    .sort(function (a, b) {
                    var t = +(b.type == "PRIMARY") - +(a.type == "PRIMARY");
                    if (t)
                        return t;
                    if (a.name == b.name)
                        return 0;
                    return a.name > b.name ? 1 : -1;
                })
                    .map(function (constraint) {
                    var field = "(" + constraint.fields.map(function (x) { return _this.quotes(x); }) + ")";
                    if (constraint.type === "PRIMARY")
                        return "PRIMARY KEY " + field;
                    var name = _this.quotes(constraint.name);
                    if (constraint.type === "UNIQUE")
                        return "CONSTRAINT " + name + " UNIQUE " + field;
                    if (constraint.type === "FOREIGN")
                        return "CONSTRAINT " + name + " FOREIGN KEY " + field + " REFERENCES " + _this.quotes(constraint.ref_table) + " (" + constraint.ref_fields.map(function (x) {
                            return _this.quotes(x);
                        }) + ")";
                    sqls.push("CREATE INDEX " + name + " ON " + _this.quotes(table.name) + field);
                    return "";
                })
                    .filter(function (x) { return x; })
                    .map(function (x) { return "\t" + x; })).join(",\n"),
                tail + ";",
            ];
            sqls.unshift(sql.join("\n"));
            return sqls;
        };
        class_1.prototype.migration = function (newTable, oldTable) {
            var _this = this;
            var list = newTable.migrationFrom(oldTable, function (a, b) { return a.strictEqual(b, _this.fieldType.bind(_this)); });
            var table = oldTable.name;
            var tmps = list.map(function (f) {
                // 约束
                if ("type" in f) {
                    if (f.type == "create") {
                        if (f.data.type == "FOREIGN")
                            return "alter table " + _this.quotes(table) + " add constraint " + _this.quotes(f.data.name) + " foreign key (" + f.data.fields.map(function (x) {
                                return _this.quotes(x);
                            }) + ") references " + _this.quotes(f.data.ref_table) + " (" + f.data.ref_fields.map(function (x) { return _this.quotes(x); }) + ")";
                        if (f.data.type == "UNIQUE")
                            return "alter table " + _this.quotes(table) + " add constraint " + _this.quotes(f.data.name) + " unique (" + f.data.fields.map(function (x) { return _this.quotes(x); }) + ")";
                        return "create " + f.data.type + " index " + _this.quotes(f.data.name) + " on " + _this.quotes(table) + " (" + f.data.fields.map(function (x) { return _this.quotes(x); }) + ")";
                    }
                    if (f.data.type)
                        return "alter table " + _this.quotes(table) + " drop constraint " + _this.quotes(f.data.name);
                    return "drop index " + _this.quotes(f.data.name);
                }
                // 字段
                if (f.from && f.to) {
                    var sqls = [];
                    if (f.from.name != f.to.name)
                        sqls.push("alter table " + _this.quotes(table) + " rename " + _this.quotes(f.from.name) + " to " + _this.quotes(f.to.name));
                    if (f.from.type != f.to.type)
                        sqls.push("alter table " + _this.quotes(table) + " alter column " + _this.quotes(f.to.name) + " type " + _this.fieldType(f.to.type));
                    var canDef = !/text|json/.test(f.to.type);
                    if (!f.to.null)
                        sqls.push("alter table " + _this.quotes(table) + " alter column " + _this.quotes(f.to.name) + " set not null");
                    if (canDef) {
                        // sqls.push(`alter table ${this.quotes(table)} alter column ${this.quotes(f.to.name)} drop default`);
                        if (f.to.inc) {
                            sqls.push("CREATE SEQUENCE if not exists " + table + "_id_seq");
                            sqls.push("alter table " + _this.quotes(table) + " alter column " + _this.quotes(f.to.name) + " set default nextval('" + table + "_id_seq')");
                        }
                        else if (f.to.default == null)
                            sqls.push("alter table " + _this.quotes(table) + " alter column " + _this.quotes(f.to.name) + " set default null");
                        if (f.to.default != null)
                            sqls.push("alter table " + _this.quotes(table) + " alter column " + _this.quotes(f.to.name) + " set DEFAULT " + _this.sqlval(f.to.default));
                    }
                    return sqls;
                }
                if (f.to)
                    return "alter table " + _this.quotes(table) + " add column " + _this.fieldSql(f.to);
                return "alter table " + _this.quotes(table) + " drop column " + f.from.name;
            });
            return tmps.reduce(function (a, b) { return (b instanceof Array ? a.push.apply(a, b) : a.push(b), a); }, []);
        };
        return class_1;
    }(Base));
}
var PgConnEngine = EngineOverride(/** @class */ (function (_super) {
    __extends(PgConnEngine, _super);
    function PgConnEngine(conn) {
        var _this = _super.call(this) || this;
        _this.conn = conn;
        return _this;
    }
    PgConnEngine.prototype.beginTransaction = function () {
        return this.conn.query("BEGIN");
    };
    PgConnEngine.prototype.commit = function () {
        return this.conn.query("COMMIT");
    };
    PgConnEngine.prototype.rollback = function () {
        return this.conn.query("ROLLBACK");
    };
    PgConnEngine.prototype.queryAsync = function (sql, args) {
        var _this = this;
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
                    sql += "$" + arr.length + s;
                }
            }
            args = arr;
        }
        return this.conn.query(sql, args).then(function (x) {
            return x.rows;
        });
    };
    PgConnEngine.prototype.end = function () {
        this.conn.release();
        return Promise.resolve();
    };
    return PgConnEngine;
}(__1.ConnEngine)));
module.exports = EngineOverride(/** @class */ (function (_super) {
    __extends(PgEngine, _super);
    function PgEngine(config) {
        var _this = _super.call(this) || this;
        if (typeof config === "string") {
            var u = url_1.parse(config);
            var _a = u.auth.split(":"), user = _a[0], password = _a[1];
            config = {
                host: u.hostname,
                user: user,
                password: password,
                database: u.path.slice(1),
            };
        }
        _this.pool = new pg_1.Pool(config);
        return _this;
    }
    PgEngine.prototype.getConnEngine = function () {
        return PgConnEngine.prototype;
    };
    PgEngine.prototype.newConn = function () {
        return this.pool.connect().then(function (client) { return new PgConnEngine(client); });
    };
    PgEngine.prototype.end = function () {
        return this.pool.end();
    };
    return PgEngine;
}(__1.PoolEngine)));
