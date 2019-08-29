declare global {
    interface ObjectConstructor {
		/**
		 * Copy the values of all of the enumerable own properties from one or more source objects to a
		 * target object. Returns the target object.
		 * @param target The target object to copy to.
		 * @param source The source object from which to copy properties.
		 */
        assign<T, U>(target: T, source: U): T & U;
    }
}

if (typeof Object.assign != 'function') {
    (Object.assign as any) = function(target) {
        'use strict';
        if (target == null) {
            throw new TypeError('Cannot convert undefined or null to object');
        }

        target = Object(target);
        for (var index = 1; index < arguments.length; index++) {
            var source = arguments[index];
            if (source != null) {
                for (var key in source) {
                    if (Object.prototype.hasOwnProperty.call(source, key)) {
                        target[key] = source[key];
                    }
                }
            }
        }
        return target;
    };
}

/**
 * 把v转换为mysql可以接收的参数，把对象转换成json字符串
 * @param {any} v 值
 * @returns {String}
 */
export function val(v: any): string {
    if (v === undefined) v = null;
    return v && typeof v === "object" ? JSON.stringify(v) : v;
}

/**
 * 如果args为undefined则返回 def||[]
 * 如果args是一个Array则返回自己
 * 如果不是则返回[args]
 * @param {any} args
 * @param {Array} [def] 默认值
 * @returns {Array}
 */
export function arr<T>(args: T | T[], def?: T[]): T[] {
    if (args instanceof Array) return args;
    return args === undefined ? def || [] : [args];
}

/**** 默认去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1 ****/
const CHARS = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678";
const NUMBERS = "0123456789";

/**
 * @param {number} len
 */
export function randomString(len: number) {
    var code = "";
    for (var i = 0; i < len; i++) {
        code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
    }
    return code;
}

/**
 * @param {number} len
 */
export function randomNumber(len: number) {
    var code = "";
    for (var i = 0; i < len; i++) {
        code += NUMBERS.charAt(Math.floor(Math.random() * NUMBERS.length));
    }
    return code;
}

export function CamelCase(name: String) {
    return name.replace(/^(\w)|_(\w)/g, (x0, x1, x2) => (x1 || x2).toUpperCase());
}

export function camelCase(name: String) {
    return name.replace(/_(\w)/g, (x0, x1) => x1.toUpperCase());
}

/**
 * 
 * @param text 文本
 * @param s 目标字符串
 * @param i 开始位置
 * @param pars 被以下符号对包围时不算
 */
export function findNext(text: string, s: string, i?: number, pars?: { [left: string]: string }, ) {
    if (!pars) pars = {
        '"': '"\\',
        "'": "'\\",
        "`": "`\\",
        "{": "}",
        "(": ")",
        "[": "]",
    };
    var stack = []
    while (i < text.length) {
        var p = stack[stack.length - 1]
        var c = text[i]
        if (p) {
            if (c == p[0])
                stack.pop();
            else if (p[1])
                c == p[1] && i++;
            else {
                var v = pars[c]
                if (v) stack.push(v)
            }
        } else {
            if (text.slice(i).startsWith(s))
                break;
            var v = pars[c]
            if (v) stack.push(v)
        }
        i++;
    }
    return i;
}