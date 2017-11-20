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

/**
 * @class Pulchra
 */
class Pulchra extends EventEmitter {
  /**
   * @param {Object} [options = {}]
   * @param {String} [options.target = '']
   * @param {Number} [options.concurrency = 5]
   */
  constructor(options = {
    target: '',
    concurrency: 5,
  }) {
    super();

    this._options = options;
    this._state = CONSTANTS.STATES.STOPPED;
    this._plugins = [];
  }

  /**
   */
  start() {
    this._state = CONSTANTS.STATES.RUNNING;
    this.emit(CONSTANTS.EVENTS.START);
  }

  /**
   */
  pause() {
    this.emit(CONSTANTS.EVENTS.PAUSE);
  }

  /**
   */
  stop() {
    this.emit(CONSTANTS.EVENTS.STOP);
  }

  /**
   * @param {Function} plugin
   */
  use(plugin) {
    if (!_.isFunction(plugin)) throw new Error('Plugin must be a function');

    this._plugins.push(plugin);
  }

  /**
   * @return {String} running, paused or stopped
   */
  get state() {
    return this._state;
  }

  /**
   * @return {Object}
   */
  get options() {
    return this._options;
  }
}

module.exports = Pulchra;
