import { PoolConnection, Pool, PoolConfig } from "mysql";
import { ExecSqlOptions, ConnEngine, SelectSql, InsertOrUpdate, ISql, InsertSql, Table, Field, Constraint } from "..";
declare module "mysql" {
    interface PoolConnection {
        beginTransaction(): Promise<any>;
        commit(): Promise<any>;
        rollback(): Promise<any>;
        queryAsync(sql: string, args?: Array<any>, opts?: ExecSqlOptions): Promise<any>;
    }
}
declare const _default: {
    new (...args: any[]): {
        quotes(key: string): string;
        runSql(s: ISql): Promise<any>;
        getTables(db?: string): Promise<Table[]>;
        fieldSql(field: Field): string;
        constraintSql(constraint: Constraint): string;
        createTable(table: Table): string[];
        migration(newTable: Table, oldTable: Table): string[];
        sqlval(v: any): string;
        execSQL(sqls: string | ISql | (string | ISql)[], args?: any[], ctx?: ExecSqlOptions): Promise<any>;
    };
} & {
    new (config: string | PoolConfig): {
        pool: Pool;
        getConnEngine(): {
            quotes(key: string): string;
            runSql(s: ISql): Promise<any>;
            getTables(db?: string): Promise<Table[]>;
            fieldSql(field: Field): string;
            constraintSql(constraint: Constraint): string;
            createTable(table: Table): string[];
            migration(newTable: Table, oldTable: Table): string[];
            sqlval(v: any): string;
            execSQL(sqls: string | ISql | (string | ISql)[], args?: any[], ctx?: ExecSqlOptions): Promise<any>;
        } & {
            conn: PoolConnection;
            beginTransaction(): Promise<any>;
            commit(): Promise<any>;
            rollback(): Promise<any>;
            queryAsync(sql: string, args?: any[], opts?: ExecSqlOptions): Promise<any>;
            end(): Promise<any>;
            SingleSQL(sql: string, args?: any[], opts?: ExecSqlOptions): Promise<any>;
            execSQL(sqls: string | ISql | (string | ISql)[], args?: any[], opts?: ExecSqlOptions): Promise<any>;
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
            select<T = any>(table: string, keys?: string | string[]): SelectSql<T>;
            insert(table: string, data: any): InsertSql<any>;
            update(table: string, data: any): import("../core").UpdateSql<any>;
            delete(table: string): import("../core").DeleteSql<any>;
            insertOrUpdate(table: string, data: any, keys?: string[]): InsertOrUpdate<any>;
            insertNotExist(table: string, data: any): import("../core").InsertNotExist<any>;
        };
        newConn(): Promise<ConnEngine>;
        end(): Promise<unknown>;
        withConn(fn: (conn: ConnEngine) => Promise<any>): Promise<any>;
        execSQL(sqls: string | ISql | (string | ISql)[], args?: any[], opts?: ExecSqlOptions): Promise<any>;
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
        select<T_1 = any>(table: string, keys?: string | string[]): SelectSql<T_1>;
        insert(table: string, data: any): InsertSql<any>;
        update(table: string, data: any): import("../core").UpdateSql<any>;
        delete(table: string): import("../core").DeleteSql<any>;
        insertOrUpdate(table: string, data: any, keys?: string[]): InsertOrUpdate<any>;
        insertNotExist(table: string, data: any): import("../core").InsertNotExist<any>;
    };
};
export = _default;
