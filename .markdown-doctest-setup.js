var Collection = require('.');
var xs = require('xstream').default;
var rxjsAdapter = require('@cycle/rxjs-adapter').default;

module.exports = {
  require: {
    '@cycle/rxjs-adapter': rxjsAdapter,
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
