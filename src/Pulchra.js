const debug = require('debug')('pulchra:Pulchra');
const os = require('os');
const { EventEmitter } = require('events');
const _ = require('lodash');

const CONSTANTS = {
  STATES: {
    RUNNING: 'running',
    PAUSED: 'paused',
    STOPPED: 'stopped',
  },
  EVENTS: {
    START: 'start',
    PAUSE: 'pause',
    STOP: 'stop',
    ERROR: 'error',
  },
};

class Pulchra extends EventEmitter {
  /**
   * @param {Object} options Pulchra options object. Options could not be changed later.
   * @param {String} options.target Initial target.
   * @param {Number} [options.concurrency = 5] Max concurrent requests.
   * @param {String|Object} [options.storage = os.tmpdir()] Pulchra store path or object.
   * If a path is given, Pulchra will store data using its default behaviour.
   * @param {Promise.<void>} [options.storage.store] Storage store function.
   * This function exposes <i>index</i> and <i>url</i> as arguments.
   * This <i>url</i> must be stored somewhere somehow, referenced by its <i>index</i>.
   * @param {Promise.<String>} [options.storage.retrieve] Storage retrieve function.
   * This function exposes the <i>index</i> as argument.
   * The function's return should be the <i>url</i> referring to the index.
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
    storage: os.tmpdir(),
  }) {
    if (!options.target) throw new Error('Target must be specified');

    super();

    this._options = options;
    this._state = CONSTANTS.STATES.STOPPED;
    this._plugins = [];
  }

  /**
   * Starts the crawler.
   */
  start() {
    debug('starting');

    if (this.state === CONSTANTS.STATES.RUNNING) {
      return debug('already running');
    }

    this._state = CONSTANTS.STATES.RUNNING;
    this.emit(CONSTANTS.EVENTS.START);
  }

  /**
   * Pauses the crawler.
   * Crawler may be resumed from the point it was paused.
   */
  pause() {
    debug('pausing');

    if (this.state === CONSTANTS.STATES.PAUSED) {
      return debug('already paused');
    }

    this._state = CONSTANTS.STATES.PAUSED;
    this.emit(CONSTANTS.EVENTS.PAUSE);
  }

  /**
   * Pauses the crawler.
   * Queue will be cleared.
   */
  stop() {
    debug('stopping');

    if (this.state === CONSTANTS.STATES.STOPPED) {
      return debug('already stopped');
    }

    this._state = CONSTANTS.STOPPED;
    this.emit(CONSTANTS.EVENTS.STOP);
  }

  /**
   * Plugin function works like a middleware to manage returned responses.
   * This function exposes an <i>axios response</i> argument.
   * The return of this function will always be passed to the next plugin as the second argument.
   * If no return is given, next plugin receives the last returned value by a plugin.
   * If a strict <i>false</i> is returned by a plugin,
   * this response's propagation will be immediately stopped.
   * The third argument is a function that accepts an string or an string[] as argument. Urls
   * passed to this function will be added to the queue.
   *
   * @param {Promise.<Boolean|*>} plugin
   * @return {Pulchra} self
   *
   * @example
   *    crawler.use(async (response, custom, add) => {
   *      if (response.status === '200') custom = response.data;
   *    });

   *    crawler.use(async (response, custom, add) => {
   *      const links = findLinks(custom);
   *      links.forEach(add);
   *    });
   */
  use(plugin) {
    if (!_.isFunction(plugin)) throw new Error('Plugin must be a function');

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

  /**
   * Returns crawler's options.
   *
   * @return {Object}
   */
  get options() {
    return this._options;
  }

  /**
   * Pulchra states constant.
   *
   * @return {CONSTANTS.STATES|{RUNNING, PAUSED, STOPPED}}
   */
  static get STATES() {
    return CONSTANTS.STATES;
  }

  /**
   * Pulchra events constant.
   *
   * @return {CONSTANTS.EVENTS|{START, PAUSE, STOP, ERROR}}
   */
  static get EVENTS() {
    return CONSTANTS.EVENTS;
  }
}

module.exports = Pulchra;
