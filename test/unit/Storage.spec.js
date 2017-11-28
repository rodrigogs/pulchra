const os = require('os');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const mockfs = require('mock-fs');

chai.use(chaiAsPromised);
chai.should();

const Storage = require('../../src/Storage');

beforeEach(() => {
  mockfs({
    '/fake/dir': {},
  });
});

afterEach(() => {
  mockfs.restore();
});

suite('Storage', () => {
  suite('constructor', () => {
    test('should return an instance with the default storage implementation', () => {
      const storage = new Storage();

      storage._options.should.be.an('object');
      storage._options.storage.should.be.a('string');
      storage._options.storage.should.equal(os.tmpdir());
    });

    test('should return an instance with the default storage implementation pointing to the given path', () => {
      const storage = new Storage({ storage: '/tmp/test' });

      storage._options.should.be.an('object');
      storage._options.storage.should.be.a('string');
      storage._options.storage.should.equal('/tmp/test');
    });
  });

  suite('#store', () => {
    test('should create a storage file and store data using temp dir', async () => {
      const storage = new Storage();

      await storage.store(1, 'www.example.com');
      storage.retrieve(1).should.eventually.equal('www.example.com');
    });

    test('should create a storage file and store data', async () => {
      const storage = new Storage({ storage: '/fake/dir' });

      await storage.store(1, 'www.example.com');
      storage.retrieve(1).should.eventually.equal('www.example.com');
    });
  });
});
