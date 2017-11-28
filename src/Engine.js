const debug = require('debug')('pulchra:Pulchra');
const axios = require('axios');

const Storage = require('./Storage');

class Engine extends Storage {
  /**
   * @extends Storage
   *
   * @param {Object} [options] Engine options
   * @param {Object} [options.request] <a href="https://github.com/axios/axios#axioscreateconfig">Axios create config</a>
   */
  constructor(options = { request: {} }) {
    debug('instantiating');

    super(options);

    this._request = axios.create(options.request);
  }

  /**
   * @param {String} url Url to be fetched.
   * @return {Promise.<Object>}
   */
  async fetch(url) {
    this.emit(Engine.EVENTS.FETCHING, url);

    const res = await this._request.get(url);

    this.emit(Engine.EVENTS.FETCHED, res);

    return res;
  }
}

module.exports = Engine;
