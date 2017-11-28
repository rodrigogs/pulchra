const debug = require('debug')('pulchra:Pulchra');
const { EventEmitter } = require('events');

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
    FETCHING: 'fetching',
    FETCHED: 'fetched',
  },
};

class Base extends EventEmitter {
  /**
   * @param {Object} options
   */
  constructor(options) {
    debug('instantiating');

    super();

    this._options = options;
  }

  /**
   * Returns options.
   *
   * @return {Object}
   */
  get options() {
    return this._options;
  }

  /**
   * States constant.
   *
   * @return {CONSTANTS.STATES|{RUNNING, PAUSED, STOPPED}}
   */
  static get STATES() {
    return CONSTANTS.STATES;
  }

  /**
   * Events constant.
   *
   * @return {CONSTANTS.EVENTS|{START, PAUSE, STOP, ERROR}}
   */
  static get EVENTS() {
    return CONSTANTS.EVENTS;
  }
}

module.exports = Base;
