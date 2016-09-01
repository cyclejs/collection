import {div, input} from '@cycle/dom';
import xs from 'xstream';
import Collection from '../../src/collection';

function widgetView (name) {
  return (
    div('.widget', name)
  );
}

function Widget ({DOM, name$}) {
  return {
    DOM: name$.map(widgetView),
    name$
  };
}

function view ([widgetVtrees, filter]) {
  return (
    div('.widget-list', [
      input('.filter', {props: {value: filter}}),
      div('.widgets', widgetVtrees)
    ])
  );
}

function showViewIfMatchesFilter ([vtree, name, filter]) {
  if (name.includes(filter)) {
    return vtree;
  }

  const hiddenStyle = {display: 'none'};

  return {
    ...vtree,

    data: {
      ...vtree.data,

      style: hiddenStyle
    }
  };
}

export default function WidgetList ({DOM}) {
  const addWidget$ = xs.of('foo', 'bar', 'baz')
    .map(name => ({name$: xs.of(name)}));

  const widgets$ = Collection(
    Widget,
    {DOM},
    addWidget$
  );

  const filter$ = DOM
    .select('.filter')
    .events('input')
    .map(ev => ev.target.value)
    .startWith('');

  const widgetVtrees$ = Collection.pluck(
    widgets$,
    item => xs
      .combine(item.DOM, item.name$, filter$)
      .map(showViewIfMatchesFilter)
  );

  return {
    DOM: xs.combine(widgetVtrees$, filter$).map(view)
  };
}
