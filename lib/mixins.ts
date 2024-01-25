import {Where, IEngine, ISql} from ".";

type Constructor<T> = new (...args: any[]) => T;

export class Base {
	constructor() {}
}

export function Runnable<B extends Constructor<{}>>(Base: B) {
	return class extends Base {
		[Symbol.toStringTag]: string;
		$$pms: Promise<any>;
		_e: IEngine;
		ignore_log?: boolean;
		constructor(...args: any[]) {
			super(...args);
		}
		quiet() {
			this.ignore_log = true;
			return this;
		}
		engine(e: IEngine) {
			this._e = e;
			return this;
		}
		run(): Promise<any> {
			return this._e.runSql(this as any);
		}
		$pms() {
			if (this.$$pms) return this.$$pms;
			return (this.$$pms = this.run());
		}
		then<TResult1 = any, TResult2 = never>(
			onfulfilled?: (value: any) => TResult1 | PromiseLike<TResult1>,
			onrejected?: (reason: any) => TResult2 | PromiseLike<TResult2>
		): Promise<TResult1 | TResult2> {
			return this.$pms().then(onfulfilled, onrejected);
		}
		catch<TResult = never>(onrejected?: (reason: any) => TResult | PromiseLike<TResult>): Promise<any | TResult> {
			return this.$pms().catch(onrejected);
		}
		finally(onfinally?: () => void): Promise<any> {
			return (this.$pms() as any).finally(onfinally);
		}
	};
}

export function Tablable<B extends Constructor<{}>>(Base: B) {
	return class extends Base {
		_table: string;
		constructor(...args: any[]) {
			super(...args);
		}
		table(table: string) {
			this._table = table;
			return this;
		}
	};
}

export function Wherable<B extends Constructor<{}>>(Base: B) {
	return class extends Base {
		_where: Where;
		constructor(...args: any[]) {
			super(...args);
			this._where = new Where();
		}
		where(key: string | Where | {[key: string]: any}, value?: any) {
			this._where.and(key, value);
			return this;
		}
		orWhere(key: string | Where | {[key: string]: any}, value?: any) {
			this._where.or(key, value);
			return this;
		}
		build() {
			this._where.build();
			return this;
		}
	};
}
