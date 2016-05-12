import {run} from '@cycle/xstream-run';
import {makeDOMDriver, div, button, input} from '@cycle/dom';
import xs from 'xstream';
import Collection from './collection';

function Counter ({DOM}) {
  const remove$ = DOM
    .select('.remove')
    .events('click');

  const add$ = DOM
    .select('.add')
    .events('click')
    .map(() => (state) => ({count: state.count + 1}));

  const subtract$ = DOM
    .select('.subtract')
    .events('click')
    .map(() => (state) => ({count: state.count - 1}));

  const action$ = xs.merge(
    add$,
    subtract$
  );

  const state$ = action$
    .fold((state, action) => action(state), {count: 0})
    .remember();

  return {
    DOM: state$.map(({count}) => (
      div('.counter', [
        button('.subtract', '-'),
        count.toString(),
        button('.add', '+'),
        button('.remove', 'x')
      ])
    )),

    count$: state$.map(state => state.count),

    remove$
  }
}

function addCounter (state) {
  return {
    ...state,

    counters: state.counters.add({count: 0})
  }
}

const view = (state, total, counterDOM) => (
  div('.counters', [
    button('.add-counter', 'Add counter'),
    ...counterDOM,
    'Total: ' + total.toString()
  ])
);

function CountersList ({DOM}) {
  const counters = Collection(Counter, {DOM}, {
    remove$: function remove (state, removedCounter, event) {
      return {
        ...state,

        counters: state.counters.remove(removedCounter)
      }
    },

    count$: function (state, counter, count) {
      return state;
    }
  })

  const initialState = {
    counters
  }

  const addCounter$ = DOM
    .select('.add-counter')
    .events('click')
    .map(() => addCounter)

  const action$ = xs.merge(
    addCounter$,
    counters.action$
  )

  const state$ = action$
    .fold((state, action) => action(state), initialState);

  const counters$ = state$.map(state => state.counters);

  function sum (arr) {
    return arr.reduce((total, acc) => total + acc, 0);
  }

  const total$ = counters$
    .map(counters => counters.pluck('count$').map(sum))
    .flatten()
    .startWith(0);

  const counterDOM$ = counters$
    .map(counters => counters.pluck('DOM'))
    .flatten()
    .debug()
    .startWith([]);

  return {
    DOM: xs.combine(view, state$, total$, counterDOM$)
  };
}

export default CountersList;
