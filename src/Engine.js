const debug = require('debug')('pulchra:Engine');
const axios = require('axios');

const Storage = require('./Storage');

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
    this._storageIndex = options.fromIndex;
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
      if (this._storageIndex > this._urlIndex) return null;

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
