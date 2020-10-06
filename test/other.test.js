const assert = require("assert");

function compare(n, fns) {
	let list = [];
	for (let i = 0; i < fns.length; i++) {
		let arr = fns[i];
		if (!(arr instanceof Array)) arr = [arr];
		let min = Infinity;
		for (let fn of arr) {
			let beg = Date.now();
			for (let j = 0; j < n; j++) {
				fn();
			}
			let dt = Date.now() - beg;
			if (dt < min) min = dt;
		}
		list.push(min);
	}
	console.log(list);
	return list;
}

describe("other test", () => {
	it("compare or regex", () => {
		let list = compare(10000000, [
			function () {
				if ("abcdefghi".toUpperCase() == "ABCDEFGHI");
			},
			function () {
				if (/^abcdefghi$/i.test("ABCDEFGHI"));
			},
		]);
		assert(list.reduce((a, b) => ({ok: a.ok && a.prev < b, prev: b}), {ok: true, prev: 0}).ok, "运行效率顺序出错");
	});
	it("new Array", () => {
		let list = compare(100000, [
			function () {
				var a = [];
				a.length = 100;
				for (let i = 0; i < 100; i++) {
					a[i] = i;
				}
			},
			function () {
				var a = [];
				for (let i = 0; i < 100; i++) {
					a[i] = i;
				}
			},
			function () {
				var a = [];
				for (let i = 0; i < 100; i++) {
					a.push(i);
				}
			},
			function () {
				var a = Array.from({length: 100});
				for (let i = 0; i < 100; i++) {
					a[i] = i;
				}
			},
		]);
		assert(list.reduce((a, b) => ({ok: a.ok && a.prev < b, prev: b}), {ok: true, prev: 0}).ok, "运行效率顺序出错");
	});
	it("Array to String", () => {
		var a = [];
		a.length = 100;
		for (let i = 0; i < 100; i++) {
			a[i] = i;
		}
		let list = compare(100000, [
			function () {
				a.join("");
			},
			[
				function () {
					a.toString();
				},
				function () {
					a + "";
				},
			],
		]);
		assert(list.reduce((a, b) => ({ok: a.ok && a.prev < b, prev: b}), {ok: true, prev: 0}).ok, "运行效率顺序出错");
	});
	it("replace or map", () => {
		var a = "abc , ccc , ccc , ccc , ccc , bcd , ccc , ccc , ccc , ccc , ccc , ccc";
		let list = compare(1000000, [
			function () {
				a.split(",").map((x) => x.trim());
			},
			function () {
				a.replace(/\s+/g, "").split(",");
			},
		]);
		assert(list.reduce((a, b) => ({ok: a.ok && a.prev < b, prev: b}), {ok: true, prev: 0}).ok, "运行效率顺序出错");
	});
	it("replace string or regex", () => {
		var a = "abc,ccc,ccc,ccc,ccc,bcd,ccc,ccc,ccc,ccc,ccc,ccc";
		let list = compare(1000000, [
			function () {
				a.replace("bcd", "");
			},
			function () {
				a.replace(/bcd/, "");
			},
		]);
		assert(list.reduce((a, b) => ({ok: a.ok && a.prev < b, prev: b}), {ok: true, prev: 0}).ok, "运行效率顺序出错");
	});
	it("replace multi", () => {
		var a = "abc,ccc,ccc,ccc,ccc,bcd,ccc,ccc,ccc,ccc,ccc,ccc";
		let list = compare(1000000, [
			function () {
				a.replace(/bcd|BCD|acc/, "");
			},
			function () {
				a.replace("BCD", "").replace("bcd", "").replace("acc", "");
			},
			function () {
				a.replace(/bcd/, "").replace(/BCD/, "").replace(/acc/, "");
			},
		]);
		assert(list.reduce((a, b) => ({ok: a.ok && a.prev < b, prev: b}), {ok: true, prev: 0}).ok, "运行效率顺序出错");
	});
	it("replace dot or replace seq", () => {
		var a = "abc,ccc,ccc,ccc,ccc,bcd,ccc,ccc,ccc,ccc,ccc,ccc";
		let list = compare(1000000, [
			function () {
				a.replace("BCD", "").replace("bcd", "");
			},
			function () {
				a.replace("BCD", "");
				a.replace("bcd", "");
			},
		]);
		assert(list.reduce((a, b) => ({ok: a.ok && a.prev < b, prev: b}), {ok: true, prev: 0}).ok, "运行效率顺序出错");
	});
	it("replace or spliit", () => {
		var a = "abc,ccc,ccc,ccc,ccc,bcd,ccc,ccc,ccc,ccc,ccc,ccc";
		let list = compare(1000000, [
			function () {
				var n = 0;
				var ss = a.split(",");
				var s = ss[1];
				for (let i = 1; i < ss.length; i++) {
					s += n++ + ss[i];
				}
			},
			function () {
				var n = 0;
				a.replace(/,/g, "?");
			},
			function () {
				var n = 0;
				a.replace(/,/g, (x) => n++);
			},
		]);
		assert(list.reduce((a, b) => ({ok: a.ok && a.prev < b, prev: b}), {ok: true, prev: 0}).ok, "运行效率顺序出错");
	});
	it("indexOf+slice or spliit", () => {
		var a = "abc,ccc,ccc,ccc,ccc,bcd,ccc,ccc,ccc,ccc,ccc,ccc";
		let list = compare(1000000, [
			function () {
				var idx = a.indexOf("bcd");
				if (idx >= 0) a.slice(0, idx);
			},
			function () {
				a.split("bcd")[0];
			},
		]);
		assert(list.reduce((a, b) => ({ok: a.ok && a.prev < b, prev: b}), {ok: true, prev: 0}).ok, "运行效率顺序出错");
	});
	it("parse on or parse all", () => {
		var s1 = "";
		for (let i = 0; i < 100; i++) {
			s1 += `[1,2,"3,4",[1,2,""],5,${i}]\n`;
		}
		var s2 = "";
		for (let i = 0; i < 100; i++) {
			s2 += `[1,2,"3,4",[1,2,""],5,${i}],\n`;
		}
		var s3 = "";
		for (let i = 0; i < 100; i++) {
			s3 += `\n,[1,2,"3,4",[1,2,""],5,${i}]`;
		}
		let list = compare(10000, [
			function () {
				let list = JSON.parse("[" + s2.slice(0, -2) + "]");
			},
			function () {
				let list = JSON.parse("[" + s3.slice(2) + "]");
			},
			function () {
				let list = JSON.parse("[" + s2.slice(0, -2) + "]");
			},
			function () {
				let list = JSON.parse("[" + s3.slice(2) + "]");
			},
			function () {
				let list = [];
				for (let line of s1.split("\n")) {
					if (line) list.push(JSON.parse(line));
				}
			},
		]);
		assert(list.reduce((a, b) => ({ok: a.ok && a.prev < b, prev: b}), {ok: true, prev: 0}).ok, "运行效率顺序出错");
	});

	it("get today", () => {
		let list = compare(10000, [
			function () {
				new Date(Math.floor(Date.now() / 86400e3) * 86400e3 - 28800e3).getTime();
			},
			function () {
				var now = Date.now();
				new Date(now - (now % 86400e3) - 28800e3).getTime();
			},
			function () {
				new Date(new Date().toLocaleDateString()).getTime();
			},
		]);
		assert(list.reduce((a, b) => ({ok: a.ok && a.prev < b, prev: b}), {ok: true, prev: 0}).ok, "运行效率顺序出错");
	});
	new Date(new Date().toLocaleDateString()).getTime();
});
