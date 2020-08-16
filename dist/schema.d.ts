import { IEngine } from ".";
interface IField {
    name: string;
    type: string;
    table: string;
    default: string;
    comment: string;
    charset: string;
    null: boolean;
    inc: boolean;
    opts?: string[];
    mocks?: any[];
    update?: string;
}
export declare class Field {
    name: string;
    type: string;
    table: string;
    default: string;
    comment: string;
    charset: string;
    null: boolean;
    inc: boolean;
    opts?: string[];
    mocks?: any[];
    update?: string;
    constructor();
    equal(b: Field): boolean;
    strictEqual(b: Field, typeFn?: (type: string) => string): boolean;
}
export declare class FieldBuilder {
    private _field;
    constructor(name: string, type: string);
    from(f: IField): this;
    table(table: string): this;
    notNull(): this;
    auto_increment(): this;
    default(def: any): this;
    charset(charset: string): this;
    comment(comment: string): this;
    opts(items: string[]): this;
    mock(items: any[]): this;
    update(v: string): this;
    build(): Field;
}
export declare type ConstraintType = "" | "PRIMARY" | "UNIQUE" | "FOREIGN" | "FULLTEXT";
interface IConstraint {
    type: ConstraintType;
    fields: string[];
    name: string;
    ref_table: string;
    ref_fields: string[];
}
export declare class Constraint {
    type: ConstraintType;
    fields: string[];
    name: string;
    ref_table: string;
    ref_fields: string[];
    constructor(name?: string);
    equal(b: Constraint): boolean;
}
export declare class ConstraintBuilder {
    private _constraint;
    private _table;
    constructor(type: ConstraintType, fields: string | string[]);
    type(type: ConstraintType): this;
    fields(fields: string | string[]): this;
    name(name: string): this;
    table(table: string): this;
    references(table: string, fields: string | string[]): this;
    addFields(fields: string | string[]): this;
    addRefFields(fields: string | string[]): this;
    build(): Constraint;
}
export declare type TableChange = {
    type: "create" | "drop";
    data: Constraint;
} | {
    from: Field;
    to: Field;
    after?: string;
};
export declare class Table {
    name: string;
    fields: {
        [key: string]: Field;
    };
    constraints: {
        [key: string]: Constraint;
    };
    primary?: Constraint;
    comment: string;
    mysql_engine: "MyISAM" | "InnoDB";
    charset: string;
    inc: number;
    constructor(name: string, fields?: Array<FieldBuilder | ConstraintBuilder>);
    addField(field: IField): void;
    addConstraint(constraint: Constraint): void;
    mapField<T>(fn: (field: Field) => T): T[];
    mapConstraint<T>(fn: (constraint: Constraint) => T): T[];
    migrationFrom(table: Table, compareField?: (a: Field, b: Field) => boolean): TableChange[];
}
export declare class TableBuilder {
    private _constraint_idx;
    private _constraint_map;
    private _table;
    constructor(name: string, fields?: Array<FieldBuilder | ConstraintBuilder>);
    addField(field: IField): void;
    addConstrain(constraint: IConstraint): ConstraintBuilder;
    comment(comment: string): this;
    mysql_engine(engine: "MyISAM" | "InnoDB"): this;
    charset(charset: string): this;
    auto_increment(n: number): this;
    constraint(type: ConstraintType, fields: string | string[]): ConstraintBuilder;
    build(): Table;
}
export declare class SchemaBuilder {
    private _tables;
    constructor();
    readonly tables: Table[];
    table(name: string, fields?: Array<FieldBuilder | ConstraintBuilder>): Table;
    mapTable<T>(fn: (table: Table) => T): T[];
    migrationFrom(old: SchemaBuilder | Table[], fn: (newTable: Table, oldTable: Table) => Promise<any>): Promise<any[]>;
    sync(db: IEngine, dropTable?: boolean): Promise<any[]>;
    add(tables: Table[]): this;
    private field;
    varchar(name: string, len: number): FieldBuilder;
    text(name: string): FieldBuilder;
    json(name: string): FieldBuilder;
    float(name: string): FieldBuilder;
    int(name: string): FieldBuilder;
    opts(name: string, items: string[]): FieldBuilder;
    bigint(name: string): FieldBuilder;
    unsigned(name: string): FieldBuilder;
    private constraint;
    primary(field: string): ConstraintBuilder;
    index(field: string): ConstraintBuilder;
    unique(field: string): ConstraintBuilder;
    foreign(field: string): ConstraintBuilder;
    fulltext(field: string): ConstraintBuilder;
}
export {};
