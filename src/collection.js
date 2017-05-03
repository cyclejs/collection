import xs from 'xstream';
import dropRepeats from 'xstream/extra/dropRepeats';
import isolate from '@cycle/isolate';
import {adapt} from '@cycle/run/lib/adapt';

const noop = Function.prototype;

function isVtree (x) {
  return x && typeof x.sel === 'string';
}

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

function makeCollection () {
  function collection (options, items = []) {
    const { component, sources, removeSelector } = options;

    return {
      add (additionalSources = {}) {
        const newItem = makeItem(component, {...sources, ...additionalSources});
        const selectedSink = removeSelector(newItem) || xs.empty();
        const removeSink = xs.fromObservable(selectedSink);
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
    };
  }

  function Collection (component, sources = {}, sourceAdd$ = xs.empty(), removeSelector = noop) {
    const removeProxy$ = xs.create();
    const add$ = xs.fromObservable(sourceAdd$);
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
    const reducer$ = xs.merge(removeReducer$, addReducer$);

    const emptyCollection = collection({ component, sources, removeSelector });
    const collection$ = reducer$
      .fold((collection, reducer) => reducer(collection), emptyCollection)
      .map(collection => collection.asArray());

    const remove$ = Collection.merge(collection$, item => item._remove$, true);
    removeProxy$.imitate(remove$);

    return adapt(collection$);
  }

  Collection.pluck = function pluck (sourceCollection$, pluckSelector) {
    const sinks = {};

    function sink$ (item) {
      const key = item._id;

      if (sinks[key] === undefined) {
        const selectedSink = xs.fromObservable(pluckSelector(item));
        const sink = selectedSink.map(x =>
          isVtree(x) && x.key == null ? {...x, key} : x
        );
        sinks[key] = sink.remember();
      }

      return sinks[key];
    }

    const collection$ = xs.fromObservable(sourceCollection$);
    const outputCollection$ = collection$
      .map(items => items.map(item => sink$(item)))
      .map(sinkStreams => xs.combine(...sinkStreams))
      .flatten()
      .startWith([]);
    return adapt(outputCollection$);
  };

  Collection.merge = function merge (sourceCollection$, mergeSelector, internal = false) {
    const sinks = {};

    function sink$ (item) {
      const key = item._id;

      if (sinks[key] === undefined) {
        const selectedSink = xs.fromObservable(mergeSelector(item));
        const sink = selectedSink.map(x =>
          isVtree(x) && x.key == null ? {...x, key} : x
        );
        // prevent sink from early completion and reinitialization
        sinks[key] = xs.merge(sink, xs.never());
      }

      return sinks[key];
    }

    const collection$ = xs.fromObservable(sourceCollection$);
    const outputCollection$ = collection$
      .map(items => items.map(item => sink$(item)))
      .map(sinkStreams => xs.merge(...sinkStreams))
      .flatten();
    return internal
      ? outputCollection$
      : adapt(outputCollection$);
  };

  // convert a stream of items' sources snapshots into a stream of collections
  Collection.gather = function gather (component, sources, sourceItems$, idAttribute = 'id', transformKey = null) {
    function makeDestroyable (component) {
      return (sources) => ({
        ...component(sources),
        _destroy$: sources._destroy$
      });
    }

    // finds items not present in previous snapshot
    function findNewItems ({prevIds}, items) {
      return {
        prevIds: items.map(item => item[idAttribute]),
        addedItems: items.filter(item => prevIds.indexOf(item[idAttribute]) === -1)
      };
    }

    function compareJSON (value, nextValue) {
      if (value === nextValue) {
        return true;
      }
      try {
        if (JSON.stringify(value) === JSON.stringify(nextValue)) {
          return true;
        }
      } catch (e) {}
      // if not equal or not serializable
      return false;
    }

    // turn a new item into a hash of source streams, tracking all the future updates
    function itemToSourceStreams (addedItem, itemsState$) {
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

          const stream$ = itemState$
            .map(state => state[key])
            .startWith(addedItem[key])
            // skip the snapshot if the value didn't change
            .compose(dropRepeats(compareJSON))
            .remember();

          const sourceKey = transformKey ? transformKey(key) : key;

          return {
            ...sources,
            [sourceKey]: adapt(stream$)
          };
        }, {
          _destroy$
        });
    }

    const items$ = xs.fromObservable(sourceItems$);
    const itemsState$ = items$.remember();

    const add$ = itemsState$
      // get the added items at each step
      .fold(findNewItems, {prevIds: [], addedItems: []})
      .map(({addedItems}) => addedItems)
      .filter(addedItems => addedItems.length)
      .map(addedItems => addedItems.map(item => itemToSourceStreams(item, itemsState$)));

    return Collection(makeDestroyable(component), sources, add$, item => item._destroy$);
  };

  return Collection;
}

const Collection = makeCollection();

export default Collection;
export { makeCollection };
