'use strict';
const expect = require('chai').expect;
const greendb = require('../dist/index');

describe('greendb function test', () => {
	it('camelCase', () => {
		var result = greendb.CamelCase('foo_bar')
		expect(result).to.equal('FooBar');
		var result = greendb.camelCase('foo_bar')
		expect(result).to.equal('fooBar');
	});
});