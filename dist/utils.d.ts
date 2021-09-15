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
 * @param {number} len
 */
export declare function randomString(len: number): string;
/**
 * @param {number} len
 */
export declare function randomNumber(len: number): string;
export declare function CamelCase(name: String): string;
export declare function camelCase(name: String): string;
export declare function applyMixins(derivedCtor: any, baseCtors: any[]): void;
