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
/**
 * 把v转换为mysql可以接收的参数，把对象转换成json字符串
 * @param {any} v 值
 * @returns {String}
 */
export declare function val(v: any): string;
/**
 * 如果args为undefined则返回 def||[]
 * 如果args是一个Array则返回自己
 * 如果不是则返回[args]
 * @param {any} args
 * @param {Array} [def] 默认值
 * @returns {Array}
 */
export declare function arr<T>(args: T | T[], def?: T[]): T[];
/**
 * @param {number} len
 */
export declare function randomString(len: number): string;
/**
 * @param {number} len
 */
export declare function randomNumber(len: number): string;
export declare function CamelCase(name: String): string;
export declare function camelCase(name: String): string;
/**
 *
 * @param text 文本
 * @param s 目标字符串
 * @param i 开始位置
 * @param pars 被以下符号对包围时不算
 */
export declare function findNext(text: string, s: string, i?: number, pars?: {
    [left: string]: string;
}): number;
