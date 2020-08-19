import { arr, val, Where, Engine, IEngine, PoolEngine, ConnEngine, ExecSqlOptions, ISql, Paged, SelectSql, InsertOrUpdate, instanceOfSql, InsertSql } from "./core";
import { PoolConfig as MysqlPoolConfig } from "mysql";
import { PoolConfig as PostgresqlPoolConfig } from "pg";
import { SchemaBuilder, Table, TableChange, Field, Constraint, TableBuilder } from "./schema";
import { CamelCase, camelCase } from "./utils";
declare function createPool(url: string | "mysql" | "sqlite" | "postgresql", config?: string | MysqlPoolConfig | PostgresqlPoolConfig): Engine;
export { arr, val, Where, IEngine, PoolEngine, ConnEngine, ExecSqlOptions, ISql, Paged, SelectSql, InsertSql, InsertOrUpdate, instanceOfSql, createPool, Table, Field, Engine, Constraint, TableChange, TableBuilder, SchemaBuilder, CamelCase, camelCase, };
