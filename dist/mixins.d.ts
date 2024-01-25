import { Where, IEngine } from ".";
declare type Constructor<T> = new (...args: any[]) => T;
export declare class Base {
    constructor();
}
export declare function Runnable<B extends Constructor<{}>>(Base: B): {
    new (...args: any[]): {
        [Symbol.toStringTag]: string;
        $$pms: Promise<any>;
        _e: IEngine;
        ignore_log?: boolean;
        quiet(): any;
        engine(e: IEngine): any;
        run(): Promise<any>;
        $pms(): Promise<any>;
        then<TResult1 = any, TResult2 = never>(onfulfilled?: (value: any) => TResult1 | PromiseLike<TResult1>, onrejected?: (reason: any) => TResult2 | PromiseLike<TResult2>): Promise<TResult1 | TResult2>;
        catch<TResult = never>(onrejected?: (reason: any) => TResult | PromiseLike<TResult>): Promise<any>;
        finally(onfinally?: () => void): Promise<any>;
    };
} & B;
export declare function Tablable<B extends Constructor<{}>>(Base: B): {
    new (...args: any[]): {
        _table: string;
        table(table: string): any;
    };
} & B;
export declare function Wherable<B extends Constructor<{}>>(Base: B): {
    new (...args: any[]): {
        _where: Where;
        where(key: string | Where | {
            [key: string]: any;
        }, value?: any): any;
        orWhere(key: string | Where | {
            [key: string]: any;
        }, value?: any): any;
        build(): any;
    };
} & B;
export {};
