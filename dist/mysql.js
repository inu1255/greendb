"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const greendb = require(".");
const mysql = require("mysql");
const universalify_1 = require("universalify");
class MysqlEngine {
    constructor(config, log, visiable) {
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
    extendsConn(conn) {
        conn.beginTransaction = universalify_1.fromCallback(conn.beginTransaction);
        conn.commit = universalify_1.fromCallback(conn.commit);
        conn.rollback = universalify_1.fromCallback(conn.rollback);
        conn.end = universalify_1.fromCallback(conn.end);
        conn.queryAsync = function (sql, args, ignore) {
            return new Promise((resolve, reject) => {
                this.query(sql, args, function (err, rows) {
                    if (err) {
                        if (!ignore && this.visiable != false)
                            this.log.error(sql, args || "", err);
                        reject(err);
                    }
                    else {
                        if (!ignore && this.visiable === true)
                            this.log.debug(sql, args || "");
                        resolve(rows);
                    }
                });
            });
        };
        conn.SingleSQL = function (sql, args, ignore) {
            if (!sql)
                return null;
            if (greendb.instanceOfSql(sql))
                return this.queryAsync(sql.sql, sql.args || args, ignore);
            return this.queryAsync(sql, args, ignore);
        };
        conn.execSQL = function (sqls, args, ctx) {
            let db = this;
            if (args instanceof Array) {
                ctx = ctx || {};
                args = args || [];
            }
            else {
                ctx = args || {};
                args = [];
            }
            let autoTrans = ctx.transaction == null ? sqls instanceof Array && sqls.length > 1 : ctx.transaction;
            let ignore = ctx.ignore;
            let pms = Promise.resolve();
            if (autoTrans)
                pms = pms.then(() => db.beginTransaction());
            let out = [];
            for (let sql of greendb.arr(sqls)) {
                pms = pms.then(() => db.SingleSQL(sql, args, ignore).then(x => out.push(x)));
            }
            if (autoTrans)
                pms = pms.then(rows => db.commit().then(() => rows), err => db.rollback().then(() => Promise.reject(err)));
            return pms.then(() => (out.length > 1 ? out : out[0]));
        };
    }
    end() {
        return new Promise((resolve, reject) => this.pool.end(err => (err ? reject(err) : resolve())));
    }
    getConn() {
        return new Promise((resolve, reject) => {
            this.pool.getConnection((err, conn) => {
                if (err) {
                    this.log.error("can't connect to DB: " + err.toString());
                    reject(err);
                }
                else {
                    if (!conn.SingleSQL) {
                        let coMysql = conn.constructor.prototype;
                        this.extendsConn(coMysql);
                    }
                    resolve(conn);
                }
            });
        });
    }
    SingleSQL(sql, args, ignore) {
        return new Promise((resolve, reject) => {
            this.getConn().then(conn => {
                conn.SingleSQL(sql, args).then(rows => {
                    conn.release();
                    resolve(rows);
                }, err => {
                    conn.release();
                    reject(err);
                });
            }, reject);
        });
    }
    execSQL(sqls, args, ctx) {
        if (sqls instanceof Array) {
            sqls = sqls.filter(x => x);
        }
        return new Promise((resolve, reject) => {
            this.getConn().then(conn => {
                conn.execSQL(sqls, args, ctx).then(rows => {
                    conn.release();
                    resolve(rows);
                }, err => {
                    conn.release();
                    reject(err);
                });
            }, reject);
        });
    }
    /**
     * 在一个事务中执行
     */
    withTransaction(fn) {
        return this.getConn().then(function (conn) {
            return conn
                .beginTransaction()
                .then(_ => {
                return fn(greendb.createBuilder(conn));
            })
                .then(function (ret) {
                return conn.commit().then(_ => {
                    conn.release();
                    return Promise.resolve(ret);
                });
            }, function (err) {
                return conn.rollback().then(_ => {
                    conn.release();
                    return Promise.reject(err);
                });
            });
        });
    }
}
exports.MysqlEngine = MysqlEngine;
function createPool(config, log, visiable) {
    return greendb.createBuilder(new MysqlEngine(config, log, visiable));
}
exports.createPool = createPool;
