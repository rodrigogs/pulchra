const debug = require('debug')('pulchra:Storage');
const os = require('os');
const path = require('path');
const Datastore = require('nedb');

const Base = require('./Base');

const _store = db => (index, url) => new Promise((resolve, reject) => {
  debug('storing data with default store function for index', index, 'with url', url);

  db.insert({ index, url }, (err) => {
    if (err) return reject(err);
    resolve();
  });
});

const _retrieve = db => index => new Promise((resolve, reject) => {
  debug('retrieving data with default retrieve function for index', index);

  db.findOne({ index }, (err, doc) => {
    if (err) return reject(err);
    resolve(doc.url);
  });
});

const _storage = (directory) => {
  debug('creating default storage implementation for directory', directory);

  const db = new Datastore({ filename: path.join(directory, 'pulchra'), autoload: true });

  return {
    store: _store(db),
    retrieve: _retrieve(db),
  };
};

const _resolveImplementation = (impl) => {
  debug('resolving implementation');

  if (typeof impl === 'string') {
    debug('received a string', 'using default storage implementation');
    return _storage(impl);
  }

  if (typeof impl === 'object') {
    debug('received an object', 'using as implementation');

    if (typeof impl.store !== 'function') throw new Error('storage\'s store property must be a function');
    if (typeof impl.retrieve !== 'function') throw new Error('storage\'s retrieve property must be a function');

    return impl;
  }

  throw new Error('storage must be an object');
};

class Storage extends Base {
  /**
   * @function Storage~store
   * @param {Number} index Url index.
   * @param {String} url Url.
   * @return {Promise.<void>}
   */

  /**
   * @function Storage~retrieve
   * @param {Number} index Url index.
   * @return {Promise.<String>}
   */

  /**
   * @extends Base
   *
   * @param {Object} options
   * @param {String|Object} [options.storage = os.tmpdir()] Pulchra store path or object.
   * If a path is given, Pulchra will store data using its default behaviour.
   * @param {Storage~store} [options.storage.store] Storage store function.
   * This function exposes <i>index</i> and <i>url</i> as arguments.
   * This <i>url</i> must be stored somewhere somehow, referenced by its <i>index</i>.
   * @param {Storage~retrieve} [options.storage.retrieve] Storage retrieve function.
   * This function exposes the <i>index</i> as argument.
   * The function's return should be the <i>url</i> referring to the index.
   */
  constructor(options = { storage: os.tmpdir() }) {
    debug('instantiating');

    super(options);

    const storage = _resolveImplementation(options.storage);

    this._store = storage.store;
    this._retrieve = storage.retrieve;
  }

  /**
   * Retrieves an url by it's index.
   *
   * @param {Number} index
   * @param {String} url
   * @return {Promise.<void>}
   */
  async store(index, url) {
    debug('calling store function with index', index, 'and url', url);

    return this._store(index, url);
  }

  /**
   * Stores an url referenced by it's index.
   *
   * @param {Number} index
   * @return {Promise.<String>}
   */
  async retrieve(index) {
    debug('calling retrieve function with index', index);

    return this._retrieve(index);
  }
}

module.exports = Storage;
