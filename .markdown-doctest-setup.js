var Collection = require('.').default;
var xs = require('xstream').default;

module.exports = {
  require: {
    'cycle-collections': Collection
  },

  globals: {
    Collection: Collection,

    xs: xs,

    sources: {
      DOM: {
        select: () => ({events: () => xs.of('foo')})
      }
    },

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
