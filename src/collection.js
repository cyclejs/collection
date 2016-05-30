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
      event && event.stopPropagation && event.stopPropagation();

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

function Collection (component, sources = {}, handlers = {}) {
  const reducers = xs.create();
  const proxy = {
    next(value) {
      reducers.shamefullySendNext(value);
    },
    error(err) {
      reducers.shamefullySendError(err);
    },
    complete() {
      // Maybe autoremove here?
    }
  }

  return (function _Collection(items = [], handler$Hash = {}) {
    return {
      add (additionalSources = {}) {
        const newItem = makeItem(component, {...sources, ...additionalSources});
        const handler$ = handlerStreams(component, newItem, handlers);
        handler$.addListener(proxy);

        return _Collection(
            [...items, newItem],
            {
              ...handler$Hash,
              [newItem.id]: handler$
            }
        );
      },

      remove (itemForRemoval) {
        const id = itemForRemoval && itemForRemoval.id;
        id && handler$Hash[id] && handler$Hash[id].removeListener(proxy);
        return _Collection(
            items.filter(item => item !== itemForRemoval),
            {
              ...handler$Hash,
              [id]: null
            }
        );
      },

      asArray () {
        return items.slice(); // returns a copy of items to avoid mutation
      },

      reducers
    }
  })();
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
