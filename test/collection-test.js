/* globals describe, it */

import Collection from '../src/collection';

import Rx, {Observable, TestScheduler} from 'rx';
import {mockDOMSource} from '@cycle/dom';
import assert from 'assert';
import collectionAssert from './test-helper';

const {onNext, onCompleted} = Rx.ReactiveTest;

Rx.config.longStackSupport = true;

function addTodo (title) {
  return state => {
    return {
      ...state,

      todos: state.todos.add({props$: Observable.just({title})})
    }
  }
}

function TodoList ({DOM, props$}) {
  const initialState = {
    todos: Collection(TodoItem, {DOM})
  };

  const newTodoText$ = DOM
    .select('.new-todo')
    .events('change')
    .map(ev => ev.target.value)
    .startWith('');

  const addTodo$ = DOM
    .select('.add-todo')
    .events('click')
    .withLatestFrom(newTodoText$, (_, text) => addTodo(text))

  const action$ = addTodo$;

  const state$ = action$
    .startWith(initialState)
    .scan((state, action) => action(state))

  return {
    state$
  }
}

function TodoItem ({DOM, props$}) {
  const state$ = props$;

  const remove$ = DOM
    .select('.remove')
    .events('click');

  return {
    state$,
    remove$
  }
}


describe('Collection', () => {
  it('adds items', () => {
    const scheduler = new Rx.TestScheduler();

    const add$ = scheduler.createHotObservable(
      onNext(250, 'click!')
    )

    const mockedDOM = mockDOMSource({
      '.add-todo': {
        click: add$
      }
    });

    const results = scheduler.startScheduler(() => {
      return TodoList({DOM: mockedDOM})
        .state$
        .pluck('todos')
        .map(todos => todos.asArray().length)
    })

    const expected = [
      onNext(200, 0),
      onNext(250, 1)
    ]

    collectionAssert.assertEqual(expected, results.messages);
  })
});
