import * as greendb from '.';
import * as mysql from "mysql";
declare module "mysql" {
    interface PoolConnection extends greendb.IEngine {
        beginTransaction(): Promise<any>;
        commit(): Promise<any>;
        rollback(): Promise<any>;
        end(): Promise<any>;
        queryAsync(sql: string, args?: Array<any>, ignore?: boolean): Promise<any>;
    }
}
interface ExecOption extends greendb.IEngineOptions {
    ignore?: boolean;
}
interface Logger {
    debug(message?: any, ...optionalParams: any[]): void;
    info(message?: any, ...optionalParams: any[]): void;
    error(message?: any, ...optionalParams: any[]): void;
}
export declare class MysqlEngine implements greendb.IEngine {
    private pool;
    private log;
    visiable: boolean;
    constructor(config: string | mysql.PoolConfig, log?: Logger, visiable?: boolean);
    protected extendsConn(conn: mysql.PoolConnection): void;
    end(): Promise<unknown>;
    getConn(): Promise<mysql.PoolConnection>;
    SingleSQL(sql: greendb.ISql | string, args?: Array<any>, ignore?: boolean): Promise<any>;
    execSQL(sqls: string | greendb.ISql | Array<string | greendb.ISql>, args?: Array<any>, ctx?: ExecOption): Promise<any>;
    /**
     * 在一个事务中执行
     */
    withTransaction(fn: {
        (db: greendb.IEngine): Promise<any>;
    }): Promise<any>;
}
export declare function createPool(config: string | mysql.PoolConfig, log?: Logger, visiable?: boolean): greendb.MysqlEngine & {
    r(sql: string, args?: any): import("./sqlbuilder").Raw;
    where: (key: string | {
        [key: string]: any;
    }, value?: any) => import("./sqlbuilder").Where;
    select(table: string, keys?: string | string[]): greendb.SelectSql<any>;
    insert(table: string, data: any): import("./sqlbuilder").InsertSql<any>;
    update(table: string, data: any): import("./sqlbuilder").UpdateSql<any>;
    delete(table: string): import("./sqlbuilder").DeleteSql<any>;
    insertOrUpdate(table: string, data: any, keys?: string[]): import("./sqlbuilder").InsertOrUpdate<any>;
    insertNotExist(table: string, data: any): import("./sqlbuilder").InsertNotExist<any>;
};
export {};
