"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var core_1 = require("./core");
exports.arr = core_1.arr;
exports.val = core_1.val;
exports.Where = core_1.Where;
exports.Engine = core_1.Engine;
exports.PoolEngine = core_1.PoolEngine;
exports.ConnEngine = core_1.ConnEngine;
exports.SelectSql = core_1.SelectSql;
exports.InsertOrUpdate = core_1.InsertOrUpdate;
exports.instanceOfSql = core_1.instanceOfSql;
exports.InsertSql = core_1.InsertSql;
var schema_1 = require("./schema");
exports.SchemaBuilder = schema_1.SchemaBuilder;
exports.Table = schema_1.Table;
exports.Field = schema_1.Field;
exports.Constraint = schema_1.Constraint;
exports.TableBuilder = schema_1.TableBuilder;
function createPool(url, config) {
    if (!config)
        config = url;
    var s = url.toLowerCase();
    var mod;
    if (s.startsWith("mysql")) {
        mod = require("./engines/mysql");
    }
    else if (s.startsWith("sqlite")) {
        mod = require("./engines/sqlite");
    }
    else if (s.startsWith("postgresql")) {
        mod = require("./engines/postgresql");
    }
    if (mod)
        return new mod(config);
}
exports.createPool = createPool;
