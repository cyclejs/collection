var Collection = require('.').default;
var xs = require('xstream').default;

module.exports = {
  globals: {
    Collection: Collection,

    DOM: {
      select: function () {
        return {
          events: function () {
            return xs.of({});
          }
        }
      }
    }
  }
}
