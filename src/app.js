import {run} from '@cycle/core';
import {makeDOMDriver, div, button, input} from '@cycle/dom';
import {Observable} from 'rx';
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

  const action$ = Observable.merge(
    add$,
    subtract$
  );

  const state$ = action$
    .startWith({count: 0})
    .scan((state, action) => action(state))
    .shareReplay(1);

  return {
    DOM: state$.map(({count}) => (
      div('.counter', [
        button('.subtract', '-'),
        count.toString(),
        button('.add', '+'),
        button('.remove', 'x')
      ])
    )),

    count$: state$.pluck('count').shareReplay(1),

    remove$
  }
}

function addCounter (state) {
  return {
    ...state,

    counters: state.counters.add({count: 0})
  }
}

function CountersList ({DOM}) {
  const counters = Collection(Counter, {DOM}, {
    remove$: function remove (state, removedCounter, event) {
      return {
        ...state,

        counters: state.counters.remove(removedCounter)
      }
    },

    count$: function (state, counter, count) {
      console.log(count)
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

  const action$ = Observable.merge(
    addCounter$,
    counters.action$
  )

  const state$ = action$
    .startWith(initialState)
    .scan((state, action) => action(state));

  const counters$ = state$.pluck('counters');

  function sum (arr) {
    return arr.reduce((total, acc) => total + acc, 0);
  }

  const total$ = counters$
    .flatMap(counters => counters.pluck('count$').map(sum))
    .startWith(0);

  const counterDOM$ = counters$
    .flatMap(counters => counters.pluck('DOM'))
    .startWith([]);

  return {
    DOM: Observable.combineLatest(state$, total$, counterDOM$, (state, total, counterDOM) => (
      div('.counters', [
        button('.add-counter', 'Add counter'),
        ...counterDOM,
        'Total: ' + total.toString()
      ])
    ))
  }
}

export default CountersList;
