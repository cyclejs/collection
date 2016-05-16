import xs from 'xstream';
import isolate from '@cycle/isolate';

let _id = 0;

function id () {
  return _id++;
}

function handlerStreams (component, item, handlers) {
  const sinkStreams = Object.keys(item).map(sink => {
    if (handlers[sink] === undefined) {
      return null;
    }

    const handler = handlers[sink];
    const sink$ = item[sink];

    return sink$.map(event => {
      event.stopPropagation && event.stopPropagation();

      const handlerAction = (state) => handler(state, item, event);

      return handlerAction;
    });
  });

  return xs.merge(...sinkStreams.filter(action => action !== null));
}

function makeItem (component, sources, props) {
  const newId = id();

  if (props) {
    if (!props.addListener) {
      props = xs.of(props);
    }

    sources['props$'] = props;
  }

  const newItem = isolate(component, newId.toString())(sources);

  newItem.id = newId;
  newItem.name = component.name;

  return newItem;
}

export default function Collection (component, sources, handlers = {}, items = [], action$ = xs.create()) {
  return {
    add (props) {
      const newItem = makeItem(component, sources, props);

      handlerStreams(component, newItem, handlers)
        .addListener({
          next (action) {
            action$.shamefullySendNext(action);
          },

          error (err) {
            console.error(err);
          },

          complete () {}
        });

      return Collection(
        component,
        sources,
        handlers,
        [...items, newItem],
        action$
      );
    },

    remove (itemForRemoval) {
      return Collection(
        component,
        sources,
        handlers,
        items.filter(item => item !== itemForRemoval),
        action$
      );
    },

    pluck (sinkProperty) {
      return xs.combine(
        (...items) => items,
        ...items.map(item => item[sinkProperty])
      );
    },

    asArray () {
      return items;
    },

    action$: action$
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
