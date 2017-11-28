const debug = require('debug')('pulchra:Pulchra');

const Engine = require('./Engine');

class Pulchra extends Engine {
  /**
   * @extends Engine
   *
   * @param {Object} options Pulchra options object. Options could not be changed later.
   * @param {String} options.target Initial target.
   * @param {Number} [options.concurrency = 5] Max concurrent requests.
   * @param {Number} [options.fromIndex = 0] Index to start from.
   *
   * @example
   * const Pulchra = require('pulchra');
   *
   * const crawler = new Pulchra({
   *   target: 'example.com',
   *   concurrency: 10,
   *   storage: {
   *     store: async (index, url) => {
   *       await myStoreFunction(index, url);
   *     },
   *     retrieve: async (index) => {
   *       return await myRetrieveFunction(index);
   *     },
   *   },
   * });
   */
  constructor(options = {
    target: null,
    concurrency: 5,
    fromIndex: 0,
  }) {
    debug('instantiating');

    if (!options.target) throw new Error('Target must be specified');

    super(options);

    this._options = options;
    this._state = Pulchra.STATES.STOPPED;
    this._currentIndex = options.fromIndex;
    this._plugins = [];
  }

  /**
   * Starts the crawler.
   */
  start() {
    debug('starting');

    if (this.state === Pulchra.STATES.RUNNING) {
      return debug('already running');
    }

    this._state = Pulchra.STATES.RUNNING;
    this.emit(Pulchra.EVENTS.START);
  }

  /**
   * Pauses the crawler.
   * Crawler may be resumed from the point it was paused.
   */
  pause() {
    debug('pausing');

    if (this.state === Pulchra.STATES.PAUSED) {
      return debug('already paused');
    }

    this._state = Pulchra.STATES.PAUSED;
    this.emit(Pulchra.EVENTS.PAUSE);
  }

  /**
   * Pauses the crawler.
   * Queue will be cleared.
   */
  stop() {
    debug('stopping');

    if (this.state === Pulchra.STATES.STOPPED) {
      return debug('already stopped');
    }

    this._state = Pulchra.STOPPED;
    this.emit(Pulchra.EVENTS.STOP);
  }

  /**
   * @function Pulchra~pluginAdd
   * @param {String} url Url to add to queue.
   */

  /**
   * @function Pulchra~plugin
   * @param {Object} response Axios response.
   * @param {Pulchra~pluginAdd} add Add url function.
   * @param {String} custom Custom result from the previous plugin.
   *
   * @return {Boolean.<false>|Promise.<Boolean.<false>|*>}
   */

  /**
   * Plugin function works like a middleware to manage returned responses.
   * This function exposes an <i>axios response</i> as the first argument.
   * The second argument is a function that accepts an string or an string[] as argument. Urls
   * passed to this function will be added to the queue.
   * The return of this function will always be passed to the next plugin as the third argument.
   * If no return is given, next plugin receives the last returned value by a plugin.
   * If a strict <i>false</i> is returned by a plugin,
   * this response's propagation will be immediately stopped.
   *
   * @param {Pulchra~plugin} plugin
   * @return {Pulchra} self
   *
   * @example
   *    crawler.use(async (response, custom, add) => {
   *      if (response.status === '200') custom = response.data;
   *    });
   *
   *    crawler.use(async (response, custom, add) => {
   *      const links = findLinks(custom);
   *      links.forEach(add);
   *    });
   */
  use(plugin) {
    debug('adding plugin');

    if (typeof plugin !== 'function') throw new Error('Plugin must be a function');

    this._plugins.push(plugin);
    return this;
  }

  /**
   * Returns crawler's current state.
   *
   * @return {String} running, paused or stopped
   */
  get state() {
    return this._state;
  }
}

module.exports = Pulchra;
