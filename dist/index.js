"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.camelCase = exports.CamelCase = exports.SchemaBuilder = exports.TableBuilder = exports.Constraint = exports.Engine = exports.Field = exports.Table = exports.createPool = exports.instanceOfSql = exports.InsertOrUpdate = exports.InsertSql = exports.SelectSql = exports.ConnEngine = exports.PoolEngine = exports.Where = exports.val = exports.arr = void 0;
var core_1 = require("./core");
Object.defineProperty(exports, "arr", { enumerable: true, get: function () { return core_1.arr; } });
Object.defineProperty(exports, "val", { enumerable: true, get: function () { return core_1.val; } });
Object.defineProperty(exports, "Where", { enumerable: true, get: function () { return core_1.Where; } });
Object.defineProperty(exports, "Engine", { enumerable: true, get: function () { return core_1.Engine; } });
Object.defineProperty(exports, "PoolEngine", { enumerable: true, get: function () { return core_1.PoolEngine; } });
Object.defineProperty(exports, "ConnEngine", { enumerable: true, get: function () { return core_1.ConnEngine; } });
Object.defineProperty(exports, "SelectSql", { enumerable: true, get: function () { return core_1.SelectSql; } });
Object.defineProperty(exports, "InsertOrUpdate", { enumerable: true, get: function () { return core_1.InsertOrUpdate; } });
Object.defineProperty(exports, "instanceOfSql", { enumerable: true, get: function () { return core_1.instanceOfSql; } });
Object.defineProperty(exports, "InsertSql", { enumerable: true, get: function () { return core_1.InsertSql; } });
var schema_1 = require("./schema");
Object.defineProperty(exports, "SchemaBuilder", { enumerable: true, get: function () { return schema_1.SchemaBuilder; } });
Object.defineProperty(exports, "Table", { enumerable: true, get: function () { return schema_1.Table; } });
Object.defineProperty(exports, "Field", { enumerable: true, get: function () { return schema_1.Field; } });
Object.defineProperty(exports, "Constraint", { enumerable: true, get: function () { return schema_1.Constraint; } });
Object.defineProperty(exports, "TableBuilder", { enumerable: true, get: function () { return schema_1.TableBuilder; } });
var utils_1 = require("./utils");
Object.defineProperty(exports, "CamelCase", { enumerable: true, get: function () { return utils_1.CamelCase; } });
Object.defineProperty(exports, "camelCase", { enumerable: true, get: function () { return utils_1.camelCase; } });
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
