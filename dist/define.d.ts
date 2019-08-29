interface GreenParam {
    lbl?: string;
    rem?: string;
    need?: boolean | string | string[];
    def?: any;
    reg?: string;
    type?: "int" | "float" | "number" | "json" | "array" | "str" | "file";
    enum?: Array<any>;
    opts?: Array<any>;
    len?: [number, number] | number;
    range?: [number, number] | number;
}
import { IEngine } from "./sqlbuilder";
export declare class Field {
    _name: string;
    _type: string;
    _table: string;
    _default: string;
    _comment: string;
    _charset: string;
    _null: boolean;
    _inc: boolean;
    _opts: string[];
    _mocks: any[];
    _update: string;
    constructor(name?: string, type?: string);
    table(table: string): this;
    notNull(): this;
    auto_increment(): this;
    default(def: any): this;
    charset(charset: string): this;
    comment(comment: string): this;
    opts(items: string[]): this;
    mock(items: any[]): this;
    update(v: string): this;
    toString(): string;
    /**
     * @param primary_keys 主键列表, 如果不传，则不会生成need:primary_keys
     */
    _param(primary_keys?: string[]): GreenParam;
    /**
     * @param primary_keys 主键列表, 如果不传，则不会生成need:primary_keys
     */
    toParam(primary_keys: string[]): {
        [key: string]: GreenParam;
    };
    _isRangeParam(): boolean;
    toQueryParam(): {
        [key: string]: GreenParam;
    };
    toMock(): any;
    toTypescript(): string;
    toDart(): string;
    parse(str: string): this;
    eq(b: Field): boolean;
    equal(b: Field): boolean;
}
export declare class Constraint {
    _type: string;
    _field: string;
    _name: string;
    _ref_table: string;
    _ref_field: string;
    private _table;
    constructor(type?: string, field?: string, table?: string);
    name(name?: string): this;
    table(table: string): this;
    references(table: string, field: string): this;
    toString(): string;
    parse(str: string): this;
    eq(b: Constraint): boolean;
    equal(b: Constraint): boolean;
}
export declare class Table {
    _name: string;
    _fields: Array<Field | Constraint>;
    _comment: string;
    _engine: "innodb" | "myisam";
    _charset: string;
    _inc: number;
    readonly name: string;
    /**
     * @param {string} name
     * @param {Array<Field|Constraint>} fields
     */
    constructor(name?: string, fields?: Array<Field | Constraint>);
    comment(comment: string): this;
    engine(engine: "innodb" | "myisam"): this;
    charset(charset: string): this;
    auto_increment(n: number): this;
    toString(): string;
    toParams(filter?: (_: Field) => boolean): {
        [key: string]: GreenParam;
    };
    toQueryParams(filter?: (_: Field) => boolean): {
        [key: string]: GreenParam;
    };
    toMock(): {
        [key: string]: any;
    };
    toTypescript(): string;
    toDart(): string;
    getPrimary(): {
        [name: string]: Field;
    };
    getApiInfo(): {
        has_create_id: boolean;
        has_create_at: boolean;
        has_update_at: boolean;
    };
    /**
     * 生成 add 接口
     * @param dir 接口定义文件
     * @param name 接口定义前缀
     */
    toApiAdd(dir: string, name?: string): {
        name: string;
        api: {
            "name": string;
            "method": string;
            "params": {
                [key: string]: GreenParam;
            };
            "grant": string;
            "ret": {
                "no": number;
                "data": {
                    [key: string]: any;
                };
            };
        };
        data: string[];
    };
    /**
     * 生成 del 接口
     * @param dir 接口定义文件
     * @param name 接口定义前缀
     */
    toApiDel(dir: string, name?: string): {
        name: string;
        api: {
            "name": string;
            "method": string;
            "params": {
                [name: string]: GreenParam;
            };
            "grant": string;
            "ret": {
                "no": number;
                "data": {
                    "n": number;
                };
            };
        };
        data: string[];
    };
    /**
     * 生成 list 接口
     * @param dir 接口定义文件
     * @param name 接口定义前缀
     */
    toApiList(dir: string, name?: string): {
        name: string;
        api: {
            "name": string;
            "method": string;
            "params": {
                [key: string]: GreenParam;
            } & {
                "page": {
                    "lbl": string;
                    "type": string;
                    "def": number;
                };
                "pageSize": {
                    "lbl": string;
                    "type": string;
                    "range": number[];
                    "def": number;
                };
                "sortBy": {
                    "lbl": string;
                    "enum": string[];
                };
                "desc": {
                    "lbl": string;
                    "type": string;
                    "opts": string[];
                };
            };
            "grant": string;
            "pretreat": string;
            "ret": {
                "no": number;
                "data": {
                    "total": number;
                    "list": {
                        [key: string]: any;
                    }[];
                };
            };
        };
        data: any[];
    };
    /**
     * 从 show create table 字符串恢复成Table对象
     */
    parse(str: string): this;
    /**
     * 升级数据库
     * @param db
     * @param run 是否执行
     * @param drop 是否drop字段
     */
    merge(db: IEngine, run?: boolean, drop?: boolean): Promise<any>;
}
export declare class TableBuilder {
    tables: {
        [key: string]: Table;
    };
    constructor();
    table(name: string, fields: Array<Field | Constraint>): Table;
    toString(): string;
    /**
     * 升级数据库
     * @param db
     * @param run 是否执行
     */
    merge(db: IEngine, run?: boolean): Promise<any>;
    /**
     * 从数据库生成tables
     * @param db
     */
    init(db: IEngine): Promise<[unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown]>;
    field(name: string, type: string): Field;
    varchar(name: string, len: number): Field;
    text(name: string): Field;
    json(name: string): Field;
    float(name: string): Field;
    int(name: string): Field;
    opts(name: any, items: string[]): Field;
    bigint(name: string): Field;
    unsigned(name: string): Field;
    constraint(type: string, field: string): Constraint;
    primary(field: string): Constraint;
    index(field: string): Constraint;
    unique(field: string): Constraint;
    foreign(field: string): Constraint;
    fulltext(field: string): Constraint;
}
export {};
