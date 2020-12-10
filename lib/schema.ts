import {IEngine} from ".";

function compare(a: string, b: string) {
	if (a == b) return true;
	if ((a == null && b != null) || (a != null && b == null)) return false;
	return a.toLowerCase() == b.toLowerCase();
}
interface IField {
	name: string;
	type: string;
	table: string;
	default: string;
	comment: string;
	charset: string;
	null: boolean;
	inc: boolean;
	// 以下字段与数据库无关
	opts?: string[];
	bits?: string[];
	reg?: [RegExp, string?];
	ext?: any;
	mocks?: any[];
	update?: string;
}

export class Field implements IField {
	name: string;
	type: string;
	table: string;
	default: string;
	comment: string;
	charset: string;
	null: boolean;
	inc: boolean;
	// 以下字段与数据库无关
	opts?: string[];
	bits?: string[];
	reg?: [RegExp, string?];
	ext?: any;
	mocks?: any[];
	update?: string;
	constructor() {
		this.null = true;
		this.inc = false;
	}
	equal(b: Field) {
		return compare(this.name, b.name);
	}
	strictEqual(b: Field, typeFn?: (type: string) => string) {
		var ok =
			this.name == b.name &&
			(typeFn ? typeFn(this.type) : this.type) == (typeFn ? typeFn(b.type) : b.type) &&
			this.default == b.default &&
			compare(this.charset, b.charset) &&
			this.inc == b.inc &&
			this.null == b.null;
		return ok;
	}
}

export class FieldBuilder {
	private _field: Field;
	constructor(name: string, type: string) {
		let field = new Field();
		field.name = name;
		field.type = type;
		this._field = field;
	}
	from(f: IField) {
		Object.assign(this._field, f);
		return this;
	}
	table(table: string) {
		this._field.table = table;
		return this;
	}
	notNull() {
		this._field.null = false;
		return this;
	}
	auto_increment() {
		this._field.inc = true;
		return this;
	}
	default(def: any) {
		this._field.default = def.toString();
		return this;
	}
	charset(charset: string) {
		this._field.charset = charset;
		return this;
	}
	comment(comment: string) {
		this._field.comment = comment;
		return this;
	}
	opts(items: string[]) {
		this._field.opts = items;
		return this;
	}
	bits(items: string[]) {
		this._field.bits = items;
		return this;
	}
	reg(regex: RegExp, why?: string) {
		this._field.reg = [regex, why];
		return this;
	}
	ext(ext: any) {
		this._field.reg = ext;
		return this;
	}
	mock(items: any[]) {
		this._field.mocks = items;
		return this;
	}
	update(v: string) {
		this._field.update = v;
		return this;
	}
	build() {
		return this._field;
	}
}

export type ConstraintType = "" | "PRIMARY" | "UNIQUE" | "FOREIGN" | "FULLTEXT";

interface IConstraint {
	type: ConstraintType;
	fields: string[];
	name: string;
	ref_table: string;
	ref_fields: string[];
}

export class Constraint {
	type: ConstraintType;
	fields: string[];
	name: string;
	ref_table: string;
	ref_fields: string[];
	constructor(name?: string) {
		this.name = name;
		this.type = "";
		this.ref_table = "";
		this.ref_fields = [];
	}
	equal(b: Constraint) {
		if (this.type != b.type) return false;
		if (this.type == "FOREIGN")
			return compare(this.fields.join(), b.fields.join()) && compare(this.ref_fields.join(), b.ref_fields.join()) && compare(this.ref_table, b.ref_table);
		return compare(this.fields.join(), b.fields.join());
	}
}

export class ConstraintBuilder {
	private _constraint: Constraint;
	private _table: string;
	constructor(type: ConstraintType, fields: string | string[]) {
		this._constraint = new Constraint();
		this.type(type).fields(fields);
	}
	type(type: ConstraintType) {
		this._constraint.type = type;
		return this;
	}
	fields(fields: string | string[]) {
		this._constraint.fields = typeof fields === "string" ? fields.split(",").map((x) => x.trim()) : fields;
		return this;
	}
	name(name: string) {
		this._constraint.name = name;
		return this;
	}
	table(table: string) {
		this._table = table;
		return this;
	}
	references(table: string, fields: string | string[]) {
		this._constraint.ref_table = table;
		this._constraint.ref_fields = typeof fields === "string" ? fields.split(",").map((x) => x.trim()) : fields;
		return this;
	}
	addFields(fields: string | string[]) {
		if (!fields.length) return this;
		fields = typeof fields === "string" ? fields.split(",").map((x) => x.trim()) : fields;
		this._constraint.fields.push(...fields);
		return this;
	}
	addRefFields(fields: string | string[]) {
		if (!fields.length) return this;
		fields = typeof fields === "string" ? fields.split(",").map((x) => x.trim()) : fields;
		this._constraint.ref_fields.push(...fields);
		return this;
	}
	build() {
		if (!this._constraint.name) this._constraint.name = (this._table ? this._table + "__" : "") + this._constraint.fields.join("_");
		return this._constraint;
	}
}

export type TableChange =
	| {
			type: "create" | "drop";
			data: Constraint;
	  }
	| {
			from: Field;
			to: Field;
			after?: string;
	  };

export class Table {
	name: string;
	fields: {[key: string]: Field};
	constraints: {[key: string]: Constraint};
	primary?: Constraint;
	comment: string;
	mysql_engine: "MyISAM" | "InnoDB";
	charset: string;
	inc: number;
	constructor(name: string, fields?: Array<FieldBuilder | ConstraintBuilder>) {
		this.name = name;
		this.fields = {};
		this.constraints = {};
		if (fields)
			for (let field of fields) {
				field.table(name);
				if (field instanceof FieldBuilder) {
					this.addField(field.build());
				} else {
					this.addConstraint(field.build());
				}
			}
	}
	addField(field: IField) {
		let f = field instanceof Field ? field : new FieldBuilder(field.name, field.type).from(field).table(this.name).build();
		if (this.fields[f.name]) throw new Error(`table ${name}: duplicate field ${f.name}`);
		this.fields[f.name] = f;
	}
	addConstraint(constraint: Constraint) {
		if (constraint.type.toLowerCase() === "primary") {
			if (this.primary) throw new Error(`table ${name}: duplicate primary key`);
			this.primary = constraint;
		} else this.constraints[constraint.name] = constraint;
	}
	mapField<T>(fn: (field: Field) => T): T[] {
		let list = [];
		for (let k in this.fields) {
			let v = this.fields[k];
			list.push(fn(v));
		}
		return list;
	}
	mapConstraint<T>(fn: (constraint: Constraint) => T): T[] {
		let list = [];
		if (this.primary) list.push(fn(this.primary));
		for (let k in this.constraints) {
			let v = this.constraints[k];
			list.push(fn(v));
		}
		return list;
	}
	migrationFrom(table: Table, compareField?: (a: Field, b: Field) => boolean): TableChange[] {
		let list: TableChange[] = [];
		let drops: TableChange[] = [];
		let toFields = Object.values(this.fields);
		let fromFields = Object.values(table.fields);
		let toConstraints = Object.values(this.constraints);
		let fromConstraints = Object.values(table.constraints);
		let prev: string;
		for (let f1 of toFields) {
			let f0: Field, flike: Field;
			for (let i = 0; i < fromFields.length; i++) {
				let f = fromFields[i];
				if (f1.equal(f)) {
					f0 = f;
					break;
				}
				if (!this.fields[f.name] && !flike && f.type == f1.type && f.default == f1.default) {
					flike = f;
				}
			}
			if (!f0) f0 = flike;
			// 有同一个字段
			if (f0) {
				fromFields.splice(fromFields.indexOf(f0), 1);
				// 如果字段发生改变
				if (!(compareField ? compareField(f1, f0) : f1.strictEqual(f0))) {
					list.push({from: f0, to: f1, after: prev});
				}
			} else {
				// 多了个字段
				list.push({from: null, to: f1, after: prev});
			}
			prev = f1.name;
		}
		for (let f1 of toConstraints) {
			let f0: Constraint;
			for (let i = fromConstraints.length - 1; i >= 0; i--) {
				let f = fromConstraints[i];
				if (f1.equal(f)) {
					f0 = f;
					fromConstraints.splice(i, 1);
					break;
				}
			}
			if (!f0) {
				// 多了个索引
				list.push({type: "create", data: f1});
			}
		}
		for (let f of fromConstraints) {
			drops.push({type: "drop", data: f});
		}
		for (let f of fromFields) {
			drops.push({from: f, to: null});
		}
		return drops.concat(list);
	}
}

export class TableBuilder {
	private _constraint_idx: number;
	private _constraint_map: {[key: string]: ConstraintBuilder};
	private _table: Table;
	constructor(name: string, fields?: Array<FieldBuilder | ConstraintBuilder>) {
		this._constraint_idx = 0;
		this._constraint_map = {};
		this._table = new Table(name, fields);
	}
	addField(field: IField) {
		this._table.addField(field);
	}
	addConstrain(constraint: IConstraint) {
		let name = constraint.name || "$" + this._constraint_idx++;
		let c = this._constraint_map[name];
		if (c) return c.addFields(constraint.fields).addRefFields(constraint.ref_fields);
		return (this._constraint_map[name] = new ConstraintBuilder(constraint.type, constraint.fields).name(name).references(constraint.ref_table, constraint.ref_fields));
	}
	comment(comment: string) {
		this._table.comment = comment;
		return this;
	}
	mysql_engine(engine: "MyISAM" | "InnoDB") {
		this._table.mysql_engine = engine;
		return this;
	}
	charset(charset: string) {
		this._table.charset = charset;
		return this;
	}
	auto_increment(n: number) {
		this._table.inc = n;
		return this;
	}
	constraint(type: ConstraintType, fields: string | string[]) {
		let name = "$" + this._constraint_idx++;
		let c = this._constraint_map[name];
		if (c) throw new Error(`constraint ${name} in table ${this._table.name} exists`);
		return (this._constraint_map[name] = new ConstraintBuilder(type, fields));
	}
	build() {
		let list: Constraint[] = [];
		for (let k in this._constraint_map) {
			let v = this._constraint_map[k];
			list.push(v.build());
		}
		if (list.length) {
			for (let item of list) {
				this._table.addConstraint(item);
			}
			this._constraint_map = {};
		}
		return this._table;
	}
}

export class SchemaBuilder {
	private _tables: {[key: string]: TableBuilder};
	constructor() {
		this._tables = {};
	}
	get tables() {
		return this.mapTable((x) => x);
	}
	/** get or define table */
	table(name: string, fields?: Array<FieldBuilder | ConstraintBuilder>) {
		if (!fields) return this._tables[name];
		if (this._tables[name]) throw new Error(`duplicate table ${name}`);
		return (this._tables[name] = new TableBuilder(name, fields));
	}
	mapTable<T>(fn: (table: Table) => T): T[] {
		let out: T[] = [];
		for (let k in this._tables) {
			let v = this._tables[k];
			out.push(fn(v.build()));
		}
		return out;
	}
	migrationFrom<T>(old: SchemaBuilder | Table[], fn: (newTable: Table, oldTable: Table) => T): T[] {
		old = old instanceof SchemaBuilder ? old.tables : old;
		let oldMap: {[key: string]: Table} = {};
		for (let o of old) {
			oldMap[o.name] = o;
		}
		let pmss = [];
		for (let k in this._tables) {
			let a = this._tables[k];
			let b = oldMap[k];
			delete oldMap[k];
			pmss.push(fn(a.build(), b));
		}
		for (let k in oldMap) {
			let v = oldMap[k];
			pmss.push(fn(null, v));
		}
		if (!pmss[0] || !pmss[0].then) return pmss;
		return Promise.all(pmss) as any;
	}
	sync(db: IEngine, dropTable?: boolean): Promise<string[]> {
		return db.getTables().then((tables) =>
			this.migrationFrom(tables, function (newTable, oldTable) {
				if (newTable && oldTable) return db.migration(newTable, oldTable);
				if (newTable) return db.createTable(newTable);
				if (oldTable && dropTable) return [`drop table ${db.quotes(oldTable.name)}`];
				return [];
			}).reduce((a, b) => a.concat(b), [])
		);
	}
	//#region 字段
	private field(name: string, type: string) {
		return new FieldBuilder(name, type.toLowerCase());
	}
	varchar(name: string, len: number) {
		return this.field(name, `varchar(${len})`);
	}
	text(name: string) {
		return this.field(name, `text`);
	}
	json(name: string) {
		return this.field(name, `json`);
	}
	float(name: string) {
		return this.field(name, `float`);
	}
	int(name: string) {
		return this.field(name, `int`);
	}
	opts(name: string, items: string[]) {
		return this.field(name, `int`).opts(items);
	}
	bigint(name: string) {
		return this.field(name, `bigint`);
	}
	unsigned(name: string) {
		return this.field(name, `int unsigned`);
	}
	//#endregion
	//#region 约束
	private constraint(type: ConstraintType, fields: string | string[]) {
		return new ConstraintBuilder("", fields).type(type);
	}
	primary(field: string) {
		return this.constraint("PRIMARY", field);
	}
	index(field: string) {
		return this.constraint("", field);
	}
	unique(field: string) {
		return this.constraint("UNIQUE", field);
	}
	foreign(field: string) {
		return this.constraint("FOREIGN", field);
	}
	fulltext(field: string) {
		return this.constraint("FULLTEXT", field);
	}
	//#endregion
}
