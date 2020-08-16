import {arr, val, Where, Engine, IEngine, PoolEngine, ConnEngine, ExecSqlOptions, ISql, Paged, SelectSql, InsertOrUpdate, instanceOfSql, InsertSql} from "./core";
import {PoolConfig as MysqlPoolConfig} from "mysql";
import {PoolConfig as PostgresqlPoolConfig} from "pg";
import {SchemaBuilder, Table, TableChange, Field, Constraint, TableBuilder} from "./schema";

function createPool(url: string | "mysql" | "sqlite" | "postgresql", config?: string | MysqlPoolConfig | PostgresqlPoolConfig): Engine {
	if (!config) config = url;
	let s = url.toLowerCase();
	let mod;
	if (s.startsWith("mysql")) {
		mod = require("./engines/mysql");
	} else if (s.startsWith("sqlite")) {
		mod = require("./engines/sqlite");
	} else if (s.startsWith("postgresql")) {
		mod = require("./engines/postgresql");
	}
	if (mod) return new mod(config);
}

export {
	arr,
	val,
	Where,
	IEngine,
	PoolEngine,
	ConnEngine,
	ExecSqlOptions,
	ISql,
	Paged,
	SelectSql,
	InsertSql,
	InsertOrUpdate,
	instanceOfSql,
	createPool,
	Table,
	Field,
	Engine,
	Constraint,
	TableChange,
	TableBuilder,
	SchemaBuilder,
};
