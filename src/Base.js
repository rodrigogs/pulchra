const debug = require('debug')('pulchra:Base');
const { EventEmitter } = require('events');

class Base extends EventEmitter {
  constructor() {
    debug('instantiating');

    super();
  }
}

module.exports = Base;
