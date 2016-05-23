var Collection = require('.').default;
var xs = require('xstream').default;

module.exports = {
  require: {
    'cycle-collections': Collection
  },

  globals: {
    TodoListItem: () => ({}),
    sources: {
      DOM: {
        select: () => ({events: () => xs.of('foo')})
      }
    },

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
