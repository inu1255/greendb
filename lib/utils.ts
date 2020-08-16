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

if (typeof Object.assign != "function") {
	(Object.assign as any) = function (target) {
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

export function applyMixins(derivedCtor: any, baseCtors: any[]) {
	baseCtors.forEach((baseCtor) => {
		Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
			derivedCtor.prototype[name] = baseCtor.prototype[name];
		});
	});
}
