const debug = require('debug')('pulchra:Base');
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
    FETCH_SUCCESS: 'fetch_success',
    FETCH_ERROR: 'fetch_error',
    FETCHED: 'fetched',
    URL_STORE_SUCCESS: 'url_store_success',
    URL_STORE_ERROR: 'url_store_error',
    URL_RETRIEVE_SUCCESS: 'url_retrieve_success',
    URL_RETRIEVE_ERROR: 'url_retrieve_error',
  },
};

class Base extends EventEmitter {
  constructor() {
    debug('instantiating');

    super();
  }

  /**
   * States constant.
   *
   * @return {CONSTANTS.STATES|{RUNNING, PAUSED, STOPPED}}
   * @constructor
   */
  static get STATES() {
    return CONSTANTS.STATES;
  }

  /**
   * Events constant.
   * @return {CONSTANTS.EVENTS|{START, PAUSE, STOP, ERROR, FETCHING, FETCH_SUCCESS, FETCH_ERROR,
   * FETCHED, URL_STORE_SUCCESS, URL_STORE_ERROR, URL_RETRIEVE_SUCCESS, URL_RETRIEVE_ERROR}}
   * @constructor
   */
  static get EVENTS() {
    return CONSTANTS.EVENTS;
  }
}

module.exports = Base;
