import xs from 'xstream';
import delay from 'xstream/extra/delay';
import dropRepeats from 'xstream/extra/dropRepeats';
import isolate from '@cycle/isolate';

let _id = 0;

function id () {
  return _id++;
}

function makeItem (component, sources) {
  const newId = id();

  const newItem = isolate(component, newId.toString())(sources);

  newItem._id = newId;
  newItem._name = component.name;

  return newItem;
}

function collection(options, items = []) {
  const { component, sources, removeSinkName } = options;

  return {
    add (additionalSources = {}) {
      const newItem = makeItem(component, {...sources, ...additionalSources});
      const removeSink = newItem[removeSinkName] || xs.empty();
      newItem._remove$ = removeSink.take(1).mapTo(newItem);

      return collection(
        options,
        [...items, newItem]
      );
    },

    remove (itemForRemoval) {
      return collection(
        options,
        items.filter(item => item !== itemForRemoval)
      );
    },

    asArray () {
      return items.slice(); // returns a copy of items to avoid mutation
    }
  }
}

function Collection (component, sources = {}, add$ = xs.empty(), removeSinkName = 'remove$') {
  const removeProxy$ = xs.create();
  const addReducer$ = add$.map(sourcesList => collection => {
    if (Array.isArray(sourcesList)) {
      // multiple items
      return sourcesList.reduce((collection, sources) => collection.add(sources), collection);
    } else {
      // single item
      return collection.add(sourcesList);
    }
  });
  const removeReducer$ = removeProxy$.map(item => collection => collection.remove(item));
  const reducer$ = xs.merge(addReducer$, removeReducer$);

  const emptyCollection = collection({ component, sources, removeSinkName });
  const collection$ = reducer$
    .fold((collection, reducer) => reducer(collection), emptyCollection)
    .map(collection => collection.asArray());

  const remove$ = Collection.merge(collection$, '_remove$');
  removeProxy$.imitate(remove$);

  return collection$;
}

Collection.pluck = function pluck (collection$, sinkProperty) {
  const sinks = {};

  function sink$ (item) {
    const key = `${item._name}.${item._id}.${sinkProperty}`;

    if (sinks[key] === undefined) {
      const sink = sinkProperty === 'DOM'
        ? item[sinkProperty].map(vtree => ({...vtree, key}))
        : item[sinkProperty];
      sinks[key] = sink.remember();
    }

    return sinks[key];
  }

  return collection$
    .map(items => items.map(item => sink$(item)))
    .map(sinkStreams => xs.combine(...sinkStreams))
    .flatten()
    .startWith([]);
};

Collection.merge = function merge (collection$, sinkProperty) {
  const sinks = {};

  function sink$ (item) {
    const key = `${item._name}.${item._id}.${sinkProperty}`;

    if (sinks[key] === undefined) {
      const sink = sinkProperty === 'DOM'
        ? item[sinkProperty].map(vtree => ({...vtree, key}))
        : item[sinkProperty];
      // prevent sink from early completion and reinitialization
      sinks[key] = xs.merge(sink, xs.never());
    }

    return sinks[key];
  }

  return collection$
    .map(items => items.map(item => sink$(item)))
    .map(sinkStreams => xs.merge(...sinkStreams))
    .flatten();
};

// convert a stream of items' sources snapshots into a stream of collections
Collection.gather = function gather (component, sources, items$, removeSinkName = 'remove$', idAttribute = 'id') {
  function makeDestroyable (component) {
    return (sources) => {
      const sinks = component(sources);
      return {
        ...sinks,
        [removeSinkName]: xs.merge(sinks[removeSinkName] || xs.empty(), sources._destroy$)
      };
    };
  }

  // finds items not present in previous snapshot
  function findNewItems({prevIds}, items) {
    return {
      prevIds: items.map(item => item[idAttribute]),
      addedItems: items.filter(item => prevIds.indexOf(item[idAttribute]) === -1)
    };
  }

  function compareJSON(value, nextValue) {
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
  }

  // turn a new item into a hash of source streams, tracking all the future updates
  function itemToSourceStreams(addedItem, itemsState$) {
    const itemStateInfinite$ = itemsState$
      .map(items =>
        items.find(item => item[idAttribute] === addedItem[idAttribute])
      );
    // if an item isn't present if a new snapshot, it shall be destroyed
    const _destroy$ = itemStateInfinite$.filter(item => !item).take(1);
    const itemState$ = itemStateInfinite$.endWhen(_destroy$.compose(delay()));

    return Object.keys(addedItem)
      .reduce((sources, key) => {
        // skip idAttribute
        if (key === idAttribute) {
          return sources;
        }

        return {
          ...sources,
          [key]: itemState$
            .map(state => state[key])
            .startWith(addedItem[key])
            // skip the snapshot if the value didn't change
            .compose(dropRepeats(compareJSON))
            .remember()
        };
      }, {
        _destroy$
      });
  }

  const itemsState$ = items$.remember();
  
  const add$ = itemsState$
    // get the added items at each step
    .fold(findNewItems, {prevIds: [], addedItems: []})
    .map(({addedItems}) => addedItems)
    .filter(addedItems => addedItems.length)
    .map(addedItems => addedItems.map(item => itemToSourceStreams(item, itemsState$)));

  return Collection(makeDestroyable(component), sources, add$, removeSinkName);
};

export default Collection;
