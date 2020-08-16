"use strict";
const expect = require("chai").expect;
const greendb = require("../dist/index");

/**
 *
 * @param {greendb.Engine} db
 */
async function engineTest(db, create) {
	await db.execSQL(`drop table if exists ` + db.quotes("user"));
	await db.execSQL(
		create ||
			`create table if not exists ${db.quotes(
				"user"
			)}(id int unsigned auto_increment,no int,no1 int,name varchar(32),age int,sex varchar(32),primary key (id),unique(no,no1))`
	);
	// 插入数据,并获取插入后的id
	let user = {name: "张三", no: 1, no1: 1, age: 18, sex: "girl"};
	var id = await db.insert("user", user).id();
	expect(id).to.be.eq(1);
	await db.insert("user", [
		{name: "李四", no: 2, no1: 2, age: 20, sex: "boy"},
		{name: "", no: 3, no1: 3, age: 20, sex: "girl"},
	]);

	// 更新数据
	await db.update("user", {name: "王麻子"}).where({id: 3});

	// 分页
	var {list, total} = await db.select("user", "id uid,name").orderBy("age,id desc").limit(1, 2).page();
	expect(total).to.be.eq(3);
	expect(list[0].name).to.be.eq("王麻子");
	expect(list[1].uid).to.be.eq(2);

	// 如果不存在则插入数据
	await db.insertNotExist("user", {name: "赵5", no: 4, no1: 4, age: 30, sex: "boy"}).where({name: "赵5"});
	await db.insertNotExist("user", {name: "赵5", no: 4, no1: 4, age: 30, sex: "boy"}).where({name: "赵5"});
	await db.insertNotExist("user", {name: "赵5", no: 4, no1: 4, age: 30, sex: "boy"});
	var count = await db.select("user").where("name", "赵5").count("id");
	expect(count).to.be.eq(1);

	list[0].sex = "none";
	// 如果主键/唯一键不重复则插入，否则更新数据;  不指定keys则更新所有字段
	await db.insertOrUpdate("user", {id: 2, no: 2, no1: 2, sex: "none"}, ["sex"]);
	await db.insertOrUpdate("user", {id: 3, sex: "wmz"}, ["sex"]);
	await db.insertOrUpdate("user", {no: 4, no1: 4, sex: "z5"}, ["sex"]);
	await db.insertOrUpdate("user", {id: 2, sex: "null"}, ["sex"]).where({sex: "none"});

	// 如果没有满足条件的数据则插入，否则更新数据
	user.name = "张三三";
	await db.insertOrUpdate("user", user).where({age: 18});

	let rows = await db.select("user").orderBy("age,id desc");
	expect(rows).to.be.eql([
		{id: 1, name: "张三三", no: 1, no1: 1, age: 18, sex: "girl"},
		{id: 3, name: "王麻子", no: 3, no1: 3, age: 20, sex: "wmz"},
		{id: 2, name: "李四", no: 2, no1: 2, age: 20, sex: "null"},
		{id: 4, name: "赵5", no: 4, no1: 4, age: 30, sex: "z5"},
	]);
	if (db.pools) expect(db.pools.length).to.be.eq(0);
	await db.end();
}

describe("greendb query test", () => {
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
		return engineTest(db);
	});
	it("sqlite3", () => {
		var db = greendb.createPool("sqlite3", "a.db");
		return engineTest(db, `create table if not exists user(id integer primary key autoincrement,no int,no1 int,name varchar(32),age int,sex varchar(32),unique(no,no1))`);
	});
	it("postgresql", () => {
		var db = greendb.createPool("postgresql", {
			host: "192.168.191.10",
			user: "postgres",
			password: "123456",
			database: "test",
		});
		return engineTest(db, `create table if not exists "user"(id serial4,no int,no1 int,name varchar(32),age int,sex varchar(32),primary key (id),unique(no,no1))`);
	});
});
