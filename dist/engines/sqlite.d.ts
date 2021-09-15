import { Database } from "sqlite3";
import { ConnEngine, InsertOrUpdate, ISql, InsertSql, Table } from "..";
import { Field } from "../schema";
declare module "sqlite3" {
    interface Database {
        end(): Promise<any>;
    }
}
declare const _default: {
    new (...args: any[]): {
        quotes(key: string): string;
        runSql(s: ISql): Promise<any>;
        parse(sql: string): Promise<Table>;
        getTables(): Promise<Table[]>;
        fieldSql(field: Field): string;
        createTable(table: Table): string[];
        migration(newTable: Table, oldTable: Table): string[];
        sqlval(v: any): string;
        execSQL(sqls: string | ISql | (string | ISql)[], args?: any[], ctx?: import("..").ExecSqlOptions): Promise<any>;
    };
} & {
    new (name: string): {
        _filename: string;
        pools: Database[];
        getConnEngine(): ConnEngine;
        newConn(): Promise<ConnEngine>;
        end(): Promise<any>;
        withConn(fn: (conn: ConnEngine) => Promise<any>): Promise<any>;
        execSQL(sqls: string | ISql | (string | ISql)[], args?: any[], opts?: import("..").ExecSqlOptions): Promise<any>;
        withTransaction(fn: (db: import("..").Engine) => Promise<any>): Promise<any>;
        getTables(): Promise<Table[]>;
        createTable(table: Table): string[];
        migration(newTable: Table, oldTable: Table): string[];
        quotes(key: string): string;
        runSql(s: import("../core").Sql): Promise<import("..").Paged<any>>;
        log: import("../core").Logger;
        sqlval(v: any): string;
        setLogger(log?: import("../core").Logger): any;
        r(sql: string, args?: any): import("../core").Raw;
        where(key: string | {
            [key: string]: any;
        }, value?: any): import("..").Where;
        select<T = any>(table: string, keys?: string | string[]): import("..").SelectSql<T>;
        insert(table: string, data: any): InsertSql<any>;
        update(table: string, data: any): import("../core").UpdateSql<any>;
        delete(table: string): import("../core").DeleteSql<any>;
        insertOrUpdate(table: string, data: any, keys?: string[]): InsertOrUpdate<any>;
        insertNotExist(table: string, data: any): import("../core").InsertNotExist<any>;
    };
};
export = _default;
