import xs from 'xstream';
import dropRepeats from 'xstream/extra/dropRepeats';
import isolate from '@cycle/isolate';

let _id = 0;

function id () {
  return _id++;
}

function makeItem (component, sources) {
  const newId = id();

  const newItem = isolate(component, newId.toString())(sources);

  newItem.id = newId;
  newItem.name = component.name;

  return newItem;
}

function collection(options, items = [], removeSinkHash = {}) {
  const { component, sources, removeSinkName } = options;

  return {
    add (additionalSources = {}) {
      const newItem = makeItem(component, {...sources, ...additionalSources});
      const removeSink = newItem[removeSinkName] || xs.empty();

      return collection(
        options,
        [...items, newItem],
        {
          ...removeSinkHash,
          [newItem.id]: removeSink.take(1).mapTo(newItem)
        }
      );
    },

    remove (itemForRemoval) {
      const id = itemForRemoval && itemForRemoval.id;

      return collection(
        options,
        items.filter(item => item !== itemForRemoval),
        {
          ...removeSinkHash,
          [id]: xs.empty()
        }
      );
    },

    asArray () {
      return items.slice(); // returns a copy of items to avoid mutation
    },

    mergedRemoveSinks () {
      return xs.merge(...items.map(({id}) => removeSinkHash[id]));
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
  const collection$ = reducer$.fold((collection, reducer) => reducer(collection), emptyCollection);

  const remove$ = collection$
    .map(collection => collection.mergedRemoveSinks())
    .flatten();
  removeProxy$.imitate(remove$);

  return collection$.map(collection => collection.asArray());
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
    .map(items => items.map(item => sink$(item)))
    .map(sinkStreams => xs.combine(...sinkStreams))
    .flatten()
    .startWith([]);
};

// convert a stream of items' sources snapshots into a stream of collections
Collection.gather = function gather (component, sources, itemsState$, removeSinkName = 'remove$', idAttribute = 'id') {
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
  function itemToSourceStreams(addedItem) {
    const itemStateInfinite$ = itemsState$
      .map(items =>
        items.find(item => item[idAttribute] === addedItem[idAttribute])
      );
    // if an item isn't present if a new snapshot, it shall be destroyed
    const _destroy$ = itemStateInfinite$.filter(item => !item).take(1);
    const itemState$ = itemStateInfinite$.endWhen(_destroy$);

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

  const add$ = itemsState$
    // get the added items at each step
    .fold(findNewItems, {prevIds: [], addedItems: []})
    .map(({addedItems}) => addedItems)
    .filter(addedItems => addedItems.length)
    .map(addedItems => addedItems.map(itemToSourceStreams));

  return Collection(makeDestroyable(component), sources, add$, removeSinkName);
};

export default Collection;
