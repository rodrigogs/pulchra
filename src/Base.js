const debug = require('debug')('pulchra:Pulchra');
const { EventEmitter } = require('events');

class Base extends EventEmitter {
  /**
   * @param {Object} options
   */
  constructor(options) {
    debug('instantiating');

    super();

    this._options = options;
  }
}

module.exports = Base;
