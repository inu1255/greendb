"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Wherable = exports.Tablable = exports.Runnable = exports.Base = void 0;
var _1 = require(".");
var Base = /** @class */ (function () {
    function Base() {
    }
    return Base;
}());
exports.Base = Base;
function Runnable(Base) {
    return /** @class */ (function (_super) {
        __extends(class_1, _super);
        function class_1() {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            return _super.apply(this, args) || this;
        }
        class_1.prototype.quiet = function () {
            this.ignore_log = true;
            return this;
        };
        class_1.prototype.engine = function (e) {
            this._e = e;
            return this;
        };
        class_1.prototype.run = function () {
            return this._e.runSql(this);
        };
        class_1.prototype.$pms = function () {
            if (this.$$pms)
                return this.$$pms;
            return (this.$$pms = this.run());
        };
        class_1.prototype.then = function (onfulfilled, onrejected) {
            return this.$pms().then(onfulfilled, onrejected);
        };
        class_1.prototype.catch = function (onrejected) {
            return this.$pms().catch(onrejected);
        };
        class_1.prototype.finally = function (onfinally) {
            return this.$pms().finally(onfinally);
        };
        return class_1;
    }(Base));
}
exports.Runnable = Runnable;
function Tablable(Base) {
    return /** @class */ (function (_super) {
        __extends(class_2, _super);
        function class_2() {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            return _super.apply(this, args) || this;
        }
        class_2.prototype.table = function (table) {
            this._table = table;
            return this;
        };
        return class_2;
    }(Base));
}
exports.Tablable = Tablable;
function Wherable(Base) {
    return /** @class */ (function (_super) {
        __extends(class_3, _super);
        function class_3() {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            var _this = _super.apply(this, args) || this;
            _this._where = new _1.Where();
            return _this;
        }
        class_3.prototype.where = function (key, value) {
            this._where.and(key, value);
            return this;
        };
        class_3.prototype.orWhere = function (key, value) {
            this._where.or(key, value);
            return this;
        };
        class_3.prototype.build = function () {
            this._where.build();
            return this;
        };
        return class_3;
    }(Base));
}
exports.Wherable = Wherable;
