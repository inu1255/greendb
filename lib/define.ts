interface GreenParam {
    lbl?: string; // 参数名
    rem?: string; // 参数注释
    need?: boolean | string | string[]; // 是否必传
    def?: any; // 默认值
    reg?: string; // 正则表达式
    type?: "int" | "float" | "number" | "json" | "array" | "str" | "file"; // 参数类型
    enum?: Array<any>; // 参数枚举值
    opts?: Array<any>; // 参数对应含义
    len?: [number, number] | number; // 长度限制 [6,32] 6 [0,100]
    range?: [number, number] | number; // 范围限制 [6,32] 6 [0,100]
}

import { IEngine } from "./sqlbuilder";
import * as utils from './utils'

function val(v) {
    if (v == null) return "null";
    if (typeof v === "string") return `'${v.replace(/'/g, "\\'")}'`;
    if (typeof v === "number") return v;
    return `'${JSON.stringify(v).replace(/'/g, "\\'")}'`;
}

function use(str: string) {
    return "`" + (str || "").replace(/,/g, "`,`") + "`";
}

function compare(a: string, b: string) {
    if (a == b) return true;
    if (a == null && b != null || a != null && b == null) return false;
    return a.toLowerCase() == b.toLowerCase();
}

export class Field {
    _name: string;
    _type: string;
    _table: string;
    _default: string;
    _comment: string;
    _charset: string;
    _null: boolean;
    _inc: boolean;
    // 以下字段与数据库无关
    _opts: string[];
    _mocks: any[];
    _update: string;
    constructor(name?: string, type?: string) {
        this._name = name;
        this._type = type;
        this._null = true;
        this._inc = false;
    }
    table(table: string) {
        this._table = table;
        return this;
    }
    notNull() {
        this._null = false;
        return this;
    }
    auto_increment() {
        this._inc = true;
        return this;
    }
    default(def: any) {
        this._default = def.toString();
        return this;
    }
    charset(charset: string) {
        this._charset = charset;
        return this;
    }
    comment(comment: string) {
        this._comment = comment;
        return this;
    }
    opts(items: string[]) {
        this._opts = items;
        return this;
    }
    mock(items: any[]) {
        this._mocks = items;
        return this;
    }
    update(v: string) {
        this._update = v;
        return this;
    }
    toString() {
        let s = use(this._name) + " " + this._type;
        let canDef = !/text|json/.test(this._type)
        if (this._charset) s += " CHARACTER SET " + this._charset;
        if (!this._null) s += " NOT NULL";
        else if (canDef && this._default == null) s += " DEFAULT NULL";
        if (this._inc) s += " AUTO_INCREMENT";
        if (canDef && this._default != null) s += ` DEFAULT ${val(this._default)}`;
        if (this._comment) s += ` COMMENT '${this._comment.replace(/'/g, "\\'")}'`;
        return s;
    }
    /**
     * @param primary_keys 主键列表, 如果不传，则不会生成need:primary_keys
     */
    _param(primary_keys?: string[]) {
        let v: GreenParam = { lbl: this._name };
        if (this._comment) {
            var ss = this._comment.split(/[:, ：]/);
            var lbl = ss[0]
            if (lbl.length > 8) v.rem = this._comment;
            else {
                v.lbl = lbl;
                if (ss.length > 1) v.rem = this._comment.slice(lbl.length + 1)
            }
        }
        if (this._type.indexOf("int") >= 0) {
            v.type = "int";
            if (this._opts) v.opts = this._opts;
        } else if (/float|double/.test(this._type))
            v.type = "float";
        else {
            let m = /char\((\d+)\)/.exec(this._type);
            if (m) {
                v.len = [0, +m[1]];
            }
        }
        if (primary_keys && primary_keys.length) {
            if (!this._null && primary_keys.indexOf(this._name) < 0) v.need = primary_keys.length > 1 ? primary_keys : primary_keys[0];
        }
        return v;
    }
    /**
     * @param primary_keys 主键列表, 如果不传，则不会生成need:primary_keys
     */
    toParam(primary_keys: string[]) {
        let data: { [key: string]: GreenParam } = {}
        data[this._name] = this._param(primary_keys || ['id']);
        return data;
    }
    _isRangeParam() {
        return !this._opts && /int|float|double/.test(this._type) && !/id$|^idx$/.test(this._name);
    }
    toQueryParam() {
        let data: { [key: string]: GreenParam } = {}
        if (/json|test/.test(this._type))
            return data;
        let v = this._param();
        if (this._isRangeParam()) {
            let min = Object.assign({}, v)
            min.lbl += '下限'
            let CamelName = utils.CamelCase(this._name);
            data['min' + CamelName] = min
            v.lbl += '上限'
            data['max' + CamelName] = v
        } else {
            data[this._name] = v;
        }
        return data;
    }
    toMock() {
        if (this._mocks)
            return this._mocks[Math.floor(this._mocks.length * Math.random())]
        if (this._type.indexOf("int") >= 0) {
            if (this._name.slice(-3) == '_at')
                return Date.now() - Math.floor(Math.random() * 86400e3 * 30);
            if (/unsigned/.test(this._type))
                return Math.floor(Math.random() * 86400e3);
            return Math.floor(Math.random() * 86400e3 * 2) - 86400e3;
        }
        if (/float|double/.test(this._type))
            return Math.random() * 86400e3 * 2 - 86400e3;
        let m = /char\((\d+)\)/.exec(this._type)
        if (m) return utils.randomString(Math.floor(Math.random() * +m[1]));
        if (/json/.test(this._type))
            return {};
        return utils.randomString(32);
    }
    toTypescript() {
        let type = "string";
        let comment = "";
        if (/int|float/.test(this._type)) type = "number";
        if (this._comment) comment = ` // ${this._comment}`;
        return `${this._name}${this._null || this._default || this._inc ? '?' : ''}: ${type}, ${comment}`;
    }
    toDart() {
        let type = "String";
        let comment = "";
        let def = "";
        if (/int/.test(this._type)) type = "int";
        else if (/float|double/.test(this._type)) type = "double";
        if (this._comment) comment = ` // ${this._comment}`;
        if (this._default) def = "=" + utils.val(this._default);
        return `${type} ${utils.camelCase(this._name)}${def}; ${comment}`;
    }
    parse(str: string) {
        let m = /^(\S+) (\S+( unsigned)?) /.exec(str);
        if (m) {
            this._name = m[1].replace(/`/g, "");
            this._type = m[2].replace(/`/g, "");
            this._type = this._type.replace("int(10) unsigned", "int unsigned");
            this._type = this._type.replace("int(11)", "int");
            this._type = this._type.replace("bigint(20)", "bigint");
        }
        str.replace(/,$/, "")
            .replace(/ CHARACTER SET (\S+)/, (x0, x1) => {
                this._charset = x1;
                return "";
            })
            .replace(/ DEFAULT (\S+)/, (x0, x1) => {
                if (x1 == "NULL") this._default = null;
                else if (x1.startsWith("'")) this._default = x1.slice(1, -1).replace(/(?<!\\)\\'/g, "'");
                else this._default = x1;
                return "";
            })
            .replace(/ AUTO_INCREMENT/, (x0, x1) => {
                this._inc = true;
                return "";
            })
            .replace(/ NOT NULL/, (x0, x1) => {
                this._null = false;
                return "";
            })
            .replace(/ COMMENT '([\S\s]*)'/, (x0, x1) => {
                this._comment = x1.replace(/(?<!\\)\\'/, "'");
                return "";
            });
        return this;
    }
    eq(b: Field) {
        return compare(this._name, b._name);
    }
    equal(b: Field) {
        var ok = this._type == b._type && this._default == b._default && compare(this._charset, b._charset) && this._comment == b._comment && this._inc == b._inc && this._null == b._null;
        // if (!ok) {
        // 	console.log(JSON.stringify(b))
        // 	console.log(JSON.stringify(this))
        // }
        return ok;
    }
}

export class Constraint {
    _type: string;
    _field: string;
    _name: string;
    _ref_table: string;
    _ref_field: string;
    private _table: string;
    constructor(type?: string, field?: string, table?: string) {
        this._type = type || "";
        this._field = field ? field.replace(/\s+/g, "") : "";
        this._table = table;
    }
    name(name?: string) {
        if (name != null) this._name = name;
        if (!this._name) this._name = (this._table ? this._table + "__" : "") + this._field.replace(/,/g, "_");
        return this;
    }
    table(table: string) {
        this._table = table;
        return this;
    }
    references(table: string, field: string) {
        this._ref_table = table;
        this._ref_field = field;
        return this;
    }
    toString() {
        let field = `(${use(this._field)})`;
        if (this._type === "PRIMARY") return `PRIMARY KEY ${field}`;
        let name = use(this.name()._name);
        if (this._type === "UNIQUE") return `UNIQUE KEY ${name} ${field}`;
        if (this._type === "FOREIGN") return `CONSTRAINT ${name} FOREIGN KEY ${field} REFERENCES ${use(this._ref_table)} (${use(this._ref_field)})`;
        return `KEY ${name} ${field}`;
    }
    parse(str: string) {
        let m = /^(CONSTRAINT (\S+) )?(\S+ )?KEY([^\(\)]*)\(([^\)]+)\)( REFERENCES (\S+) \((\S+)\))?/.exec(str);
        if (m) {
            this._type = m[3] ? m[3].trim() : "";
            this._field = m[5].replace(/`/g, "").trim();
            if (m[4]) this._name = m[4].replace(/`/g, "").trim();
            if (m[2]) this._name = m[2].replace(/`/g, "").trim();
            if (m[7]) this._ref_table = m[7].replace(/`/g, "").trim();
            if (m[8]) this._ref_field = m[8].replace(/`/g, "").trim();
        }
        return this;
    }
    eq(b: Constraint) {
        if (this._type != b._type) return false;
        if (this._type == "FOREIGN") return compare(this._field, b._field) && compare(this._ref_field, b._ref_field) && compare(this._ref_table, b._ref_table);
        return compare(this._field, b._field);
    }
    equal(b: Constraint) {
        return this.eq(b);
    }
}

export class Table {
    _name: string;
    _fields: Array<Field | Constraint>;
    _comment: string;
    _engine: "innodb" | "myisam";
    _charset: string;
    _inc: number;
    get name() {
        return this._name;
    }
	/**
	 * @param {string} name
	 * @param {Array<Field|Constraint>} fields
	 */
    constructor(name?: string, fields?: Array<Field | Constraint>) {
        this._name = name;
        this._fields = fields || [];
        for (let field of this._fields) {
            field.table(name);
        }
    }
    comment(comment: string) {
        this._comment = comment;
        return this;
    }
    engine(engine: "innodb" | "myisam") {
        this._engine = engine;
        return this;
    }
    charset(charset: string) {
        this._charset = charset;
        return this;
    }
    auto_increment(n: number) {
        this._inc = n;
        return this;
    }
    toString() {
        let tail = [")"];
        if (this._engine) tail.push("ENGINE=" + this._engine);
        if (this._inc) tail.push("AUTO_INCREMENT=" + this._inc);
        if (this._charset) tail.push("DEFAULT CHARACTER SET " + this._charset);
        if (this._comment) tail.push(`COMMENT='${this._comment.replace(/'/g, "''")}'`);
        let sql = [`CREATE TABLE \`${this._name}\` (`, this._fields.map(x => "\t" + x).join(",\n"), tail.join(" ") + ";"];
        return sql.join("\n");
    }
    toParams(filter?: (_: Field) => boolean) {
        let params: { [key: string]: GreenParam } = {};
        let pmap = this.getPrimary();
        let primary_keys = Object.keys(pmap);
        for (let item of this._fields) {
            if (item instanceof Field && (!filter || filter(item))) {
                Object.assign(params, item.toParam(primary_keys));
            }
        }
        return params;
    }
    toQueryParams(filter?: (_: Field) => boolean) {
        let params: { [key: string]: GreenParam } = {};
        for (let item of this._fields) {
            if (item instanceof Field && (!filter || filter(item))) Object.assign(params, item.toQueryParam());
        }
        return params;
    }
    toMock() {
        let data: { [key: string]: any } = {};
        for (let item of this._fields) {
            if (item instanceof Field) data[item._name] = item.toMock();
        }
        return data;
    }
    toTypescript() {
        let ss = [`interface ${utils.CamelCase(this._name)} {`];
        for (let item of this._fields) {
            if (item instanceof Field) ss.push("\t" + item.toTypescript());
        }
        ss.push("}");
        return ss.join("\n");
    }
    toDart() {
        let CamelName = utils.CamelCase(this._name);
        let ss = [`import 'package:json_annotation/json_annotation.dart';`]
        ss.push(`part '${this._name}.g.dart';`)
        ss.push(`@JsonSerializable(fieldRename: FieldRename.snake)`)
        ss.push(`class ${CamelName}Model {`)
        for (let item of this._fields) {
            if (item instanceof Field) ss.push("  " + item.toDart());
        }
        ss.push(``);
        ss.push(`  ${CamelName}Model({`);
        for (let item of this._fields) {
            if (item instanceof Field) ss.push(`    this.${utils.camelCase(item._name)},`);
        }
        ss.push(`  });`)
        ss.push(`  factory ${CamelName}Model.fromJson(Map<String, dynamic> json) => _$${CamelName}ModelFromJson(json);`)
        ss.push(`  Map<String, dynamic> toJson() => _$${CamelName}ModelToJson(this);`)
        ss.push(`}`);
        return ss.join("\n");
    }
    getPrimary() {
        let fields: { [name: string]: Field } = {}
        for (let i = this._fields.length - 1; i >= 0; i--) {
            let field = this._fields[i];
            if (field instanceof Constraint && field._type == "PRIMARY") {
                let keys = field._field.toLowerCase().split(',')
                for (let item of this._fields) {
                    if (item instanceof Field && keys.indexOf(item._name.toLowerCase()) >= 0) {
                        fields[item._name] = item;
                    }
                }
                break;
            }
        }
        return fields;
    }
    getApiInfo() {
        var has_create_id = false;
        var has_create_at = false;
        var has_update_at = false;
        for (let filed of this._fields) {
            if (filed._name === "create_id")
                has_create_id = true
            if (filed._name === "create_at")
                has_create_at = true
            if (filed._name === "update_at")
                has_update_at = true
        }
        return {
            has_create_id,
            has_create_at,
            has_update_at,
        }
    }
	/**
	 * 生成 add 接口
	 * @param dir 接口定义文件
	 * @param name 接口定义前缀
	 */
    toApiAdd(dir: string, name?: string) {
        let tableName = this._comment || this._name
        name = name ? name + '_add' : 'add'
        let info = this.getApiInfo()
        let ignores = ["create_id", "create_at", "update_at", "ip"]
        var api = {
            "name": `添加/修改${tableName}`,
            "method": "post",
            "params": this.toParams(x => ignores.indexOf(x._name) < 0),
            "grant": info.has_create_id ? "{U}" : "{U}.lvl<1",
            "ret": {
                "no": 200,
                "data": this.toMock(),
            }
        }
        var data = [
            `export async function ${utils.camelCase(name)}(req: ExpressRequest, res: ExpressResponse) {`,
            `    // gparam "../../api/${dir}/${name}.json" --ts`,
            `    let body = req.body`,
            `    let user = req.session.user;`,
            `    if (body.id) {`,
            `        let data: db.${utils.CamelCase(this._name)} = Object.assign({`,
            info.has_update_at ? `            update_at: Date.now(),` : null,
            `        }, body)`,
            `        let sql = db.update('${this._name}', body).where({ id: body.id })`,
            info.has_create_id ? `        if (user.lvl > 0) sql.where({create_id: user.id})` : null,
            `        let pac = await sql`,
            `        return { n: pac.affectedRows }`,
            `    }`,
            `    let data: db.${utils.CamelCase(this._name)} = Object.assign({`,
            info.has_create_id ? `        create_id: user.id,` : null,
            info.has_create_at ? `        create_at: Date.now(),` : null,
            info.has_update_at ? `        update_at: Date.now(),` : null,
            `    }, body)`,
            `    data.id = await db.insert('${this._name}', data).id()`,
            `    return data`,
            `}`,
        ].filter(x => x);
        return { name, api, data }
    }
	/**
	 * 生成 del 接口
	 * @param dir 接口定义文件
	 * @param name 接口定义前缀
	 */
    toApiDel(dir: string, name?: string) {
        let tableName = this._comment || this._name
        name = name ? name + '_del' : 'del'
        let info = this.getApiInfo()
        let params: { [name: string]: GreenParam } = {};
        let pmap = this.getPrimary();
        for (let name in pmap) {
            let field = pmap[name]
            let v = field._param();
            v.lbl = tableName + v.lbl;
            v.need = true;
            params[name] = v;
        }
        var api = {
            "name": `删除${tableName}`,
            "method": "get",
            "params": params,
            "grant": info.has_create_id ? "{U}" : "{U}.lvl<1",
            "ret": {
                "no": 200,
                "data": {
                    "n": 1
                }
            }
        }
        var data = [
            `export async function ${utils.camelCase(name)}(req: ExpressRequest, res: ExpressResponse) {`,
            `    // gparam "../../api/${dir}/${name}.json" --ts`,
            `    let body = req.body`,
            `    let user = req.session.user;`,
            `    let sql = db.delete('${this._name}').where({ id: body.id })`,
            info.has_create_id ? `    if (user.lvl > 0) sql.where({create_id: user.id})` : null,
            `    let pac = await sql`,
            `    return { n: pac.affectedRows }`,
            `}`,
        ].filter(x => x);
        return { name, api, data }
    }
	/**
	 * 生成 list 接口
	 * @param dir 接口定义文件
	 * @param name 接口定义前缀
	 */
    toApiList(dir: string, name?: string) {
        let tableName = this._comment || this._name
        name = name ? name + '_list' : 'list'
        let info = this.getApiInfo()
        var api = {
            "name": `获取${tableName}`,
            "method": "get",
            "params": Object.assign(this.toQueryParams(), {
                "page": {
                    "lbl": "页码",
                    "type": "int",
                    "def": 0
                },
                "pageSize": {
                    "lbl": "分页大小",
                    "type": "int",
                    "range": [5, 50],
                    "def": 10
                },
                "sortBy": {
                    "lbl": "排序方式",
                    "enum": ["", "id"]
                },
                "desc": {
                    "lbl": "降序",
                    "type": "int",
                    "opts": ["升序", "降序"]
                }
            }),
            "grant": "{U}",
            "pretreat": info.has_create_id ? "if({U}.lvl<1){}.create_id={U}.id" : undefined,
            "ret": {
                "no": 200,
                "data": {
                    "total": 100,
                    "list": [this.toMock(), this.toMock()]
                }
            }
        }
        var querys = [];
        var fieldNames = []
        for (let field of this._fields) {
            if (field instanceof Field) {
                fieldNames.push(field._name);
                if (field._isRangeParam()) {
                    let CamelName = utils.CamelCase(field._name)
                    var n = 'min' + CamelName;
                    querys.push(`    if (body.${n} != null) {`);
                    querys.push(`        sql.where('${field._name}>=?', [body.${n}]);`);
                    querys.push(`    }`);
                    var n = 'max' + CamelName;
                    querys.push(`    if (body.${n} != null) {`);
                    querys.push(`        sql.where('${field._name}<=?', [body.${n}]);`);
                    querys.push(`    }`);
                } else if (/char/.test(field._type)) {
                    querys.push(`    if (body.${field._name} != null) {`);
                    querys.push(`        sql.where('${field._name} like ?', ['%'+body.${field._name}+'%']);`);
                    querys.push(`    }`);
                } else if (!/json|text/.test(field._type)) {
                    querys.push(`    if (body.${field._name} != null) {`);
                    querys.push(`        sql.where('${field._name}=?', [body.${field._name}]);`);
                    querys.push(`    }`);
                }
            }
        }
        var data = [
            `export async function ${utils.camelCase(name)}(req: ExpressRequest, res: ExpressResponse) {`,
            `    // gparam "../../api/${dir}/${name}.json" --ts`,
            `    let body = req.body`,
            `    let user = req.session.user;`,
            `    let sql = db.select('${this._name}','${fieldNames}');`,
            ...querys,
            `    if (body.sortBy) {`,
            `        if (body.desc) sql.orderBy(body.sortBy+" desc");`,
            `        else sql.orderBy(body.sortBy);`,
            `    }`,
            `    sql.limit(body.page * body.pageSize, body.pageSize);`,
            `    let data = await sql.page();`,
            `    return data`,
            `}`,
        ];
        return { name, api, data }
    }
	/**
	 * 从 show create table 字符串恢复成Table对象
	 */
    parse(str: string) {
        str = str.trim();
        let m = /CREATE TABLE (\S+) \(([\s\S]+)\)([^\)]+)/.exec(str);
        if (!m) return;
        this._name = m[1].replace(/`/g, "");
        let tail = m[3].trim();
        tail.replace(/ENGINE=(\w+)/, (x0, x1) => {
            this._engine = x1;
            return "";
        })
            .replace(/AUTO_INCREMENT=(\d+)/, (x0, x1) => {
                this._inc = x1;
                return "";
            })
            .replace(/DEFAULT CHARSET=(\w+)/, (x0, x1) => {
                this._charset = x1;
                return "";
            })
            .replace(/DEFAULT CHARACTER SET (\S+( COLLATE \S+)?)/, (x0, x1) => {
                this._charset = x1;
                return "";
            })
            .replace(/COMMENT='([\s\S]*)'/, (x0, x1) => {
                this._comment = x1.replace(/(?<!\\)\\'/g, "'");
                return "";
            });
        let lines = m[2]
            .split("\n")
            .map(x => x.trim())
            .filter(x => x);
        this._fields = lines.map(line => {
            if (line[0] == "`") return new Field().table(this._name).parse(line);
            return new Constraint().table(this._name).parse(line);
        });
        return this;
    }
	/**
	 * 升级数据库
	 * @param db
	 * @param run 是否执行
	 * @param drop 是否drop字段
	 */
    merge(db: IEngine, run?: boolean, drop?: boolean) {
        return db.execSQL(`show create table ${use(this._name)}`, [], { ignore: true }).then(
            rows => {
                let table = new Table().parse(rows[0]["Create Table"]);
                let sqls = [];
                let drops = [];
                // 记录添加和删除了哪些字段，从而智能判断重命名操作
                let adds = []; // [[idx:在sqls中的下标,-1代表不在sqls中, field: 字段]]
                let dels = [];
                for (let f1 of this._fields) {
                    let f0: Field | Constraint;
                    for (let i = table._fields.length - 1; i >= 0; i--) {
                        let f = table._fields[i];
                        if (f.constructor == f1.constructor && f1.eq(f as any)) {
                            f0 = f;
                            table._fields.splice(i, 1);
                            break;
                        }
                    }
                    if (f0) {
                        // 有同一个字段
                        if (!f1.equal(f0 as any))
                            // 如果字段发生改变
                            sqls.push(`alter table ${use(this._name)} modify column ${f1.toString()};`);
                    } else {
                        // 多了个字段
                        if (f1 instanceof Field) {
                            adds.push([sqls.length, f1]);
                            sqls.push(`alter table ${use(this._name)} add column ${f1.toString()};`);
                            if (f1._update) sqls.push(`update ${use(this._name)} set ${use(f1._name)}=${f1._update};`);
                        }
                        else sqls.push(`alter table ${use(this._name)} add ${f1.toString()};`);
                    }
                }
                for (let f of table._fields) {
                    if (f instanceof Field) {
                        dels.push([drop ? drops.length : -1, f]);
                        drop && drops.push(`alter table ${use(this._name)} drop column ${use(f._name)}`);
                    }
                    else if (f._type == "PRIMARY") drops.push(`alter table ${use(this._name)} drop PRIMARY KEY`);
                    else if (f._type == "FOREIGN") drops.push(`alter table ${use(this._name)} drop FOREIGN KEY ${use(f._name)}`);
                    else {
                        let ok = true;
                        for (let f1 of this._fields) {
                            if (f1 instanceof Constraint && compare(f1._field, f._field) && f1._type == "FOREIGN") {
                                ok = false;
                                break;
                            }
                        }
                        if (ok) drops.push(`alter table ${use(this._name)} drop INDEX ${use(f._name)}`);
                    }
                }
                if (adds.length && dels.length) {
                    for (let a of adds) {
                        let af: Field = a[1];
                        for (let i = 0; i < dels.length; i++) {
                            let b = dels[i];
                            let bf: Field = b[1];
                            if (af._type == bf._type && af._default == bf._default) {
                                dels.splice(i, 1)
                                if (b[0] >= 0) drops[b[0]] = ''
                                sqls[a[0]] = `alter table ${use(this._name)} change column ${use(bf._name)} ${af.toString()};`
                                break;
                            }
                        }
                    }
                }
                sqls = drops.filter(x => x).concat(sqls);
                if (run) return db.execSQL(sqls);
                return sqls;
            },
            err => {
                if (err.errno == 1146) {
                    // table 不存在
                    if (run) return db.execSQL(this.toString());
                    return [this.toString()];
                }
                return Promise.reject(err);
            }
        );
    }
}

export class TableBuilder {
    tables: { [key: string]: Table };
    constructor() {
        this.tables = {};
    }
    table(name: string, fields: Array<Field | Constraint>) {
        return (this.tables[name] = new Table(name, fields));
    }
    toString() {
        let tables = [];
        for (let k in this.tables) {
            let v = this.tables[k];
            tables.push(v.toString());
        }
        return tables.join("\n\n");
    }
	/**
	 * 升级数据库
	 * @param db
	 * @param run 是否执行
	 */
    merge(db: IEngine, run?: boolean) {
        let tables = [];
        for (let k in this.tables) {
            let v = this.tables[k];
            tables.push(v.merge(db).then(sqls => ({ name: k, sqls })));
        }
        return Promise.all(tables).then(tables => {
            let sqls = [];
            for (let item of tables) {
                console.log("-- 合并表格:", item.name);
                for (let sql of item.sqls) {
                    console.log(sql);
                    sqls.push(sql);
                }
            }
            return run ? db.execSQL(sqls) : sqls;
        });
    }
	/**
	 * 从数据库生成tables
	 * @param db
	 */
    init(db: IEngine) {
        return db.execSQL(`show tables`).then(rows => {
            return Promise.all(rows.map(x => {
                let name = Object.values(x)[0] as string;
                console.log(name)
                this.tables[name] = null;
                return db.execSQL(`show create table ${use(name)}`, [], { ignore: true }).then(rows => {
                    this.tables[name] = new Table().parse(rows[0]["Create Table"]);
                })
            }));
        });
    }
    // 字段
    field(name: string, type: string) {
        return new Field(name, type.toLowerCase());
    }
    varchar(name: string, len: number) {
        return this.field(name, `varchar(${len})`);
    }
    text(name: string) {
        return this.field(name, `text`);
    }
    json(name: string) {
        return this.field(name, `json`);
    }
    float(name: string) {
        return this.field(name, `float`);
    }
    int(name: string) {
        return this.field(name, `int`);
    }
    opts(name, items: string[]) {
        return this.field(name, `int`).opts(items);
    }
    bigint(name: string) {
        return this.field(name, `bigint`);
    }
    unsigned(name: string) {
        return this.field(name, `int unsigned`);
    }
    // 约束
    constraint(type: string, field: string) {
        return new Constraint(type.toUpperCase(), field);
    }
    primary(field: string) {
        return this.constraint("primary", field);
    }
    index(field: string) {
        return this.constraint("", field);
    }
    unique(field: string) {
        return this.constraint("unique", field);
    }
    foreign(field: string) {
        return this.constraint("foreign", field);
    }
    fulltext(field: string) {
        return this.constraint("fulltext", field);
    }
}
