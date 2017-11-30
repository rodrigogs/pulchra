const debug = require('debug')('pulchra:Pulchra');
const async = require('async');

const Engine = require('./Engine');

/**
 * @param {Number} millis
 * @private
 */
const _wait = (millis = 0) => new Promise((resolve) => {
  setTimeout(resolve, millis);
});

/**
 * @param {Pulchra} instance
 * @private
 */
const _addUrl = instance => async (url) => {
  debug('adding url', url);

  try {
    await instance.store(instance._urlIndex, url);
    debug('url added', url);
    instance._urlIndex += 1;
  } catch (err) {
    debug('error adding url', url, err.message);
  }
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
  if (!plugin) return;

  const addFn = (url, cb) => {
    if (instance._addQueueSize > 100 && !instance._waitForAddQueueToDrain) {
      debug('add queue size reached more than 100 urls, queue will be drained before continue');
      instance._waitForAddQueueToDrain = true;
    }

    instance._addQueueSize += 1;
    instance._addQueueDrained = false;
    return instance._addQueue.push(url, cb);
  };

  try {
    const result = await plugin(response, addFn, custom);
    if (result === false) return;

    const nextIndex = pluginIndex + 1;
    if (instance._plugins.length >= nextIndex) {
      return _pipe(instance, response, result || custom, nextIndex);
    }
  } catch (err) {
    debug('an error occurred on plugin', pluginIndex, err.message);
    throw err;
  }
};

/**
 * @param {Pulchra} instance
 * @private
 */
const _runner = instance => async (url) => {
  try {
    this._addQueueSize -= 1;
    const response = await instance.fetch(url);
    if (response) await _pipe(instance, response, undefined, undefined);
  } catch (err) {
    debug('an error has occurred', err.message);
    instance.emit(instance.constructor.EVENTS.ERROR, err);

    if (err.response) await _pipe(instance, err.response, undefined, undefined);
  } finally {
    const index = instance._queue.indexOf(url);
    if (index > -1) instance._queue.splice(index, 1);
  }
};

/**
 * @param {Pulchra} instance
 * @private
 */
const _feed = instance => () => {
  let ready = true;

  if (instance.state !== instance.constructor.STATES.RUNNING) ready = false;
  if (instance._queue.length >= instance.options.concurrency) ready = false;
  if (instance._waitForAddQueueToDrain) ready = false;

  if (ready) {
    instance.next().then((next) => {
      if (next) {
        instance._queue.push(next);
        instance._worker.push(next);
      }
    });
  }

  _wait(100).then(_feed(instance));
};

class Pulchra extends Engine {
  /**
   * @extends Engine
   *
   * @param {Object} options Pulchra options object. Options could not be changed later.
   * @param {String} options.target Initial target.
   * @param {Number} [options.concurrency = 5] Max concurrent requests.
   * @param {Number} [options.fromIndex = 0] Index to start from.
   * @param {Object} [options.request] <a href="https://github.com/axios/axios#axioscreateconfig">Axios create config</a>
   * @param {String|Object} [options.storage = os.tmpdir()] Pulchra store path or object.
   * If a path is given, Pulchra will store data using its default behaviour.
   * @param {Storage~store} [options.storage.store] Storage store function.
   * This function exposes <i>index</i> and <i>url</i> as arguments.
   * This <i>url</i> must be stored somewhere somehow, referenced by its <i>index</i>.
   * @param {Storage~retrieve} [options.storage.retrieve] Storage retrieve function.
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
  constructor(options) {
    debug('instantiating');

    options = Object.assign({
      target: null,
      concurrency: 5,
      fromIndex: 0,
    }, options);

    if (!options.target) throw new Error('Target must be specified');

    super(options);

    this._options = options;
    this._state = Pulchra.STATES.STOPPED;
    this._plugins = [];
    this._urlIndex = options.fromIndex;
    this._storageIndex = options.fromIndex;
    this._queue = [];
    this._started = false;
    this._worker = null;
    this._addQueue = null;
    this._addQueueSize = 0;
    this._waitForAddQueueToDrain = false;
    this._addQueueDrained = true;
  }

  /**
   * Starts the crawler.
   */
  async start() {
    debug('starting');

    if (this.state === Pulchra.STATES.RUNNING) {
      return debug('already running');
    }

    if (!this._started) {
      _feed(this)();

      try {
        await _addUrl(this)(this._options.target);

        this._worker = async.queue(_runner(this), this._options.concurrency);
        this._addQueue = async.queue(_addUrl(this), 1);
        this._addQueueSize = 0;
        this._waitForAddQueueToDrain = false;

        this._addQueue.drain = () => {
          debug('add queue drained');
          this._waitForAddQueueToDrain = false;
        };

        this._started = true;
      } catch (err) {
        this.stop();
        throw new Error('Could not start the instance due to an error', err);
      }
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

    this._urlIndex = this.options.fromIndex;
    this._storageIndex = this.options.fromIndex;
    this._worker = null;
    this._addQueue = null;
    this._started = false;

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
   *    crawler.use(async (response) => {
   *      if (response.status !== 200) return false;
   *      return response.data;
   *    });
   *
   *    crawler.use(async (response, add, custom) => {
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

  /**
   * Returns options.
   *
   * @return {Object}
   */
  get options() {
    return this._options;
  }
}

module.exports = Pulchra;
