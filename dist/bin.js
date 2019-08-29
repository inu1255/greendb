#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const greendb = require(".");
const fs = require("fs");
const path = require("path");
let cmd = process.argv[2]; // 命令
let df_file = 'greendb.js'; // 定义文件路径
let user = ""; // mysql用户名
let password = ""; // mysql密码
let host = "";
let database = "";
let visiable = false; // 显示sql
let force = false; // 强制操作
let apiDir = ''; // 接口定义目录 user: 会生成user/add.json 等  user/foo 会生成 user/foo_add.json 等
for (let i = 3; i < process.argv.length; i++) {
    let s = process.argv[i];
    let s2 = s.slice(0, 2);
    if (s2 == "-u") {
        user = s.length > 2 ? s.slice(2) : process.argv[++i];
    }
    else if (s2 == "-p") {
        password = s.length > 2 ? s.slice(2) : process.argv[++i];
    }
    else if (s2 == "-h") {
        host = s.length > 2 ? s.slice(2) : process.argv[++i];
    }
    else if (s2 == "-f") {
        df_file = s.length > 2 ? s.slice(2) : process.argv[++i];
    }
    else if (s == "--force" || s == "-force") {
        force = true;
    }
    else if (s == "--api" || s == "-api") {
        apiDir = process.argv[++i];
    }
    else if (!database) {
        database = s;
    }
}
let df = new greendb.TableBuilder();
let cmds = {
    init() {
        if (!user || !database || !password) {
            console.log(`usage:\n\tgreendb init -uroot -p123456 dbname`);
            return;
        }
        if (fs.existsSync(df_file)) {
            if (force)
                fs.unlinkSync(df_file);
            else
                return console.log(`${df_file} exists`);
        }
        let db = greendb.createPool({
            user,
            password,
            host,
            database,
            port: 3306,
            connectionLimit: 50,
            supportBigNumbers: false,
            bigNumberStrings: false,
            charset: "utf8mb4"
        });
        df.init(db).then(function () {
            var w = fs.createWriteStream(df_file);
            w.write(`const greendb = require("greendb");\n\n`);
            w.write(`let df = new greendb.TableBuilder();\n`);
            for (let k in df.tables) {
                let v = df.tables[k];
                w.write(`\ndf.table('${v._name}', [\n`);
                let fset = new Set();
                for (let field of v._fields) {
                    if (field instanceof greendb.Field) {
                        w.write('\tdf');
                        var m;
                        if (field._type == 'int unsigned')
                            w.write(`.unsigned('${field._name}')`);
                        else if (m = /varchar\((\d+)\)/.exec(field._type))
                            w.write(`.varchar('${field._name}', ${m[1]})`);
                        else if (["text", "json", "float", "int", "bigint",].indexOf(field._type) >= 0)
                            w.write(`.${field._type}('${field._name}')`);
                        else
                            w.write(`.field('${field._name}', '${field._type}')`);
                        if (!field._null)
                            w.write(`.notNull()`);
                        if (field._inc)
                            w.write(`.auto_increment()`);
                        if (field._charset)
                            w.write(`.charset('${field._charset}')`);
                        if (field._default != null) {
                            var t = parseFloat(field._default);
                            if (isNaN(t))
                                t = field._default;
                            w.write(`.default(${JSON.stringify(t)})`);
                        }
                        if (field._comment)
                            w.write(`.comment('${field._comment}')`);
                        w.write(',\n');
                    }
                    else if (field._type.toLowerCase() == "foreign") {
                        fset.add(field._field);
                    }
                }
                for (let field of v._fields) {
                    if (field instanceof greendb.Constraint) {
                        if (field._type.toLowerCase() == "foreign")
                            w.write(`\tdf.foreign('${field._field.toLowerCase()}').references('${field._ref_table}', '${field._ref_field}'),\n`);
                        else if (field._type || !fset.has(field._field)) // foreign默认会加索引，所以忽略
                            w.write(`\tdf.${(field._type || 'index').toLowerCase()}('${field._field}'),\n`);
                    }
                }
                w.write(`])`);
                if (v._engine && !/innodb/i.test(v._engine))
                    w.write(`.engine('${v._engine.toLowerCase()}')`);
                // if (v._inc) w.write(`.auto_increment(${v._inc})`);
                if (v._charset)
                    w.write(`.charset('${v._charset}')`);
                if (v._comment)
                    w.write(`.comment('${v._comment}')`);
                w.write(`;\n`);
            }
            w.write(`\nmodule.exports = df;`);
            w.end(function () {
                db.end();
            });
        });
    },
    merge() {
        let df = require(process.cwd() + '/' + df_file);
        if (!user || !database || !password) {
            console.log(`usage:\n\tgreendb init -uroot -p123456 dbname`);
            return;
        }
        let db = greendb.createPool({
            user,
            password,
            host,
            database,
            port: 3306,
            connectionLimit: 50,
            supportBigNumbers: false,
            bigNumberStrings: false,
            charset: "utf8mb4"
        });
        df.merge(db, force).then(function () {
            db.end();
        }, function (e) {
            console.error(e);
            db.end();
        });
    },
    param() {
        let df = require(process.cwd() + '/' + df_file);
        let table = database;
        if (!table)
            return console.log('需要指定table');
        let params = df.tables[table].toParams();
        console.log(JSON.stringify(params, null, 4));
    },
    ts() {
        let df = require(process.cwd() + '/' + df_file);
        let w = fs.createWriteStream(database || 'typings/db/index.d.ts');
        w.write('declare namespace db {\n');
        for (let k in df.tables) {
            let v = df.tables[k];
            w.write(v.toTypescript());
        }
        w.write('}');
        w.end();
    },
    dart() {
        let df = require(process.cwd() + '/' + df_file);
        let outdir = database || '.dart_output';
        if (!fs.existsSync(outdir))
            fs.mkdirSync(outdir);
        for (let k in df.tables) {
            let v = df.tables[k];
            fs.writeFileSync(path.join(outdir, v.name + '.dart'), v.toDart());
        }
    },
    api() {
        let df = require(process.cwd() + '/' + df_file);
        let table = database;
        if (!table)
            return console.log('需要指定table');
        apiDir = apiDir || table.replace(/_/g, '/');
        let [dir, name] = apiDir.split('/');
        let t = df.tables[table];
        if (!fs.existsSync(`api`))
            fs.mkdirSync(`api`);
        if (!fs.existsSync(`api/${dir}`))
            fs.mkdirSync(`api/${dir}`);
        if (!fs.existsSync(`src`))
            fs.mkdirSync(`src`);
        if (!fs.existsSync(`src/routes`))
            fs.mkdirSync(`src/routes`);
        let file = `src/routes/${dir}.ts`;
        let text;
        try {
            text = fs.readFileSync(file, 'utf8');
        }
        catch (e) {
            text = [
                `import db from "../common/db";`,
                `import { appLogger } from "../common/log";`,
                `import * as utils from "../common/utils";`,
                `import * as cofs from "fs-extra";`,
                `import { Request, Response } from "express-serve-static-core";`,
            ].join('\n') + '\n';
        }
        let edit = false;
        for (let ret of [
            t.toApiAdd(dir, name),
            t.toApiDel(dir, name),
            t.toApiList(dir, name),
        ]) {
            let file = `api/${dir}/${ret.name}.json`;
            if (!force && fs.existsSync(file)) {
                console.log(file, 'exists');
                fs.writeFileSync(file + '_', JSON.stringify(ret.api, null, 4));
            }
            else
                fs.writeFileSync(file, JSON.stringify(ret.api, null, 4));
            let idx = text.indexOf(ret.data[0]);
            if (idx < 0)
                text += ret.data.join('\n') + '\n';
            else {
                edit = true;
                let end = greendb.findNext(text, '}', idx + ret.data[0].length);
                text = text.slice(0, idx) + ret.data.join('\n') + text.slice(end + 1);
            }
        }
        if (!force && edit)
            fs.writeFileSync(file + '_', text);
        else
            fs.writeFileSync(file, text);
    },
    usage() {
        console.log(`usage:
    通用参数:
        -u 指定数据库用户名, 如: -uroot 或 -u root
        -p 指定数据库密码, 如: -p123456 或 -p 123456
        -h 指定数据库host, 如: -hlocalhost 或 -h 127.0.0.1
        -f 指定数据库定义文件, 如: -f sql/greendb.js, 默认: greendb.js
    根据已有数据库,生成数据库定义文件,如果文件已存在则停止,如果指定了--force则覆盖
        greendb init -uroot -p123456 dbname
    ***** 以下功能需要数据库定义文件 *****
    生成升级sql,如果--force则会直接执行sql
        greendb merge -uroot -p123456 dbname
    指定表格，生成接口定义的params
        greendb param table
    生成typescript定义
        greendb ts outfile.d.ts
    生成dart定义
        greendb dart outdir
    指定表格，生成常用接口的定义和实现
        greendb api table --api apiPrefix
		`);
    }
};
cmds[cmd] ? cmds[cmd]() : cmds.usage();
