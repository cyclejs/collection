import {Subject} from 'rx';
import isolate from '@cycle/isolate';

let _id = 0;

function id() {
  return _id++;
};

function registerHandlers(item, handlers, action$) {
  for (let sink in item) {
    if (sink in handlers) {
      const handler = handlers[sink];

      item[sink].subscribe(event => action$.onNext(
        (state) => handler(state, {item, event})
      ))
    }
  }
}

function makeItem (component, sources, props) {
  const newId = id();

  const newItem = isolate(component, newId.toString())({...sources, ...props});

  newItem.id = newId;

  return newItem;
}

export default function Collection (component, sources, handlers = {}, items = [], action$ = new Subject) {
  return {
    items: {
      add (props) {
        const newItem = makeItem(component, sources, props);

        registerHandlers(newItem, handlers, action$);

        return Collection(
          component,
          sources,
          handlers,
          [...items, newItem],
          action$
        ).items
      },

      remove (itemForRemoval) {
        return Collection(
          component,
          sources,
          handlers,
          items.filter(item => item.id !== itemForRemoval.id),
          action$
        ).items
      },

      asArray () {
        return items;
      }
    },

    action$: action$.asObservable()
  }
}
