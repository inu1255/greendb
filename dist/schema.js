"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function compare(a, b) {
    if (a == b)
        return true;
    if ((a == null && b != null) || (a != null && b == null))
        return false;
    return a.toLowerCase() == b.toLowerCase();
}
var Field = /** @class */ (function () {
    function Field() {
        this.null = true;
        this.inc = false;
    }
    Field.prototype.equal = function (b) {
        return compare(this.name, b.name);
    };
    Field.prototype.strictEqual = function (b, typeFn) {
        var ok = this.name == b.name &&
            (typeFn ? typeFn(this.type) : this.type) == (typeFn ? typeFn(b.type) : b.type) &&
            this.default == b.default &&
            compare(this.charset, b.charset) &&
            this.inc == b.inc &&
            this.null == b.null;
        return ok;
    };
    return Field;
}());
exports.Field = Field;
var FieldBuilder = /** @class */ (function () {
    function FieldBuilder(name, type) {
        var field = new Field();
        field.name = name;
        field.type = type;
        this._field = field;
    }
    FieldBuilder.prototype.from = function (f) {
        Object.assign(this._field, f);
        return this;
    };
    FieldBuilder.prototype.table = function (table) {
        this._field.table = table;
        return this;
    };
    FieldBuilder.prototype.notNull = function () {
        this._field.null = false;
        return this;
    };
    FieldBuilder.prototype.auto_increment = function () {
        this._field.inc = true;
        return this;
    };
    FieldBuilder.prototype.default = function (def) {
        this._field.default = def.toString();
        return this;
    };
    FieldBuilder.prototype.charset = function (charset) {
        this._field.charset = charset;
        return this;
    };
    FieldBuilder.prototype.comment = function (comment) {
        this._field.comment = comment;
        return this;
    };
    FieldBuilder.prototype.opts = function (items) {
        this._field.opts = items;
        return this;
    };
    FieldBuilder.prototype.mock = function (items) {
        this._field.mocks = items;
        return this;
    };
    FieldBuilder.prototype.update = function (v) {
        this._field.update = v;
        return this;
    };
    FieldBuilder.prototype.build = function () {
        return this._field;
    };
    return FieldBuilder;
}());
exports.FieldBuilder = FieldBuilder;
var Constraint = /** @class */ (function () {
    function Constraint(name) {
        this.name = name;
        this.type = "";
        this.ref_table = "";
        this.ref_fields = [];
    }
    Constraint.prototype.equal = function (b) {
        if (this.type != b.type)
            return false;
        if (this.type == "FOREIGN")
            return compare(this.fields.join(), b.fields.join()) && compare(this.ref_fields.join(), b.ref_fields.join()) && compare(this.ref_table, b.ref_table);
        return compare(this.fields.join(), b.fields.join());
    };
    return Constraint;
}());
exports.Constraint = Constraint;
var ConstraintBuilder = /** @class */ (function () {
    function ConstraintBuilder(type, fields) {
        this._constraint = new Constraint();
        this.type(type).fields(fields);
    }
    ConstraintBuilder.prototype.type = function (type) {
        this._constraint.type = type;
        return this;
    };
    ConstraintBuilder.prototype.fields = function (fields) {
        this._constraint.fields = typeof fields === "string" ? fields.split(",").map(function (x) { return x.trim(); }) : fields;
        return this;
    };
    ConstraintBuilder.prototype.name = function (name) {
        this._constraint.name = name;
        return this;
    };
    ConstraintBuilder.prototype.table = function (table) {
        this._table = table;
        return this;
    };
    ConstraintBuilder.prototype.references = function (table, fields) {
        this._constraint.ref_table = table;
        this._constraint.ref_fields = typeof fields === "string" ? fields.split(",").map(function (x) { return x.trim(); }) : fields;
        return this;
    };
    ConstraintBuilder.prototype.addFields = function (fields) {
        var _a;
        if (!fields.length)
            return this;
        fields = typeof fields === "string" ? fields.split(",").map(function (x) { return x.trim(); }) : fields;
        (_a = this._constraint.fields).push.apply(_a, fields);
        return this;
    };
    ConstraintBuilder.prototype.addRefFields = function (fields) {
        var _a;
        if (!fields.length)
            return this;
        fields = typeof fields === "string" ? fields.split(",").map(function (x) { return x.trim(); }) : fields;
        (_a = this._constraint.ref_fields).push.apply(_a, fields);
        return this;
    };
    ConstraintBuilder.prototype.build = function () {
        if (!this._constraint.name)
            this._constraint.name = (this._table ? this._table + "__" : "") + this._constraint.fields.join("_");
        return this._constraint;
    };
    return ConstraintBuilder;
}());
exports.ConstraintBuilder = ConstraintBuilder;
var Table = /** @class */ (function () {
    function Table(name, fields) {
        this.name = name;
        this.fields = {};
        this.constraints = {};
        if (fields)
            for (var _i = 0, fields_1 = fields; _i < fields_1.length; _i++) {
                var field = fields_1[_i];
                field.table(name);
                if (field instanceof FieldBuilder) {
                    this.addField(field.build());
                }
                else {
                    this.addConstraint(field.build());
                }
            }
    }
    Table.prototype.addField = function (field) {
        var f = field instanceof Field ? field : new FieldBuilder(field.name, field.type).from(field).table(this.name).build();
        if (this.fields[f.name])
            throw new Error("table " + name + ": duplicate field " + f.name);
        this.fields[f.name] = f;
    };
    Table.prototype.addConstraint = function (constraint) {
        if (constraint.type.toLowerCase() === "primary") {
            if (this.primary)
                throw new Error("table " + name + ": duplicate primary key");
            this.primary = constraint;
        }
        else
            this.constraints[constraint.name] = constraint;
    };
    Table.prototype.mapField = function (fn) {
        var list = [];
        for (var k in this.fields) {
            var v = this.fields[k];
            list.push(fn(v));
        }
        return list;
    };
    Table.prototype.mapConstraint = function (fn) {
        var list = [];
        if (this.primary)
            list.push(fn(this.primary));
        for (var k in this.constraints) {
            var v = this.constraints[k];
            list.push(fn(v));
        }
        return list;
    };
    Table.prototype.migrationFrom = function (table, compareField) {
        var list = [];
        var drops = [];
        var toFields = Object.values(this.fields);
        var fromFields = Object.values(table.fields);
        var toConstraints = Object.values(this.constraints);
        var fromConstraints = Object.values(table.constraints);
        var prev;
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
                // 有同一个字段
                if (!(compareField ? compareField(f1, f0) : f1.strictEqual(f0))) {
                    // 如果字段发生改变
                    list.push({ from: f0, to: f1, after: prev });
                }
            }
            else {
                // 多了个字段
                list.push({ from: null, to: f1, after: prev });
            }
            prev = f1.name;
        }
        for (var _a = 0, toConstraints_1 = toConstraints; _a < toConstraints_1.length; _a++) {
            var f1 = toConstraints_1[_a];
            var f0 = void 0;
            for (var i = fromConstraints.length - 1; i >= 0; i--) {
                var f = fromConstraints[i];
                if (f1.equal(f)) {
                    f0 = f;
                    fromConstraints.splice(i, 1);
                    break;
                }
            }
            if (!f0) {
                // 多了个索引
                list.push({ type: "create", data: f1 });
            }
        }
        for (var _b = 0, fromConstraints_1 = fromConstraints; _b < fromConstraints_1.length; _b++) {
            var f = fromConstraints_1[_b];
            drops.push({ type: "drop", data: f });
        }
        for (var _c = 0, fromFields_1 = fromFields; _c < fromFields_1.length; _c++) {
            var f = fromFields_1[_c];
            drops.push({ from: f, to: null });
        }
        return drops.concat(list);
    };
    return Table;
}());
exports.Table = Table;
var TableBuilder = /** @class */ (function () {
    function TableBuilder(name, fields) {
        this._constraint_idx = 0;
        this._constraint_map = {};
        this._table = new Table(name, fields);
    }
    TableBuilder.prototype.addField = function (field) {
        this._table.addField(field);
    };
    TableBuilder.prototype.addConstrain = function (constraint) {
        var name = constraint.name || "$" + this._constraint_idx++;
        var c = this._constraint_map[name];
        if (c)
            return c.addFields(constraint.fields).addRefFields(constraint.ref_fields);
        return (this._constraint_map[name] = new ConstraintBuilder(constraint.type, constraint.fields).name(name).references(constraint.ref_table, constraint.ref_fields));
    };
    TableBuilder.prototype.comment = function (comment) {
        this._table.comment = comment;
        return this;
    };
    TableBuilder.prototype.mysql_engine = function (engine) {
        this._table.mysql_engine = engine;
        return this;
    };
    TableBuilder.prototype.charset = function (charset) {
        this._table.charset = charset;
        return this;
    };
    TableBuilder.prototype.auto_increment = function (n) {
        this._table.inc = n;
        return this;
    };
    TableBuilder.prototype.constraint = function (type, fields) {
        var name = "$" + this._constraint_idx++;
        var c = this._constraint_map[name];
        if (c)
            throw new Error("constraint " + name + " in table " + this._table.name + " exists");
        return (this._constraint_map[name] = new ConstraintBuilder(type, fields));
    };
    TableBuilder.prototype.build = function () {
        var list = [];
        for (var k in this._constraint_map) {
            var v = this._constraint_map[k];
            list.push(v.build());
        }
        if (list.length) {
            for (var _i = 0, list_1 = list; _i < list_1.length; _i++) {
                var item = list_1[_i];
                this._table.addConstraint(item);
            }
            this._constraint_map = {};
        }
        return this._table;
    };
    return TableBuilder;
}());
exports.TableBuilder = TableBuilder;
var SchemaBuilder = /** @class */ (function () {
    function SchemaBuilder() {
        this._tables = {};
    }
    Object.defineProperty(SchemaBuilder.prototype, "tables", {
        get: function () {
            return this.mapTable(function (x) { return x; });
        },
        enumerable: true,
        configurable: true
    });
    SchemaBuilder.prototype.table = function (name, fields) {
        return (this._tables[name] = new TableBuilder(name, fields));
    };
    SchemaBuilder.prototype.mapTable = function (fn) {
        var out = [];
        for (var k in this._tables) {
            var v = this._tables[k];
            out.push(fn(v.build()));
        }
        return out;
    };
    SchemaBuilder.prototype.migrationFrom = function (old, fn) {
        old = old instanceof SchemaBuilder ? old.tables : old;
        var oldMap = {};
        for (var _i = 0, old_1 = old; _i < old_1.length; _i++) {
            var o = old_1[_i];
            oldMap[o.name] = o;
        }
        var pmss = [];
        for (var k in this._tables) {
            var a = this._tables[k];
            var b = oldMap[k];
            delete oldMap[k];
            pmss.push(fn(a.build(), b));
        }
        for (var k in oldMap) {
            var v = oldMap[k];
            pmss.push(fn(null, v));
        }
        return Promise.all(pmss);
    };
    SchemaBuilder.prototype.sync = function (db, dropTable) {
        var _this = this;
        return db.getTables().then(function (tables) {
            return _this.migrationFrom(tables, function (newTable, oldTable) {
                if (newTable && oldTable)
                    return db.execSQL(db.migration(newTable, oldTable));
                if (newTable)
                    return db.execSQL(db.createTable(newTable));
                if (oldTable && dropTable)
                    return db.execSQL("drop table " + db.quotes(oldTable.name));
            });
        });
    };
    //#region 字段
    SchemaBuilder.prototype.field = function (name, type) {
        return new FieldBuilder(name, type.toLowerCase());
    };
    SchemaBuilder.prototype.varchar = function (name, len) {
        return this.field(name, "varchar(" + len + ")");
    };
    SchemaBuilder.prototype.text = function (name) {
        return this.field(name, "text");
    };
    SchemaBuilder.prototype.json = function (name) {
        return this.field(name, "json");
    };
    SchemaBuilder.prototype.float = function (name) {
        return this.field(name, "float");
    };
    SchemaBuilder.prototype.int = function (name) {
        return this.field(name, "int");
    };
    SchemaBuilder.prototype.opts = function (name, items) {
        return this.field(name, "int").opts(items);
    };
    SchemaBuilder.prototype.bigint = function (name) {
        return this.field(name, "bigint");
    };
    SchemaBuilder.prototype.unsigned = function (name) {
        return this.field(name, "int unsigned");
    };
    //#endregion
    //#region 约束
    SchemaBuilder.prototype.constraint = function (type, fields) {
        return new ConstraintBuilder("", fields).type(type);
    };
    SchemaBuilder.prototype.primary = function (field) {
        return this.constraint("PRIMARY", field);
    };
    SchemaBuilder.prototype.index = function (field) {
        return this.constraint("", field);
    };
    SchemaBuilder.prototype.unique = function (field) {
        return this.constraint("UNIQUE", field);
    };
    SchemaBuilder.prototype.foreign = function (field) {
        return this.constraint("FOREIGN", field);
    };
    SchemaBuilder.prototype.fulltext = function (field) {
        return this.constraint("FULLTEXT", field);
    };
    return SchemaBuilder;
}());
exports.SchemaBuilder = SchemaBuilder;
