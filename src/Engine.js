const debug = require('debug')('pulchra:Engine');
const axios = require('axios');
const async = require('async');

const Storage = require('./Storage');

/**
 * @param {Pulchra} instance
 * @private
 */
const _add = instance => (...urls) => {
  async.eachSeries(urls, async (url) => {
    try {
      await instance.store(instance._urlIndex, url);
      instance._urlIndex += 1;
    } catch (ignore) {
      // ignore
    }
  });
};

/**
 * @param {Pulchra} instance
 * @param {Object} response
 * @param {*} custom
 * @param {Number} [pluginIndex = 0]
 * @return {Promise}
 * @private
 */
const _pipe = async (instance, response, custom, pluginIndex = 0) => {
  const plugin = instance._plugins[pluginIndex];

  const result = await plugin(response, _add(instance), custom);
  if (result === false) return;

  const nextIndex = pluginIndex + 1;
  if (instance._plugins.length >= nextIndex) {
    return _pipe(instance, response, result || custom, nextIndex);
  }
};

/**
 * @param {Pulchra} instance
 * @private
 */
const _runner = instance => async (url) => {
  try {
    const response = await instance.fetch(url);

    return _pipe(instance, response, undefined, undefined);
  } catch (err) {
    debug('an error has occurred', err);
    instance.emit(instance.EVENTS.ERROR, err);
  }
};

/**
 * @param {Pulchra} instance
 * @private
 */
const _feed = instance => () => {
  if (instance.state !== instance.STATES.RUNNING) return _feed(instance)();
  if (instance._queue.length >= instance._concurrency) return _feed(instance)();

  const next = instance.next();
  if (next) {
    instance._queue.push(next);
    instance._worker.push(next);
  }

  _feed(instance)();
};

class Engine extends Storage {
  /**
   * @extends Storage
   *
   * @param {Object} [options] Engine options
   * @param {Object} [options.request] <a href="https://github.com/axios/axios#axioscreateconfig">Axios create config</a>
   */
  constructor(options) {
    debug('instantiating');

    options = Object.assign({
      request: {},
    }, options);

    super(options);

    this._request = axios.create(options.request);
    this._urlIndex = options.fromIndex;
    this._storageIndex = options.fromIndex;
    this._worker = async.queue(_runner(this));
    this._queue = [];

    this._worker.push(this._options.target);

    _feed(this)();
  }

  /**
   * @param {String} url Url to be fetched.
   * @return {Promise.<Object>}
   */
  async fetch(url) {
    debug('fetching url', url);

    this.emit(Engine.EVENTS.FETCHING, url);

    try {
      const response = await this._request.get(url);
      debug('fetched url', url);

      this.emit(Engine.EVENTS.FETCH_SUCCESS, response);

      return response;
    } catch (err) {
      debug('fetch error', url, err);
      this.emit(Engine.EVENTS.FETCH_ERROR, err);
    } finally {
      this.emit(Engine.EVENTS.FETCHED);
    }
  }

  /**
   * @return {Promise.<Object|null>}
   */
  async next() {
    try {
      const url = await this.retrieve(this._storageIndex);
      if (!url) return null;

      this._storageIndex += 1;
      return url;
    } catch (err) {
      debug('error retrieving url', this._storageIndex);
      this.emit(Engine.EVENTS.ERROR, err);
    }
  }
}

module.exports = Engine;
