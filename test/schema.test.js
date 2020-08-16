"use strict";
const greendb = require("../dist/index");
const assert = require("assert");

function defineTables() {
	let sb = new greendb.SchemaBuilder();
	sb.table("school", [sb.unsigned("schID").comment("学校ID"), sb.varchar("name", 32).default("").comment("学校名字"), sb.primary("schID")]);
	sb.table("c", [
		sb.unsigned("cID").notNull().comment("班级ID"),
		sb.unsigned("schID").notNull().comment("学校ID"),
		sb.unsigned("pcID").comment("父班级ID"),
		sb.varchar("name", 32).default("").comment("班级名字"),
		sb.primary("schID,cID"),
		sb.foreign("schID").references("school", "schID"),
		sb.index("cID"),
	]);
	sb.table("s", [
		sb.unsigned("id").notNull().auto_increment().comment("id"),
		sb.unsigned("schID").notNull().comment("学校ID"),
		sb.unsigned("cID").notNull().comment("班级ID"),
		sb.varchar("name", 32).default("").comment("学生名字"),
		sb.varchar("no", 32).comment("学号"),
		sb.float("score").default(0).comment("得分"),
		sb.json("ext").comment("其它数据"),
		sb.bigint("create_at").comment("创建时间"),
		sb.primary("id"),
		sb.unique("no"),
		sb.unique("name"),
		sb.index("cID"),
	]);
	return sb;
}

const merges = {
	school: [`alter table school `],
};

function defineTables2() {
	let sb = new greendb.SchemaBuilder();
	sb.table("school", [sb.unsigned("schID").comment("学校ID"), sb.varchar("name", 32).default("").comment("学校"), sb.primary("schID"), sb.unique("name")]);
	sb.table("c", [
		sb.unsigned("cID").notNull().comment("班级ID"),
		sb.unsigned("schID").notNull().comment("学校ID"),
		sb.unsigned("pcID").comment("父班级ID"),
		sb.varchar("name", 32).default("").comment("班级名字"),
		sb.primary("schID,cID"),
		sb.foreign("schID").references("school", "schID"),
		sb.unique("cID"),
	]);
	sb.table("s", [
		sb.unsigned("id").notNull().auto_increment().comment("id"),
		sb.unsigned("schID").notNull().comment("学校ID"),
		sb.unsigned("cID").notNull().comment("班级ID"),
		sb.varchar("name", 32).default("").comment("学生名字"),
		sb.varchar("no1", 32).comment("学号"),
		sb.float("score").default(0).comment("得分"),
		sb.json("ext0").comment("其它数据0"),
		sb.json("ext1").comment("其它数据1").update("if(id>1,'[1]','[2]')"),
		sb.bigint("create_at").comment("创建时间"),
		sb.primary("id"),
		sb.unique("no1"),
		sb.unique("name"),
		sb.foreign("schID,cID").references("c", "schID,cID"),
	]);
	sb.table("course", [sb.unsigned("id").notNull().auto_increment().comment("id"), sb.varchar("name", 32).notNull().comment("课程名称"), sb.primary("id")]);
	return sb;
}

/**
 * @param {greendb.Engine} db
 */
async function test(db) {
	// db.setLogger(console);
	let sb = defineTables();
	for (let item of sb.tables.reverse()) {
		await db.execSQL(`drop table if exists ${db.quotes(item.name)}`);
	}
	let sqls = [].concat(...sb.mapTable((x) => db.createTable(x)));
	await db.execSQL(sqls);
	let tables = await db.getTables();
	sb = new greendb.SchemaBuilder().add(tables.filter((x) => /^(school|s|c)$/.test(x.name)));
	let sqls2 = [].concat(...sb.mapTable((x) => db.createTable(x)));
	assert.deepEqual(sqls2.sort(), sqls.sort());

	let sb2 = defineTables2();
	sqls = [].concat(...sb2.mapTable((x) => db.createTable(x)));
	await sb2.sync(db, true);
	tables = await db.getTables();
	sb = new greendb.SchemaBuilder().add(tables);
	sqls2 = [].concat(...sb.mapTable((x) => db.createTable(x)));
	assert.deepEqual(sqls2.sort(), sqls.sort());
	await db.end();
}

describe("greendb schema test", () => {
	it("mysql", () => {
		var db = greendb.createPool("mysql", {
			user: "root",
			password: "123456",
			host: "127.0.0.1",
			database: "test",
			port: 3306,
			connectionLimit: 50,
			supportBigNumbers: false,
			bigNumberStrings: false,
			charset: "utf8mb4",
		});
		return test(db);
	});
	it("sqlite3", () => {
		// return;
		var db = greendb.createPool("sqlite3", "a.db");
		return test(db);
	});
	it("postgresql", () => {
		// return;
		var db = greendb.createPool("postgresql", {
			host: "192.168.191.10",
			user: "postgres",
			password: "123456",
			database: "test",
		});
		return test(db);
	});
});
