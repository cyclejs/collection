import xs from 'xstream';
import isolate from '@cycle/isolate';

let _id = 0;

function id () {
  return _id++;
}

function handlerStreams (component, item, handlers = {}) {
  const sinkStreams = Object.keys(item).map(sink => {
    if (handlers[sink] === undefined) {
      return null;
    }

    const handler = handlers[sink];
    const sink$ = item[sink];

    return sink$.map(event => {
      event.stopPropagation && event.stopPropagation();

      const handlerReducer = (state) => handler(state, item, event);

      return handlerReducer;
    });
  });

  return xs.merge(...sinkStreams.filter(reducer => reducer !== null));
}

function makeItem (component, sources, props) {
  const newId = id();

  const newItem = isolate(component, newId.toString())(sources);

  newItem.id = newId;
  newItem.name = component.name;

  return newItem;
}

function Collection (component, sources = {}, handlers = {}, items = [], reducers = xs.create()) {
  return {
    add (additionalSources = {}) {
      const newItem = makeItem(component, {...sources, ...additionalSources});

      reducers.imitate(handlerStreams(component, newItem, handlers));

      return Collection(
        component,
        sources,
        handlers,
        [...items, newItem],
        reducers
      );
    },

    remove (itemForRemoval) {
      return Collection(
        component,
        sources,
        handlers,
        items.filter(item => item !== itemForRemoval),
        reducers
      );
    },

    asArray () {
      return items.slice(); // returns a copy of items to avoid mutation
    },

    reducers
  };
}

Collection.pluck = function pluck (collection$, sinkProperty) {
  const sinks = {};

  function sink$ (item) {
    const key = `${item.name}.${item.id}.${sinkProperty}`;

    if (sinks[key] === undefined) {
      if (sinkProperty === 'DOM') {
        sinks[key] = item[sinkProperty].map(vtree => ({...vtree, key})).remember();
      } else {
        sinks[key] = item[sinkProperty].remember();
      }
    }

    return sinks[key];
  }

  return collection$
    .map(collection => collection.asArray().map(item => sink$(item)))
    .map(sinkStreams => xs.combine((...items) => items, ...sinkStreams))
    .flatten()
    .startWith([]);
};

export default Collection;
