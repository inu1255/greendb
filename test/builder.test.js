"use strict";
const expect = require("chai").expect;
const greendb = require("../dist/index");

describe("greendb builder test", () => {
	it("camelCase", () => {
		var result = greendb.CamelCase("foo_bar");
		expect(result).to.equal("FooBar");
		var result = greendb.camelCase("foo_bar");
		expect(result).to.equal("fooBar");
	});
	it("sql builder", () => {
		const db = greendb.createPool("mysql");

		// 插入数据,允许插入多个数据(数组)或单个数据(对象)
		let users = [
			{id: 1, name: "张三", age: 18, sex: "girl"},
			{id: 2, name: "李四", age: 88, sex: "boy"},
		];
		var insert_sql = db.insert("user", users);
		expect(insert_sql.sql).to.equal("insert into `user` (id,name,age,sex) values(?,?,?,?),(?,?,?,?)");
		expect(insert_sql.args).to.eql([1, "张三", 18, "girl", 2, "李四", 88, "boy"]);

		// 更新数据
		var update_sql = db.update("user", {name: "王麻子"}).where({id: 3});
		expect(update_sql.sql).to.equal("update `user` set name=? where  ( (id=?))");
		expect(update_sql.args).to.eql(["王麻子", 3]);

		// 一个简单的查询
		var sql = db.select("user").where("id", 1).where("login_at", null);
		expect(sql.sql).to.equal("select * from `user` where  (id=?) and (login_at is null)");
		expect(sql.args).to.eql([1]);

		// where一个对象
		var sql = db.select("user").where({
			age: 18,
			sex: "girl",
		});
		expect(sql.sql).to.equal("select * from `user` where  ( (age=?) and (sex=?))");
		expect(sql.args).to.eql([18, "girl"]);

		// select指定字段并带有order by和limit
		var sql = db.select("user", "id uid,name").orderBy("age,id desc").limit(10, 20);
		expect(sql.sql).to.equal("select id uid,name from `user` order by age,id desc limit 10,20");
		expect(sql.args).to.eql([]);

		// where(sql, args) 的详细用法
		var sql = db.select("user");
		// sql不带问号时,相当于 sql=?, args不是数组时，相当于 [args]
		sql.where("id", 1);
		sql.where("id", [1]); // 与上一句效果一样
		sql.where("id=?", [1]); // 与上一句效果一样
		// sql.where 实际是 db.where 的简化写法
		sql.where("id in ?", [[1, 2, 3]]);
		sql.where(db.where("id in ?", [[1, 2, 3]])); // 与上句效果一样
		sql.where("id in ?", [1, 2, 3]); // 不能这样写
		// 如果参数是一个对象，相当于对每一个键值对调用 sql.where
		sql.where({
			age: 18,
			sex: "girl",
			"name like ?": "张%",
		});
		sql.where(`age=? and sex=? and name like ?`, [18, "girl", "张%"]); // 与上句效果一样
		// 需要用 or 连接两个条件时，用orWhere,
		// 注意不管是where还是orWhere前面的条件不会被括号括起来, 如果要括起来, 需使用build
		// 如: 原本是 (a=1) or (b=2)  在 sql.where('c=3') 后变成 (a=1) or (b=2) and (c=3)
		//                          在 sql.build().where('c=3') 后变成 ((a=1) or (b=2)) and (c=3)
		sql.orWhere(db.where("isadmin").and("login_at>?", [0]));
		// 特别的,如果第二个参数 === null 时会变成 age is null
		sql.where("age", null);
		expect(sql.sql).to.equal(
			"select * from `user` where  (id=?) and (id=?) and (id=?) and (id in ?) and (id in ?) and (id in ?) and ( (age=?) and (sex=?) and (name like ?)) and (age=? and sex=? and name like ?) or (isadmin and (login_at>?)) and (age is null)"
		);
		expect(sql.args).to.eql([1, 1, 1, [1, 2, 3], [1, 2, 3], 1, 2, 3, 18, "girl", "张%", 18, "girl", "张%", 0]);
	});
});
