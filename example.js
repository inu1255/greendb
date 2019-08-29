const greendb = require('./dist');

const db = greendb.createBuilder({})

// 插入数据,允许插入多个数据(数组)或单个数据(对象)
let users = [
	{ id:1, name: '张三', age: 18, sex: 'girl' },
	{ id:2, name: '李四', age: 88, sex: 'boy' },
]
var insert_sql = db.insert('user', users)
console.log(insert_sql.sql, insert_sql.args)
// insert into user (name,age,sex) values(?,?,?),(?,?,?) [ '张三', 18, 'girl', '李四', 88, 'boy' ]

// 更新数据
var update_sql = db.update('user', {name: '王麻子'}).where({id: 3});
console.log(update_sql.sql, update_sql.args)
// update user set name=? where  ( (id=?)) [ '王麻子', 3 ]

// 一个简单的查询
var sql = db.select('user').where('id', 1).where('login_at', null);
console.log(sql.sql, sql.args)
// select * from user where  (id=?) and (login_at is null) [ 1 ]

// where一个对象
var sql = db.select('user').where({
	age: 18,
	sex: "girl",
});
console.log(sql.sql, sql.args)
// select * from user where  ( (age=?) and (sex=?)) [ 18, 'girl' ]

// select指定字段并带有order by和limit
var sql = db.select('user', 'id uid,name').orderBy('age,id desc').limit(10, 20);
console.log(sql.sql, sql.args)
// select id uid,name from user order by age,id desc limit 10,20 []

// where(sql, args) 的详细用法
var sql = db.select('user')
// sql不带问号时,相当于 sql=?, args不是数组时，相当于 [args]
sql.where('id', 1)
sql.where('id', [1]) // 与上一句效果一样 
sql.where('id=?', [1]) // 与上一句效果一样 
// sql.where 实际是 db.where 的简化写法
sql.where('id in ?', [ [1, 2, 3] ])
sql.where(db.where('id in ?', [ [1, 2, 3] ])) // 与上句效果一样
sql.where('id in ?', [1, 2, 3] ) // 不能这样写
// 如果参数是一个对象，相当于对每一个键值对调用 sql.where
sql.where({
	age: 18,
	sex: "girl",
	"name like ?": "张%"
})
sql.where(`age=? and sex=? and name like ?`, [18, "girl", "张%"]) // 与上句效果一样
// 需要用 or 连接两个条件时，用orWhere, 
// 注意不管是where还是orWhere前面的条件不会被括号括起来, 如果要括起来, 需使用build
// 如: 原本是 (a=1) or (b=2)  在 sql.where('c=3') 后变成 (a=1) or (b=2) and (c=3)
//                          在 sql.build().where('c=3') 后变成 ((a=1) or (b=2)) and (c=3)
sql.orWhere(db.where('isadmin').and('login_at>?', [0]))
// 特别的,如果第二个参数 === null 时会变成 age is null
sql.where('age', null);
console.log(sql.sql, sql.args)

async function test () {
	// 使用自带的mysql接口
	const db = greendb.createPool({
		user:'root',
		password:'123456',
		host:'127.0.0.1',
		database:'greendb',
		port: 3306,
		connectionLimit: 50,
		supportBigNumbers: false,
		bigNumberStrings: false,
		charset: "utf8mb4"
	});
	// 自己实现
	const db = greendb.createBuilder({
		/**
		 * 执行单条sql
		 * @param {string|{sql:string,args:any[]}} sql 
		 * @param {any[]} [args] 
		 * @returns {Promise<any>}
		 */
		SingleSQL(sql, args){},
		/**
		 * 执行单条/多条sql, 返回每条sql的结果
		 * @param {string|{sql:string,args:any[]}|(string|{sql:string,args:any[]})[]} sqls 
		 * @param {any[]} [args] 
		 * @returns {Promise<any|any[]>}
		 */
		execSQL(sqls, args){},
		// 关闭连接池
		/**
		 * @returns {Promise<any>}
		 */
		end(){}
	})
	
	// 插入数据,并获取插入后的id
	let user = { name: '张三', age: 18, sex: 'girl' }
	var id = await db.insert('user', user).id()

	// 更新数据
	await db.update('user', {name: '王麻子'}).where({id: 3});

	// 分页
	var {list, total} = await db.select('user', 'id uid,name').orderBy('age,id desc').limit(10, 20).page()

	// 如果不存在则插入数据
	await db.insertNotExist('user', user).where({name: '张三'})

	// 如果主键/唯一键不重复则插入，否则更新数据;  不指定keys则更新所有字段
	await db.insertOrUpdate('user', user, ['name', 'age', 'sex'])

	// 如果没有满足条件的数据则插入，否则更新数据
	await db.insertOrUpdate('user', user).where({age: 18})
}