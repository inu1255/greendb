import { Pool, PoolConfig, PoolClient } from "pg";
import { ConnEngine, ISql, InsertSql, SelectSql, InsertOrUpdate, Table } from "..";
import { Field } from "../schema";
declare class PgSelectSql<T> extends SelectSql<T> {
    limit(offset: number, size: number): this;
}
declare const _default: {
    new (...args: any[]): {
        runSql(s: ISql): Promise<any>;
        select<T = any>(table: string, keys?: string | string[]): PgSelectSql<T>;
        getTables(db?: string, nspname?: string): Promise<Table[]>;
        fieldType(type: string): string;
        fieldSql(field: Field): string;
        createTable(table: Table): any[];
        migration(newTable: Table, oldTable: Table): string[];
        quotes(key: string): string;
        sqlval(v: any): string;
        execSQL(sqls: string | ISql | (string | ISql)[], args?: any[], ctx?: import("..").ExecSqlOptions): Promise<any>;
    };
} & {
    new (config: PoolConfig | string): {
        pool: Pool;
        getConnEngine(): {
            runSql(s: ISql): Promise<any>;
            select<T_1 = any>(table: string, keys?: string | string[]): PgSelectSql<T_1>;
            getTables(db?: string, nspname?: string): Promise<Table[]>;
            fieldType(type: string): string;
            fieldSql(field: Field): string;
            createTable(table: Table): any[];
            migration(newTable: Table, oldTable: Table): string[];
            quotes(key: string): string;
            sqlval(v: any): string;
            execSQL(sqls: string | ISql | (string | ISql)[], args?: any[], ctx?: import("..").ExecSqlOptions): Promise<any>;
        } & {
            conn: PoolClient;
            beginTransaction(): Promise<any>;
            commit(): Promise<any>;
            rollback(): Promise<any>;
            queryAsync(sql: string, args?: any[]): Promise<any>;
            end(): Promise<any>;
            SingleSQL(sql: string, args?: any[], opts?: import("..").ExecSqlOptions): Promise<any>;
            execSQL(sqls: string | ISql | (string | ISql)[], args?: any[], opts?: import("..").ExecSqlOptions): Promise<any>;
            withTransaction(fn: (db: import("..").Engine) => Promise<any>): any;
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
            select<T_2 = any>(table: string, keys?: string | string[]): SelectSql<T_2>;
            insert(table: string, data: any): InsertSql<any>;
            update(table: string, data: any): import("../core").UpdateSql<any>;
            delete(table: string): import("../core").DeleteSql<any>;
            insertOrUpdate(table: string, data: any, keys?: string[]): InsertOrUpdate<any>;
            insertNotExist(table: string, data: any): import("../core").InsertNotExist<any>;
        };
        newConn(): Promise<ConnEngine>;
        end(): Promise<void>;
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
        select<T_3 = any>(table: string, keys?: string | string[]): SelectSql<T_3>;
        insert(table: string, data: any): InsertSql<any>;
        update(table: string, data: any): import("../core").UpdateSql<any>;
        delete(table: string): import("../core").DeleteSql<any>;
        insertOrUpdate(table: string, data: any, keys?: string[]): InsertOrUpdate<any>;
        insertNotExist(table: string, data: any): import("../core").InsertNotExist<any>;
    };
};
export = _default;
