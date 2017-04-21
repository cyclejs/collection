var Collection = require('.');
var xs = require('xstream').default;

module.exports = {
  require: {
    '@cycle/collection': Collection
  },

  globals: {
    Collection: Collection.default,

    xs: xs,

    sources: {
      DOM: {
        select: () => ({events: () => xs.of('foo')})
      }
    },

    additionalSources: {},
    firstSources: {},
    secondSources: {},

    add$: xs.empty(),

    Task() {},
    fetchedTasks$: xs.of([]),

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
