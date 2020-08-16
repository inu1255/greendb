"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
if (typeof Object.assign != "function") {
    Object.assign = function (target) {
        "use strict";
        if (target == null) {
            throw new TypeError("Cannot convert undefined or null to object");
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
/**** 默认去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1 ****/
var CHARS = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678";
var NUMBERS = "0123456789";
/**
 * @param {number} len
 */
function randomString(len) {
    var code = "";
    for (var i = 0; i < len; i++) {
        code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
    }
    return code;
}
exports.randomString = randomString;
/**
 * @param {number} len
 */
function randomNumber(len) {
    var code = "";
    for (var i = 0; i < len; i++) {
        code += NUMBERS.charAt(Math.floor(Math.random() * NUMBERS.length));
    }
    return code;
}
exports.randomNumber = randomNumber;
function CamelCase(name) {
    return name.replace(/^(\w)|_(\w)/g, function (x0, x1, x2) { return (x1 || x2).toUpperCase(); });
}
exports.CamelCase = CamelCase;
function camelCase(name) {
    return name.replace(/_(\w)/g, function (x0, x1) { return x1.toUpperCase(); });
}
exports.camelCase = camelCase;
function applyMixins(derivedCtor, baseCtors) {
    baseCtors.forEach(function (baseCtor) {
        Object.getOwnPropertyNames(baseCtor.prototype).forEach(function (name) {
            derivedCtor.prototype[name] = baseCtor.prototype[name];
        });
    });
}
exports.applyMixins = applyMixins;
