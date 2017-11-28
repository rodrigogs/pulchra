const debug = require('debug')('pulchra:Pulchra');

const Storage = require('./Storage');

class Engine extends Storage {
  /**
   * @extends Storage
   *
   * @param {Object} options
   */
  constructor(options) {
    debug('instantiating');

    super(options);
  }
}

module.exports = Engine;
