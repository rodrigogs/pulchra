const debug = require('debug')('pulchra:Pulchra');
const async = require('async');

const Engine = require('./Engine');

const _add = instance => (...urls) => {
  async.eachSeries(urls, async (url) => {
    instance.store(instance._currentTndex, url);
    instance._currentTndex += 1;
  });
};

const _pipe = instance => response => custom => async (index = 0) => {
  const plugin = instance._plugins[index];

  const result = await plugin(response, _add(instance), custom);
  if (result === false) return;

  const nextIndex = index + 1;
  if (instance._plugins.length >= nextIndex) {
    return _pipe(instance)(response)(result || custom)(nextIndex);
  }
};

/**
 * @param {Pulchra} instance
 * @private
 */
const _run = instance => async (url) => {
  try {
    const response = await instance.fetch(url);

    return _pipe(instance)(response)()();
  } catch (err) {
    debug('an error has occurred', err);
    instance.emit(instance.EVENTS.ERROR, err);
  }
};

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
    this._currentTndex = options.fromIndex;
    this._queueSize = 0;
  }

  /**
   * Starts the crawler.
   */
  start() {
    debug('starting');

    if (this.state === Pulchra.STATES.RUNNING) {
      return debug('already running');
    }

    if (!this._queue) {
      this._queue = async.queue(_run(this));
      this._queue.push(this._options.target);
    }

    this._state = Pulchra.STATES.RUNNING;
    this.emit(Pulchra.EVENTS.START);

    const incrementQueue = () => {
      if (this._queueSize < this.options.concurrency) {
        this._queueSize += 1;

        this.next()
          .then((url) => {
            if (!url) {
              this._queueSize -= 1;
              return;
            }
            this._queue.push(url);
          })
          .catch(() => {
            this._queueSize -= 1;
          });
      }
    };

    let syncInterval;

    const bindEvents = () => {
      syncInterval = setInterval(incrementQueue, 5000);

      this.on(Pulchra.EVENTS.FETCHED, () => {
        this._queueSize -= 1;
        incrementQueue();
      });

      this.on(Pulchra.EVENTS.URL_STORE_SUCCESS, incrementQueue);
    };

    const unbindEvents = () => {
      this.off(Pulchra.EVENTS.FETCHED);
      this.off(Pulchra.EVENTS.URL_STORE_SUCCESS);
      clearInterval(syncInterval);
    };

    this.once(Pulchra.EVENTS.STOP, unbindEvents);
    this.once(Pulchra.EVENTS.PAUSE, unbindEvents);

    bindEvents();
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

    this._queue = null;
    this._queueSize = 0;
    this._currentTndex = this.options.fromIndex;
    this._storageIndex = this.options.fromIndex;

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
}

module.exports = Pulchra;
