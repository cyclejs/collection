import {run} from '@cycle/xstream-run';
import {makeDOMDriver, div, button} from '@cycle/dom';
import xs from 'xstream';
import Collection from '..';
import {makeHTTPDriver} from '@cycle/http';
import isolate from '@cycle/isolate';

const bulk = require('bulk-require');
const examplesObject = bulk(__dirname, ['*/app.js']);
const examples = Object.keys(examplesObject)
  .map(key => ({component: examplesObject[key].app.default, name: key}));

function tabView (name) {
  return (
    button('.tab', name)
  );
}

function Tab (sources) {
  const {component, DOM} = sources;

  const componentSinks = isolate(component)(sources);

  const active$ = DOM
    .select('.tab')
    .events('click')
    .mapTo(true);

  componentSinks.DOM = componentSinks.DOM.remember();

  return {
    DOM: xs.of(tabView(sources.name)),
    componentSinks,

    active$
  };
}

function view ([tabVtrees, activeExampleVtree]) {
  return (
    div('.examples', [
      div('.tabs', tabVtrees),

      div('.example', [activeExampleVtree])
    ])
  );
}

function main ({DOM, HTTP}) {
  const examples$ = Collection(
    Tab,
    {DOM, HTTP},
    xs.of(...examples)
  );

  const activeExample$ = Collection
    .merge(examples$, tab => tab.active$.mapTo(tab.componentSinks));

  const tabVtrees$ = Collection
    .pluck(examples$, tab => tab.DOM);

  const activeExampleVtree$ = activeExample$
    .map(sinks => sinks.DOM)
    .flatten()
    .startWith(div('Click an example!'));

  return {
    DOM: xs
      .combine(tabVtrees$, activeExampleVtree$)
      .map(view)
  };
}

const drivers = {
  DOM: makeDOMDriver('.app'),
  HTTP: makeHTTPDriver()
};

run(main, drivers);
