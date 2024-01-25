import { Base } from "./mixins";
import { Table } from ".";
/**
 * 把v转换为mysql可以接收的参数，把对象转换成json字符串
 * @param {any} v 值
 * @returns {String}
 */
export declare function val(v: any): string;
/**
 * 如果args为undefined则返回 def||[]
 * 如果args是一个Array则返回自己
 * 如果不是则返回[args]
 * @param {any} args
 * @param {Array} [def] 默认值
 * @returns {Array}
 */
export declare function arr<T>(args: T | T[], def?: T[]): T[];
export interface Paged<T> {
    [key: string]: any;
    total: number;
    list: T[];
}
export interface ISql {
    sql: string;
    args: any[];
    ignore_log?: boolean;
    pack?(x: any): any;
}
interface CloneAble {
    clone(): this;
}
export interface ExecSqlOptions {
    [key: string]: any;
    transaction?: boolean;
    ignore?: boolean;
}
export interface IEngine {
    /** DQL/DML需要 */
    quotes(key: string): string;
    sqlval(v: any): string;
    runSql(s: ISql): Promise<any>;
    execSQL(sqls: Array<ISql | string> | ISql | string, args?: any[], ctx?: ExecSqlOptions): Promise<any>;
    /** DDL需要 */
    getTables(): Promise<Table[]>;
    createTable(table: Table): string[];
    migration(newTable: Table, oldTable: Table): string[];
}
export declare class Raw implements ISql, CloneAble {
    ["constructor"]: typeof Raw;
    protected _sql: string;
    protected _args: any[];
    constructor(sql?: string, args?: any);
    get sql(): string;
    get args(): any[];
    /**
     * 用args替换sql中的?并返回字符串
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
declare const Sql_base: {
    new (...args: any[]): {
        [Symbol.toStringTag]: string;
        $$pms: Promise<any>;
        _e: IEngine;
        ignore_log?: boolean;
        quiet(): any;
        engine(e: IEngine): any;
        run(): Promise<any>;
        $pms(): Promise<any>;
        then<TResult1 = any, TResult2 = never>(onfulfilled?: (value: any) => TResult1 | PromiseLike<TResult1>, onrejected?: (reason: any) => TResult2 | PromiseLike<TResult2>): Promise<TResult1 | TResult2>;
        catch<TResult = never>(onrejected?: (reason: any) => TResult | PromiseLike<TResult>): Promise<any>;
        finally(onfinally?: () => void): Promise<any>;
    };
} & {
    new (...args: any[]): {
        _table: string;
        table(table: string): any;
    };
} & typeof Raw;
export declare class Sql extends Sql_base {
    constructor(table: string);
    quotes(key: string): string;
}
declare const SqlWhere_base: {
    new (...args: any[]): {
        _where: Where;
        where(key: string | Where | {
            [key: string]: any;
        }, value?: any): any;
        orWhere(key: string | Where | {
            [key: string]: any;
        }, value?: any): any;
        build(): any;
    };
} & typeof Sql;
declare class SqlWhere<T> extends SqlWhere_base implements Promise<T> {
    constructor(table: string);
    get sql(): string;
    get args(): any[];
}
export declare class InsertSql<T = any> extends Sql implements Promise<T> {
    protected _id: boolean;
    protected _ignore: string;
    private _data;
    constructor(table: string, data: any);
    engine(e: IEngine): this;
    get sql(): string;
    pack(rows: any): any;
    id(): this;
    returnId(): boolean;
    ignore(): this;
}
export declare class SelectSql<T = any> extends SqlWhere<T> {
    protected _page: boolean;
    protected _keys: string[];
    protected _count: boolean;
    protected _order: string;
    protected _limit: string;
    protected _first: boolean;
    protected _exclude: string[];
    constructor(table: string, keys?: string | string[]);
    get sql(): string;
    /**
     * @param {String} [key]
     */
    count(key?: string): this;
    orderBy(key: string): this;
    limit(offset: number, size: number): this;
    first(): this;
    page(): Promise<Paged<T>>;
    isPage(): boolean;
    pack(rows: any[]): any;
    exclude(keys: string[]): PromiseLike<any>;
}
export declare class UpdateSql<T = any> extends SqlWhere<T> {
    private _data;
    constructor(table: string, data: any);
    engine(e: IEngine): this;
    get sql(): string;
    run(): Promise<any>;
}
export declare class DeleteSql<T = any> extends SqlWhere<T> {
    constructor(table: string);
    run(): Promise<any>;
}
declare const InsertNotExist_base: {
    new (...args: any[]): {
        _where: Where;
        where(key: string | Where | {
            [key: string]: any;
        }, value?: any): any;
        orWhere(key: string | Where | {
            [key: string]: any;
        }, value?: any): any;
        build(): any;
    };
} & {
    new (...args: any[]): {
        _table: string;
        table(table: string): any;
    };
} & {
    new (...args: any[]): {
        [Symbol.toStringTag]: string;
        $$pms: Promise<any>;
        _e: IEngine;
        ignore_log?: boolean;
        quiet(): any;
        engine(e: IEngine): any;
        run(): Promise<any>;
        $pms(): Promise<any>;
        then<TResult1 = any, TResult2 = never>(onfulfilled?: (value: any) => TResult1 | PromiseLike<TResult1>, onrejected?: (reason: any) => TResult2 | PromiseLike<TResult2>): Promise<TResult1 | TResult2>;
        catch<TResult = never>(onrejected?: (reason: any) => TResult | PromiseLike<TResult>): Promise<any>;
        finally(onfinally?: () => void): Promise<any>;
    };
} & typeof Base;
export declare class InsertNotExist<T = any> extends InsertNotExist_base implements Promise<T> {
    protected _id: boolean;
    protected _data: any;
    constructor(table: string, data: any);
    selectSql(): SelectSql<any>;
    insertSql(): InsertSql<any>;
    id(): this;
    returnId(): boolean;
}
declare const InsertOrUpdate_base: {
    new (...args: any[]): {
        _where: Where;
        where(key: string | Where | {
            [key: string]: any;
        }, value?: any): any;
        orWhere(key: string | Where | {
            [key: string]: any;
        }, value?: any): any;
        build(): any;
    };
} & {
    new (...args: any[]): {
        _table: string;
        table(table: string): any;
    };
} & {
    new (...args: any[]): {
        [Symbol.toStringTag]: string;
        $$pms: Promise<any>;
        _e: IEngine;
        ignore_log?: boolean;
        quiet(): any;
        engine(e: IEngine): any;
        run(): Promise<any>;
        $pms(): Promise<any>;
        then<TResult1 = any, TResult2 = never>(onfulfilled?: (value: any) => TResult1 | PromiseLike<TResult1>, onrejected?: (reason: any) => TResult2 | PromiseLike<TResult2>): Promise<TResult1 | TResult2>;
        catch<TResult = never>(onrejected?: (reason: any) => TResult | PromiseLike<TResult>): Promise<any>;
        finally(onfinally?: () => void): Promise<any>;
    };
} & typeof Base;
export declare class InsertOrUpdate<T = any> extends InsertOrUpdate_base implements Promise<T> {
    protected _id: boolean;
    protected _insertData: any;
    protected _updateData: any;
    protected _insert: InsertSql<T>;
    constructor(table: string, data: any, keys?: string[]);
    get(k: string): any;
    insertSql(): InsertSql<T>;
    updateSql(): UpdateSql<any>;
    selectSql(): SelectSql<any>;
    wrapSet(): Raw;
    hasWhere(): boolean;
    id(): InsertSql<T>;
}
export declare function instanceOfSql(sql: any): sql is ISql;
export interface Logger {
    debug(message?: any, ...optionalParams: any[]): void;
    info(message?: any, ...optionalParams: any[]): void;
    error(message?: any, ...optionalParams: any[]): void;
}
export declare abstract class EngineConfig {
}
export declare abstract class Engine implements IEngine {
    abstract execSQL(sqls: ISql | string | Array<ISql | string>, args?: Array<any>, opts?: ExecSqlOptions): Promise<any>;
    abstract withTransaction(fn: {
        (db: Engine): Promise<any>;
    }): Promise<any>;
    abstract end(): Promise<any>;
    getTables(): Promise<Table[]>;
    createTable(table: Table): string[];
    migration(newTable: Table, oldTable: Table): string[];
    quotes(key: string): string;
    runSql(s: Sql): Promise<Paged<any>>;
    protected log: Logger;
    constructor();
    sqlval(v: any): string;
    setLogger(log?: Logger): this;
    r(sql: string, args?: any): Raw;
    where(key: string | {
        [key: string]: any;
    }, value?: any): Where;
    select<T = any>(table: string, keys?: string | string[]): SelectSql<T>;
    insert(table: string, data: any): InsertSql<any>;
    update(table: string, data: any): UpdateSql<any>;
    delete(table: string): DeleteSql<any>;
    insertOrUpdate(table: string, data: any, keys?: string[]): InsertOrUpdate<any>;
    insertNotExist(table: string, data: any): InsertNotExist<any>;
}
export declare abstract class ConnEngine extends Engine {
    abstract beginTransaction(): Promise<any>;
    abstract commit(): Promise<any>;
    abstract rollback(): Promise<any>;
    abstract queryAsync(sql: string, args?: Array<any>, opts?: ExecSqlOptions): Promise<any>;
    private SingleSQL;
    execSQL(sqls: ISql | string | Array<ISql | string>, args?: Array<any>, opts?: ExecSqlOptions): Promise<any>;
    withTransaction(fn: {
        (db: Engine): Promise<any>;
    }): any;
}
export declare abstract class PoolEngine extends Engine {
    abstract newConn(): Promise<ConnEngine>;
    private withConn;
    execSQL(sqls: ISql | string | Array<ISql | string>, args?: Array<any>, opts?: ExecSqlOptions): Promise<any>;
    withTransaction(fn: {
        (db: Engine): Promise<any>;
    }): Promise<any>;
}
export {};
