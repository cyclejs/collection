import xs from 'xstream';
import dropRepeats from 'xstream/extra/dropRepeats';
import isolate from '@cycle/isolate';

let _id = 0;

function id () {
  return _id++;
}

function handlerStreams (item, handlers = {}) {
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

function makeItem (component, sources) {
  const newId = id();

  const newItem = isolate(component, newId.toString())(sources);

  newItem.id = newId;
  newItem.name = component.name;

  return newItem;
}

function collection(options, items = [], handler$Hash = {}) {
  const { component, sources, handlers, reducers, proxy } = options;

  return {
    add (additionalSources = {}) {
      const newItem = makeItem(component, {...sources, ...additionalSources});
      const handler$ = handlerStreams(newItem, handlers);
      handler$.addListener(proxy);

      return collection(
        options,
        [...items, newItem],
        {
          ...handler$Hash,
          [newItem.id]:handler$
        }
      );
    },

    remove (itemForRemoval) {
      const id = itemForRemoval && itemForRemoval.id;
      id && handler$Hash[id] && handler$Hash[id].removeListener(proxy);

      return collection(
        options,
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
  };

  return collection({ component, sources, handlers, reducers, proxy });
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

// convert a stream of items' sources snapshots into a stream of collections
Collection.gather = function gather (itemsState$ , component, sources, handlers = {}, idAttribute = 'id') {
  const makeDestroyable = component => (sources) => {
    const sinks = component(sources);
    return {
      ...sinks,
      remove$: xs.merge(sinks.remove$ || xs.never(), sources.destroy$)
    };
  };
  const collection = Collection(makeDestroyable(component), sources, {
    remove$: (collection, item) => collection.remove(item),
    ...handlers
  });
  // each time a new item appears, it should be added to the collection
  const addReducers$ = itemsState$
    // get the added items at each step
    .fold(
      ({prevIds}, items) => ({
        prevIds: items.map(item => item[idAttribute]),
        addedItems: items.filter(item => prevIds.indexOf(item[idAttribute]) === -1)
      }),
      {
        prevIds: [],
        addedItems: []
      }
    )
    .map(({addedItems}) => addedItems)
    .filter(addedItems => addedItems.length)
    // turn each new item into a hash of source streams, tracking all the future updates
    .map(addedItems =>
      addedItems.map(addedItem => {
        const itemStateInfinite$ = itemsState$
          .map(items =>
            items.find(item => item[idAttribute] === addedItem[idAttribute])
          );
        // if an item isn't present if a new snapshot, it shall be destroyed
        const destroy$ = itemStateInfinite$.filter(item => !item).take(1);
        const itemState$ = itemStateInfinite$.endWhen(destroy$);
        
        return Object.keys(addedItem)
          .reduce((sources, key) => {
            if (key === idAttribute) {
              return sources;
            }

            return {
              ...sources,
              [key]: itemState$
                .map(state => state[key])
                .startWith(addedItem[key])
                // skip the snapshot if the value didn't change
                .compose(dropRepeats((value, nextValue) => {
                  if (value === nextValue) {
                    return true;
                  }
                  try {
                    if (JSON.stringify(value) === JSON.stringify(nextValue)) {
                      return true;
                    }
                  } catch(e) {}
                  // if not equal or not serializable
                  return false;
                }))
                .remember()
            };
          }, {
            destroy$
          })
      })
    )
    .map(itemsSources => collection =>
      itemsSources.reduce(
        (collection, sources) => collection.add(sources),
        collection
      )
    );
  return xs.merge(addReducers$, collection.reducers)
      .fold((collection, reducer) => reducer(collection), collection);
};

export default Collection;
