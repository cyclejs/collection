import {Subject, Observable} from 'rx';
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
      const handlerAction = (state) => handler(state, item, event);

      Object.defineProperty(
        handlerAction,
        'name',
        {
          value: component.name + '(' + item.id + ')' + sink
        }
      );

      return handlerAction;
    });
  });

  return Observable.merge(...sinkStreams.filter(action => action !== null));
}

function makeItem (component, sources, props) {
  const newId = id();

  if (props) {
    sources['props$'] = Observable.just(props);
  }

  const newItem = isolate(component, newId.toString())(sources);

  newItem.id = newId;

  return newItem;
}

export default function Collection (component, sources, handlers = {}, items = [], action$ = new Subject) {
  return {
    add (props) {
      const newItem = makeItem(component, sources, props);

      handlerStreams(component, newItem, handlers).subscribe((action) => action$.onNext(action));

      return Collection(
        component,
        sources,
        handlers,
        [...items, newItem],
        action$
      )
    },

    remove (itemForRemoval) {
      return Collection(
        component,
        sources,
        handlers,
        items.filter(item => item.id !== itemForRemoval.id),
        action$
      )
    },

    asArray () {
      return items;
    },

    action$: action$.asObservable()
  }
}
