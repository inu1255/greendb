import * as greendb from '.';
import * as mysql from "mysql";
import { fromCallback } from "universalify";

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

export class MysqlEngine implements greendb.IEngine {
    private pool: mysql.Pool;
    private log: Logger;
    visiable: boolean;
    constructor(config: string | mysql.PoolConfig, log?: Logger, visiable?: boolean) {
        this.pool = mysql.createPool(config);
        this.log = log || console;
        this.visiable = visiable;
        this.getConn().then(conn => {
            let coMysql = conn.constructor.prototype;
            this.extendsConn(coMysql);
            conn.release();
        }, err => {
            this.log.error("create mysql pool error:", err);
        });
    }
    protected extendsConn(conn: mysql.PoolConnection) {
        let that = this
        conn.beginTransaction = fromCallback(conn.beginTransaction);
        conn.commit = fromCallback(conn.commit);
        conn.rollback = fromCallback(conn.rollback);
        conn.end = fromCallback(conn.end);
        conn.queryAsync = function(sql: string, args?: Array<any>, ignore?: boolean) {
            return new Promise((resolve, reject) => {
                this.query(sql, args, function(err, rows) {
                    if (err) {
                        if (!ignore && that.visiable != false) that.log.error(sql, args || "", err);
                        reject(err);
                    } else {
                        if (!ignore && that.visiable === true) that.log.debug(sql, args || "");
                        resolve(rows);
                    }
                });
            });
        };
        conn.SingleSQL = function(sql: greendb.ISql | string, args?: Array<any>, ignore?: boolean): Promise<any> {
            if (!sql) return null;
            if (greendb.instanceOfSql(sql)) return this.queryAsync(sql.sql, sql.args || args, ignore);
            return this.queryAsync(sql, args, ignore);
        };
        conn.execSQL = function(sqls: greendb.ISql | string | Array<greendb.ISql | string>, args?: Array<any>, ctx?: ExecOption): Promise<any> {
            let db = this;
            if (args instanceof Array) {
                ctx = ctx || {};
                args = args || [];
            } else {
                ctx = args || {};
                args = [];
            }
            let autoTrans = ctx.transaction == null ? sqls instanceof Array && sqls.length > 1 : ctx.transaction;
            let ignore = ctx.ignore;
            let pms = Promise.resolve();
            if (autoTrans) pms = pms.then(() => db.beginTransaction());
            let out = [];
            for (let sql of greendb.arr(sqls)) {
                pms = pms.then(() => db.SingleSQL(sql, args, ignore).then(x => out.push(x)));
            }
            if (autoTrans) pms = pms.then(rows => db.commit().then(() => rows), err => db.rollback().then(() => Promise.reject(err)));
            return pms.then(() => (out.length > 1 ? out : out[0]));
        };
    }

    end() {
        return new Promise((resolve, reject) => this.pool.end(err => (err ? reject(err) : resolve())));
    }

    getConn(): Promise<mysql.PoolConnection> {
        return new Promise((resolve, reject) => {
            this.pool.getConnection((err, conn) => {
                if (err) {
                    this.log.error("can't connect to DB: " + err.toString());
                    reject(err);
                } else {
                    if (!conn.SingleSQL) {
                        let coMysql = conn.constructor.prototype;
                        this.extendsConn(coMysql);
                    }
                    resolve(conn);
                }
            });
        });
    }

    SingleSQL(sql: greendb.ISql | string, args?: Array<any>, ignore?: boolean): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getConn().then(conn => {
                conn.SingleSQL(sql, args).then(
                    rows => {
                        conn.release();
                        resolve(rows);
                    },
                    err => {
                        conn.release();
                        reject(err);
                    }
                );
            }, reject);
        });
    }

    execSQL(sqls: string | greendb.ISql | Array<string | greendb.ISql>, args?: Array<any>, ctx?: ExecOption): Promise<any> {
        if (sqls instanceof Array) {
            sqls = sqls.filter(x => x)
        }
        return new Promise((resolve, reject) => {
            this.getConn().then(conn => {
                conn.execSQL(sqls as string, args, ctx).then(
                    rows => {
                        conn.release();
                        resolve(rows);
                    },
                    err => {
                        conn.release();
                        reject(err);
                    }
                );
            }, reject);
        });
    }

	/**
	 * 在一个事务中执行
	 */
    withTransaction(fn: { (db: greendb.IEngine): Promise<any> }) {
        return this.getConn().then(function(conn) {
            return conn
                .beginTransaction()
                .then(_ => {
                    return fn(greendb.createBuilder(conn));
                })
                .then(
                    function(ret) {
                        return conn.commit().then(_ => {
                            conn.release();
                            return Promise.resolve(ret);
                        });
                    },
                    function(err) {
                        return conn.rollback().then(_ => {
                            conn.release();
                            return Promise.reject(err);
                        });
                    }
                );
        });
    }
}

export function createPool(config: string | mysql.PoolConfig, log?: Logger, visiable?: boolean) {
    return greendb.createBuilder(new MysqlEngine(config, log, visiable));
}
