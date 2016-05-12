import xs from 'xstream';
import isolate from '@cycle/isolate';

let _id = 0;

function id() {
  return _id++;
};

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
    sources['props$'] = xs.of(props);
  }

  const newItem = isolate(component, newId.toString())(sources);

  newItem.id = newId;

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
        items.filter(item => item.id !== itemForRemoval.id),
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
