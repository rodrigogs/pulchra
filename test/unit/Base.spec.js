const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
chai.should();

const Base = require('../../src/Base');

before(() => {
});

after(() => {
});

suite('Base', () => {
  suite('constructor', () => {
    test('should return an instance with options', () => {
      const options = { test: 'test', test2: 'test2' };
      const base = new Base(options);

      base._options.should.be.an('object');
      base._options.should.be.equal(options);
    });
  });
});
