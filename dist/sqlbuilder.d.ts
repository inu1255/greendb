export interface Paged<T> {
    [key: string]: any;
    total: number;
    list: T[];
}
export interface ISql {
    sql: string;
    args: string[];
}
interface CloneAble {
    clone(): this;
}
export interface IEngineOptions {
    [key: string]: any;
    transaction?: boolean;
}
export interface IEngine {
    SingleSQL(s: ISql | string, args?: Array<any>): Promise<any>;
    execSQL(sqls: Array<ISql | string> | ISql | string, args?: any[], ctx?: IEngineOptions): Promise<any>;
    end(): Promise<any>;
}
export declare class Raw implements ISql, CloneAble {
    ["constructor"]: typeof Raw;
    protected _sql: string;
    protected _args: any[];
    constructor(sql?: string, args?: any);
    readonly sql: string;
    readonly args: any[];
    /**
     * 将用args替换sql中的?并返回字符串
     * @returns {string}
     */
    toString(): string;
    load(b: ISql): void;
    clone(): this;
    /**
     * 添加参数
     * @param b 参数
     */
    push(b: ISql): this;
    /**
     * @param b
     */
    concat(b: ISql): this;
}
/**
 * 用于构建sql的where语句
 */
export declare class Where extends Raw {
    clone(): this;
    isEmpty(): boolean;
    toWhere(): string;
    /**
     * 加括号，将foo=? and bar=?变成(foo=? and bar=?)
     * 之后调用and/or时，会变成(foo=? and bar=?) and/or baz=?
     */
    build(): this;
    /**
     * 使用op拼接两个where语句，wb会加括号
     * foo=? or bar=? 使用and拼接 baz=? or qux=? 变成 foo=? or bar=? and (baz=? or qux=?)
     * 可以先调用build再拼接 变成 (foo=? or bar=?) and (baz=? or qux=?)
     * @param {String} op and/or
     * @param {Where} wb 另一个where语句
     */
    add(op: string, wb: Where): this;
    /**
     * 参见 where 和 this.concat
     * @param {Where|String|Array|Object} key
     * @param {String} op
     * @param {any} value
     */
    and(key: string | {
        [key: string]: any;
    } | Where, value: any): this;
    /**
     * 参见 where 和 this.concat
     * @param {Where|String|Array|Object} key
     * @param {String} op
     * @param {any} value
     */
    or(key: string | {
        [key: string]: any;
    } | Where, value: any): this;
}
declare class Sql<T> extends Raw implements Promise<T> {
    [Symbol.toStringTag]: string;
    protected _table: string;
    protected _e: IEngine;
    protected $$pms: Promise<T>;
    constructor(table: string);
    engine(e: IEngine): this;
    pms(): Promise<any>;
    $pms(): Promise<any>;
    then<TResult1 = T, TResult2 = never>(onfulfilled?: (value: T) => TResult1 | PromiseLike<TResult1>, onrejected?: (reason: any) => TResult2 | PromiseLike<TResult2>): Promise<TResult1 | TResult2>;
    catch<TResult = never>(onrejected?: (reason: any) => TResult | PromiseLike<TResult>): Promise<T | TResult>;
    finally(onfinally?: () => void): Promise<T>;
    table(table: string): this;
}
declare class SqlWhere<T> extends Sql<T> {
    protected _where: Where;
    constructor(table: string);
    readonly sql: string;
    readonly args: any[];
    where(key: string | Where | {
        [key: string]: any;
    }, value?: any): this;
    orWhere(key: string | Where | {
        [key: string]: any;
    }, value?: any): this;
    build(): this;
}
export declare class InsertSql<T = any> extends Sql<T> {
    protected _id: boolean;
    protected _ignore: string;
    constructor(table: string, data: any);
    readonly sql: string;
    pms(): Promise<any>;
    id(): this;
    ignore(): this;
}
export declare class SelectSql<T = any> extends SqlWhere<T> {
    protected _page: boolean;
    protected _keys: string[];
    protected _count: boolean;
    protected _order: string;
    protected _limit: string;
    protected _first: boolean;
    constructor(table: string, keys?: string | string[]);
    readonly sql: string;
    /**
     * @param {String} [key]
     */
    count(key?: string): this;
    orderBy(key: string): this;
    limit(offset: number, size: number): this;
    first(): this;
    page(): Promise<Paged<T>>;
    pms(): Promise<any>;
    exclude(keys: string[]): PromiseLike<any>;
}
export declare class UpdateSql<T = any> extends SqlWhere<T> {
    constructor(table: string, data: any);
    readonly sql: string;
    pms(): Promise<any>;
}
export declare class DeleteSql<T = any> extends SqlWhere<T> {
    constructor(table: string);
    pms(): Promise<any>;
}
export declare class InsertNotExist<T = any> extends SqlWhere<T> {
    protected _id: boolean;
    protected _data: any;
    protected _keys: string[];
    constructor(table: string, data: any);
    readonly sql: string;
    pms(): Promise<any>;
    id(): this;
}
export declare class InsertOrUpdate<T = any> extends SqlWhere<T> {
    protected _id: boolean;
    protected _data: any;
    protected _keys: string[];
    protected _insert: InsertSql<T>;
    constructor(table: string, data: any, keys?: string[]);
    id(): this;
    pms(): Promise<any>;
    toString(): string;
    readonly sql: string;
    readonly args: any[];
}
/**
 * 生成一个WhereBuilder
 * where("name","admin")
 * where("name like ?","adm%")
 * where({"name":"admin"})
 * @param key
 * @param value
 */
declare function where(key: string | {
    [key: string]: any;
}, value?: any): Where;
export declare function instanceOfSql(sql: any): sql is ISql;
export declare function createBuilder<T extends IEngine>(e: T): T & {
    r(sql: string, args?: any): Raw;
    where: typeof where;
    select<T_1 = any>(table: string, keys?: string | string[]): SelectSql<T_1>;
    insert(table: string, data: any): InsertSql<any>;
    update(table: string, data: any): UpdateSql<any>;
    delete(table: string): DeleteSql<any>;
    insertOrUpdate(table: string, data: any, keys?: string[]): InsertOrUpdate<any>;
    insertNotExist(table: string, data: any): InsertNotExist<any>;
};
export {};
