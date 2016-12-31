import xs from 'xstream';
import dropRepeats from 'xstream/extra/dropRepeats';
import isolate from '@cycle/isolate';
import xsAdapter from '@cycle/xstream-adapter';

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

function convert (stream, sourceSA, targetSA) {
  return targetSA.isValidStream(stream)
    ? stream
    : targetSA.adapt(stream, sourceSA.streamSubscribe);
}

function makeCollection (externalSA = xsAdapter) {
  function collection (options, items = []) {
    const { component, sources, removeSelector } = options;

    return {
      add (additionalSources = {}) {
        const newItem = makeItem(component, {...sources, ...additionalSources});
        const selectedSink = removeSelector(newItem) || xs.empty();
        const removeSink = convert(selectedSink, externalSA, xsAdapter);
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
    const add$ = convert(sourceAdd$, externalSA, xsAdapter);
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

    const emptyCollection = collection({ component, sources, removeSelector });
    const collection$ = reducer$
      .fold((collection, reducer) => reducer(collection), emptyCollection)
      .map(collection => collection.asArray());

    const remove$ = Collection.merge(collection$, item => item._remove$, true);
    removeProxy$.imitate(remove$);

    return convert(collection$, xsAdapter, externalSA);
  }

  Collection.pluck = function pluck (sourceCollection$, pluckSelector) {
    const sinks = {};

    function sink$ (item) {
      const key = item._id;

      if (sinks[key] === undefined) {
        const selectedSink = convert(pluckSelector(item), externalSA, xsAdapter);
        const sink = selectedSink.map(x =>
          isVtree(x) && x.key == null ? {...x, key} : x
        );
        sinks[key] = sink.remember();
      }

      return sinks[key];
    }

    const collection$ = convert(sourceCollection$, externalSA, xsAdapter);
    const outputCollection$ = collection$
      .map(items => items.map(item => sink$(item)))
      .map(sinkStreams => xs.combine(...sinkStreams))
      .flatten()
      .startWith([]);
    return convert(outputCollection$, xsAdapter, externalSA);
  };

  Collection.merge = function merge (sourceCollection$, mergeSelector, internal = false) {
    const sinks = {};

    function sink$ (item) {
      const key = item._id;

      if (sinks[key] === undefined) {
        const selectedSink = convert(mergeSelector(item), externalSA, xsAdapter);
        const sink = selectedSink.map(x =>
          isVtree(x) && x.key == null ? {...x, key} : x
        );
        // prevent sink from early completion and reinitialization
        sinks[key] = xs.merge(sink, xs.never());
      }

      return sinks[key];
    }

    const collection$ = convert(sourceCollection$, externalSA, xsAdapter);
    const outputCollection$ = collection$
      .map(items => items.map(item => sink$(item)))
      .map(sinkStreams => xs.merge(...sinkStreams))
      .flatten();
    return internal
      ? outputCollection$
      : convert(outputCollection$, xsAdapter, externalSA);
  };

  // convert a stream of items' sources snapshots into a stream of collections
  Collection.gather = function gather (component, sources, sourceItems$, idAttribute = 'id') {
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

          return {
            ...sources,
            [key]: convert(stream$, xsAdapter, externalSA)
          };
        }, {
          _destroy$
        });
    }

    const items$ = convert(sourceItems$, externalSA, xsAdapter);
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
