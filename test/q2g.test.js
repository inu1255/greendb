"use strict";
const greendb = require("../dist/index");
const assert = require("assert");

function defineTables() {
	let df = new greendb.SchemaBuilder();

	// 用户表
	df.table("user", [
		df.unsigned("id").notNull().auto_increment(),
		df.varchar("account", 64).comment("账号"),
		df.varchar("email", 64).comment("邮箱"),
		df.varchar("tel", 11).comment("手机号"),
		df.varchar("passwd", 32).comment("密码"),
		df.varchar("name", 32).charset("utf8mb4").comment("用户名"),
		df.varchar("avatar", 1024).comment("头像"),
		df.varchar("profile", 255).comment("简介"),
		df.opts("sex", ["未知", "男", "女"]).default(0).comment("性别:0-未知 1-男 2:女"),
		df.bigint("birth_at").default(0).comment("生日"),
		df.int("lvl").default(100).comment("权限"),
		df.int("money").default(0).comment("总币数"),
		df.int("mCost").default(0).comment("已使用币数"),
		df.float("rmb").default(0).comment("总返利"),
		df.float("rmbCost").default(0).comment("已提现钱数"),
		df.unsigned("invite_id").default(0).comment("邀请人"),
		df.opts("invite_rmb", ["未完成首单送现金", "已完成首单送现金"]).default(0).comment("是否已送邀请人现金").update("1"),
		df.bigint("create_at").notNull().comment("注册时间"),
		df.bigint("login_at").comment("最近登录时间"),
		df.varchar("unionid", 64).comment("微信唯一ID"),
		df.varchar("province", 32).comment("省份"),
		df.varchar("city", 32).comment("城市"),
		df.varchar("country", 32).comment("国家"),
		df.primary("id"),
		df.unique("account"),
		df.unique("email"),
		df.unique("tel"),
		df.unique("unionid"),
	]).auto_increment(1024);

	// 验证码表
	df.table("verify", [
		df.unsigned("id").notNull().auto_increment(),
		df.varchar("title", 64).comment("验证码标识"),
		df.varchar("code", 16).comment("验证码"),
		df.int("rest").default("10").comment("剩余次数"),
		df.bigint("update_at").notNull().default(0).comment("更新时间"),
		df.primary("id"),
	]);

	// 文件表
	df.table("file", [
		df.unsigned("id").notNull().auto_increment(),
		df.unsigned("create_id").comment("上传者"),
		df.varchar("ip", 64).comment("上传图片的IP"),
		df.varchar("ua", 256).default("").comment("客户端信息"),
		df.varchar("name", 256).comment("文件名"),
		df.varchar("ext", 32).comment("文件后缀名"),
		df.bigint("create_at").notNull().comment("上传时间"),
		df.primary("id"),
		df.foreign("create_id").references("user", "id"),
	]);

	df.table("notice", [
		df.unsigned("id").notNull().auto_increment(),
		df.varchar("title", 32).notNull().comment("通知标题"),
		df.text("content").notNull().comment("通知内容"),
		df.bigint("create_at").notNull().comment("创建时间"),
		df.primary("id"),
	]).comment("通知公告");

	df.table("material", [
		df.unsigned("id").notNull().auto_increment(),
		df.bigint("item_id").notNull().comment("商品ID"),
		df.unsigned("level_one_category_id").comment("一级类目ID 如: 21"),
		df.varchar("level_one_category_name", 32).comment("一级类目名称 如: 居家日用"),
		df.unsigned("category_id").comment("叶子类目id 如: 50025847"),
		df.varchar("category_name", 32).comment("叶子类目名称 如: 居家鞋"),
		df.float("commission_rate").comment("佣金比率(%) 如: 9.0"),
		df.varchar("coupon_share_url", 1024).comment("推广链接"),
		df.varchar("coupon_word", 128).comment("推广淘口令"),
		df.int("coupon_remain_count").comment("优惠券剩余量 如: 74000"),
		df.int("coupon_total_count").comment("券总量 如: 100000"),
		df.float("coupon_start_fee").comment("如: 19.0"),
		df.int("coupon_amount").notNull().comment("券面额(元) 如: 5"),
		df.varchar("activity_id", 32).comment("券ID: 24e329b18d7f42f488bbd080fc0b1ae2| 京东: planId"),
		df.bigint("coupon_start_time").comment("如: 1550678400000"),
		df.bigint("coupon_end_time").comment("如: 1550937599000"),
		df.varchar("item_description", 256).comment("宝贝描述（推荐理由,不一定有） 如: 漏水速干 透气清凉| 京东: requestId"),
		df.varchar("nick", 128).comment("店铺信息-卖家昵称 如: 素实旗舰店"),
		df.varchar("pict_url", 256).comment("如: //img.alicdn.com/bao/uploaded/i1/3821849208/O1CN01c3WLYM2HtJSoLakDj_!!0-item_pic.jpg"),
		df.bigint("seller_id").comment("卖家id 如: 3821849208"),
		df.varchar("shop_title", 128).comment("如: 素实旗舰店"),
		df.json("small_images").comment('如: {"string":["//img.alicdn.com/i4/3821849208/O1CN012HtJRb0WauWbDJc_!!3821849208.jpg"]}'),
		df.varchar("title", 128).notNull().comment("如: 买一送一防滑漏水浴室拖鞋女夏家用室内洗澡居家鞋情侣冲凉拖鞋男"),
		df.opts("user_type", ["淘宝", "天猫", "京东", "拼多多"]).comment("0表示集市，1表示商城 如: 1"),
		df.int("volume").notNull().comment("30天销量 如: 9856"),
		df.float("zk_final_price").notNull().comment("折扣价 如: 19.8"),
		df.int("hot").default(0).comment("热度"),
		df.primary("id"),
		df.unique("item_id,coupon_amount"),
	]).comment("通用物料推荐");

	df.table("mp", [
		df.unsigned("id").notNull().auto_increment(),
		df.varchar("title", 32).comment("项目名称"),
		df.varchar("token", 64).notNull(),
		df.varchar("appid", 64).notNull(),
		df.varchar("secret", 64).notNull(),
		df.varchar("encodingAESKey", 64).default("").notNull(),
		df.opts("checkSignature", ["不检查", "检查"]).notNull(),
		df.varchar("rebate", 32).comment("返利比例,如: 0.5元"),
		df.opts("rebateCoupon", ["不返", "返"]).default(0).comment("alimama:有券也返利"),
		df.varchar("nick", 8).default("二狗").comment("昵称"),
		df.varchar("tuling", 32).comment("图灵: apiKey"),
		df.unsigned("create_id").comment("创建者"),
		df.primary("id"),
	]);

	df.table("replys", [
		df.unsigned("id").notNull().auto_increment(),
		df.unsigned("mid").notNull().comment("微信公众平台ID"),
		df.varchar("name", 32).comment("规则名称"),
		df.opts("kind", ["关键词", "全词", "正则", "表达式", "关注", "发卡"]).default(0).comment("0-关键词 1-全词 2-正则 3-表达式 4-关注 5-发卡"),
		df.varchar("r", 256).notNull().charset("utf8mb4").comment("规则"),
		df.int("idx").notNull().comment("排序"),
		df.bigint("expired_at").default(0).comment("过期时间"),
		df.json("value").notNull().comment("回复内容"),
		df.unsigned("create_id").comment("创建者"),
		df.primary("id"),
	]);

	df.table("history", [
		df.unsigned("id").notNull().auto_increment(),
		df.unsigned("uid").notNull().comment("用户ID"),
		df.bigint("item_id").notNull().comment("商品ID"),
		df.varchar("title", 128).notNull().comment("如: 买一送一防滑漏水浴室拖鞋女夏家用室内洗澡居家鞋情侣冲凉拖鞋男"),
		df.varchar("pict_url", 256).comment("如: //img.alicdn.com/bao/uploaded/i1/3821849208/O1CN01c3WLYM2HtJSoLakDj_!!0-item_pic.jpg"),
		df.int("volume").notNull().comment("30天销量 如: 9856"),
		df.float("zk_final_price").notNull().comment("折扣价 如: 19.8"),
		df.int("coupon_amount").notNull().default(0).comment("券面额(元) 如: 5 (0代表返利类)"),
		df.varchar("coupon_share_url", 1024).comment("推广链接"),
		df.varchar("coupon_word", 1024).comment("推广淘口令,非null代表用户点击领取过| 京东: 领券链接参见public/jd.html"),
		df.bigint("create_at").notNull().comment("历史创建时间"),
		df.float("commission_rate").default(0).comment("返利比例,万分之一"),
		df.opts("user_type", ["淘宝", "天猫", "京东", "拼多多"]).default(0).comment("平台"),
		df.primary("id"),
		df.index("uid"),
		df.index("user_type"),
		df.index("item_id"),
	]);

	df.table("taobao_code_log", [
		df.unsigned("id").notNull().auto_increment(),
		df.unsigned("uid").notNull().comment("用户ID"),
		df.unsigned("hid").notNull().comment("历史ID"),
		df.bigint("item_id").notNull().comment("商品ID"),
		df.bigint("create_at").notNull().comment("领取时间"),
		df.primary("id"),
	]).comment("领券记录,记录用户在什么时候领取过哪个商品的券");

	df.table("jd_code_log", [
		df.unsigned("id").notNull().auto_increment(),
		df.unsigned("uid").notNull().comment("用户ID"),
		df.unsigned("hid").notNull().comment("历史ID"),
		df.bigint("item_id").notNull().comment("商品ID"),
		df.bigint("create_at").notNull().comment("领取时间"),
		df.primary("id"),
	]).comment("领券记录,记录用户在什么时候领取过哪个商品的券");

	df.table("pdd_code_log", [
		df.unsigned("id").notNull().auto_increment(),
		df.unsigned("uid").notNull().comment("用户ID"),
		df.unsigned("hid").notNull().comment("历史ID"),
		df.bigint("item_id").notNull().comment("商品ID"),
		df.bigint("create_at").notNull().comment("领取时间"),
		df.primary("id"),
	]).comment("领券记录,记录用户在什么时候领取过哪个商品的券");

	df.table("payment", [
		df.unsigned("id").notNull().auto_increment(),
		df.unsigned("hid").comment("历史ID"),
		df.unsigned("uid").default(0).comment("用户ID"),
		df.bigint("item_id").notNull().comment("商品ID"),
		df.varchar("auction_category", 64).notNull().comment("类目名称"),
		df.varchar("title", 128).notNull().comment("如: 买一送一防滑漏水浴室拖鞋女夏家用室内洗澡居家鞋情侣冲凉拖鞋男"),
		df.varchar("pict_url", 256).comment("如: //img.alicdn.com/bao/uploaded/i1/3821849208/O1CN01c3WLYM2HtJSoLakDj_!!0-item_pic.jpg"),
		df.int("item_num").notNull().comment("购买数量"),
		df.varchar("trade_parent_id", 64).notNull().comment("淘宝父订单号"),
		df.varchar("trade_id", 64).notNull().comment("淘宝订单号"),
		df.opts("user_type", ["淘宝", "天猫", "京东", "拼多多"]).default(1).comment("0表示集市，1表示商城 如: 1"),
		df.opts("state", ["已失效", "已付款", "已结算"]).notNull().comment("订单状态").update(`if(pay_amount>0,2,if(alipay_total_price<=0,0,1))`),
		df.float("alipay_total_price").notNull().comment("付款金额(元), >0: 已付款 否则: 已失效"),
		df.float("pub_share_pre_fee").notNull().comment("效果预估, 不管是否取消都不变"),
		df.float("total_commission_fee").default(0).comment("佣金金额, >0: 已结算"),
		df.int("coupon_amount").default(0).comment("券面额, 绑定了历史则等于历史中的券面额,否则等于0"),
		df.bigint("create_at").notNull().comment("付款时间"),
		df.bigint("earning_at").default(0).comment("签收时间"),
		df.bigint("finish_at").default(0).comment("7天无理由时间,没过之前是0,过了无理由之后是给用户结算的时间").update("earning_at"),
		df.float("pay_amount").default(0).comment("返利金额"),
		df.bigint("match_at").default(0).comment("匹配时间,>0代表订单匹配过"),
		df.primary("id"),
		df.unique("trade_id"),
		df.index("item_id"),
	]).comment("订单");

	df.table("devices", [
		df.unsigned("id").notNull().auto_increment(),
		df.varchar("device_id", 256).comment("设备ID"),
		df.varchar("ip", 64).comment("最后登录ID"),
		df.bigint("create_at").notNull().comment("创建时间"),
		df.bigint("update_at").notNull().default(0).comment("更新时间"),
		df.int("cnt").default(0).comment("使用次数"),
		df.primary("id"),
		df.unique("device_id"),
	]);

	df.table("openwx", [
		df.varchar("openid", 64).notNull(),
		df.varchar("nickname", 64).charset("utf8mb4").comment("普通用户昵称"),
		df.opts("sex", ["未知", "男", "女"]).comment("普通用户性别，1为男性，2为女性"),
		df.varchar("language", 32).comment("语言"),
		df.varchar("province", 64).comment("普通用户个人资料填写的省份"),
		df.varchar("city", 64).comment("普通用户个人资料填写的城市"),
		df.varchar("country", 64).comment("国家，如中国为CN"),
		df.varchar("headimgurl", 512).comment("用户头像，最后一个数值代表正方形头像大小（有0、46、64、96、132数值可选，0代表640*640正方形头像），用户没有头像时该项为空"),
		df.json("privilege").comment("用户特权信息，json数组，如微信沃卡用户为（chinaunicom）"),
		df.varchar("unionid", 64).notNull().comment("用户统一标识。针对一个微信开放平台帐号下的应用，同一用户的unionid是唯一的。"),
		df.varchar("token", 128).comment("access_token"),
		df.varchar("refresh", 256).comment("refresh_token"),
		df.bigint("expired_at").comment("token过期时间"),
		df.opts("type", ["开放平台", "公众平台"]).default(0).comment("类型"),
		df.unsigned("uid").default(0).comment("用户ID").update("(select id from user where user.unionid=openwx.unionid)"),
		df.primary("openid"),
	]).comment("微信开放账号信息");

	df.table("pay_address", [
		df.unsigned("id").notNull().auto_increment(),
		df.unsigned("uid").default(0).comment("用户ID"),
		df.varchar("alipay", 256).comment("支付宝收款码url"),
		df.varchar("wechat", 256).comment("微信收款码url"),
		df.varchar("account", 32).comment("支付宝账号"),
		df.varchar("name", 32).comment("姓名"),
		df.bigint("create_at").comment("创建时间"),
		df.bigint("update_at").comment("修改时间"),
		df.primary("id"),
		df.index("uid"),
	]);

	df.table("pay_request", [
		df.unsigned("id").notNull().auto_increment(),
		df.unsigned("uid").default(0).comment("用户ID"),
		df.float("price").notNull().comment("提现金额"),
		df.opts("x2", ["不使用", "使用"]).default(0).comment("是否使用双倍券"),
		df.bigint("create_at").comment("创建时间"),
		df.bigint("pay_at").comment("提现时间"),
		df.opts("mode", ["待处理", "支付宝付款", "微信收款", "支付宝转账"]).default(0).notNull().comment("提现方式: 0-待处理 1-支付宝收款 2-微信收款 3-支付宝转账"),
		df.varchar("remark", 256).comment("提现备注信息"),
		df.primary("id"),
		df.index("uid"),
	]).comment("提现请求");

	df.table("app_version", [
		df.unsigned("id").notNull().auto_increment(),
		df.varchar("version", 16).notNull().comment("版本号"),
		df.varchar("description", 256).comment("版本信息"),
		df.varchar("url", 256).comment("版本URL"),
		df.primary("id"),
		df.unique("version"),
	]).comment("app版本信息");

	df.table("channel", [
		df.unsigned("id").notNull().auto_increment(),
		df.unsigned("create_id").notNull().comment("创建者"),
		df.varchar("name", 32).notNull().comment("通道名称"),
		df.varchar("token", 64).default("").comment("密钥"),
		df.primary("id"),
	]);

	df.table("channel_user", [
		df.unsigned("cid").notNull().comment("推送通道ID"),
		df.varchar("openid", 64).notNull(),
		df.varchar("grp", 32).default("").comment("分组信息"),
		df.unique("openid,cid"),
		df.foreign("cid").references("channel", "id"),
	]).comment("通知用户表");

	df.table("wxuser", [
		df.varchar("openid", 64).notNull(),
		df.varchar("nickname", 32),
		df.opts("sex", ["未知", "男", "女"]).default(0).comment("性别"),
		df.varchar("language", 32).comment("语言"),
		df.varchar("province", 64).comment("普通用户个人资料填写的省份"),
		df.varchar("city", 64).comment("普通用户个人资料填写的城市"),
		df.varchar("country", 64).comment("国家，如中国为CN"),
		df.varchar("headimgurl", 512).comment("用户头像，最后一个数值代表正方形头像大小（有0、46、64、96、132数值可选，0代表640*640正方形头像），用户没有头像时该项为空"),
		df.varchar("unionid", 128).comment("只有在用户将公众号绑定到微信开放平台帐号后，才会出现该字段。"),
		df.int("groupid").comment("分组"),
		df.varchar("remark", 32).comment("备注"),
		df.bigint("subscribe_time").comment("最后关注时间"),
		df.json("tagid_list").comment("标签"),
		// ["ADD_SCENE_SEARCH","ADD_SCENE_ACCOUNT_MIGRATION","ADD_SCENE_PROFILE_CARD","ADD_SCENE_QR_CODE","ADD_SCENE_PROFILE_LINK","ADD_SCENE_PROFILE_ITEM","ADD_SCENE_PAID","ADD_SCENE_OTHERS"],
		df.opts("subscribe_scene", ["公众号搜索", "公众号迁移", "名片分享", "扫描二维码", "图文页内名称点击", "图文页右上角菜单", "支付后关注", "其他"]).comment("关注方式"),
		df.int("qr_scene").comment("二维码扫码场景（开发者自定义）"),
		df.varchar("qr_scene_str", 256).comment("二维码扫码场景描述（开发者自定义）"),
		df.unsigned("uid").default(0).comment("用户ID").update("(select id from user where user.unionid=wxuser.unionid)"),
		df.primary("openid"),
	]).comment("微信公众平台账号");

	df.table("invite", [
		df.unsigned("id").notNull().auto_increment(),
		df.unsigned("uid").default(0).comment("用户ID"),
		df.float("price").notNull().comment("金额"),
		df.opts("type", ["注册送礼", "邀请送礼", "被邀请送礼", "好友首单", "自己首单", "系统送礼"]).notNull().comment("送礼类型"),
		df.json("data").comment("送礼数据"),
		df.bigint("create_at").notNull().comment("创建时间"),
		df.primary("id"),
	]);

	df.table("share", [
		df.unsigned("id").notNull().auto_increment(),
		df.varchar("ua", 256).notNull().comment("user-agent"),
		df.varchar("ip", 32).notNull().comment("ip"),
		df.varchar("code", 256).notNull().comment("参数"),
		df.bigint("create_at").notNull().comment("创建时间"),
		df.primary("id"),
	]);

	df.table("ctfile", [
		df.unsigned("id").notNull().auto_increment(),
		df.varchar("email", 64).notNull().comment("邮箱"),
		df.varchar("passwd", 64).notNull().comment("密码"),
		df.varchar("token", 64).notNull().comment("密钥"),
		df.unsigned("create_id").comment("创建者"),
		df.bigint("create_at").notNull().comment("创建时间"),
		df.unique("email"),
		df.primary("id"),
	]);

	df.table("group", [
		df.unsigned("id").notNull().auto_increment(),
		df.unsigned("create_id").comment("创建者"),
		df.varchar("name", 64).notNull().comment("组名"),
		df.bigint("create_at").notNull().comment("创建时间"),
		df.primary("id"),
	]).comment("分组");

	df.table("post", [
		df.unsigned("id").notNull().auto_increment(),
		df.unsigned("create_id").comment("创建者"),
		df.unsigned("edit_id").comment("最近修改人"),
		df.unsigned("head_id").comment("负责人"),
		df.opts("type", ["文件夹", "任务"]).default(0).comment("类型"),
		df.varchar("title", 64).notNull().comment("标题"),
		df.bigint("create_at").notNull().comment("创建时间"),
		df.bigint("update_at").notNull().comment("修改时间"),
		df.bigint("plan_at").default(0).comment("计划完成时间"),
		df.bigint("finish_at").default(0).comment("完成时间"),
		df.int("cost").default(0).comment("用时"),
		df.int("rate").default(0).comment("进度"),
		df.varchar("path", 32).notNull().comment("路径，默认/"),
		df.unsigned("pid").default(0).comment("父节点ID"),
		df.int("pow").default(0).comment("帖子默认权限"),
		df.unsigned("pow_id").notNull().comment("权限继承ID,该节点继承哪个祖先节点的权限"),
		df.unsigned("child_cnt").default(0).comment("子节点数量"),
		df.text("content").charset("utf8mb4").comment("帖子内容"),
		df.primary("id"),
	]).comment("帖子");

	df.table("ac_post", [
		df.unsigned("uid").notNull().comment("用户ID"),
		df.unsigned("pid").notNull().comment("帖子ID"),
		df.int("pow").notNull().comment("权限位级:1查看,2回复,4下载,8添加,16修改,32移动,64修改评论,128删除,256删除评论,512管理"),
		df.primary("uid,pid"),
	]).comment("帖子权限控制");

	df.table("posttime", [
		df.unsigned("id").notNull().auto_increment(),
		df.unsigned("create_id").notNull().comment("工作者ID"),
		df.unsigned("post_id").notNull().comment("帖子ID"),
		df.bigint("start_at").notNull().comment("开始时间"),
		df.bigint("end_at").notNull().comment("结束时间"),
		df.varchar("ip", 32).comment("IP地址"),
		df.primary("id"),
	]).comment("帖子耗时");

	return df;
}

/**
 * @param {greendb.Engine} db
 */
async function test(db) {
	// db.setLogger(console);
	let sb = defineTables();
	await sb.sync(db, true);
	await db.end();
}

describe("greendb schema test", () => {
	it("mysql", () => {
		var db = greendb.createPool("mysql", {
			user: "root",
			password: "123456",
			host: "127.0.0.1",
			database: "quan2go",
			port: 3306,
			connectionLimit: 50,
			supportBigNumbers: false,
			bigNumberStrings: false,
			charset: "utf8mb4",
		});
		return test(db);
	});
});
