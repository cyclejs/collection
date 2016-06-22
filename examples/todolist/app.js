import {div, span, button, input} from '@cycle/dom';
import xs from 'xstream';
import Collection from '../../src/collection';

function todoView (complete, text) {
  return (
    div('.todo', [
      input('.complete', {attrs: {type: 'checkbox', checked: complete}}),
      span('.text', {style: {'text-decoration': complete ? 'line-through' : 'initial'}}, text),
      button('.remove', 'Remove')
    ])
  );
}

function Todo ({DOM, text}) {
  const remove$ = DOM
    .select('.remove')
    .events('click');

  const complete$ = DOM
    .select('.complete')
    .events('change')
    .map(event => event.target.checked)
    .startWith(false);

  return {
    DOM: complete$.map(complete => todoView(complete, text)),

    remove$,

    complete$
  };
}

function view ([todoVtrees, todosComplete]) {
  const todosCount = todosComplete.length;
  const completeCount = todosComplete.filter(complete => complete).length;

  return (
    div('.todo-list', [
      input('.new-todo-text'),
      button('.add-todo', 'Add todo'),
      button('.remove-complete', 'Remove complete'),
      button('.show-all', 'Show all'),
      button('.show-completed', 'Show completed'),
      button('.show-active', 'Show active'),
      `${completeCount}/${todosCount} complete`,
      div('.todos', todoVtrees)
    ])
  );
}

function showViewUnlessFiltered ([vtree, complete, filter]) {
  if (filter(complete)) {
    return vtree;
  }

  return div('.todo', {style: {display: 'none'}});
}

function removeItemIfComplete$ (removeComplete$, itemComplete$) {
  return removeComplete$
    .mapTo(itemComplete$.filter(complete => complete))
    .flatten();
}

export default function TodoList ({DOM}) {
  const removeComplete$ = DOM
    .select('.remove-complete')
    .events('click');

  const addTodoClick$ = DOM
    .select('.add-todo')
    .events('click');

  const newTodoText$ = DOM
    .select('.new-todo-text')
    .events('change')
    .map(event => event.target.value)
    .startWith('');

  const addTodo$ = newTodoText$
    .map(text => addTodoClick$.mapTo({text}))
    .flatten();

  const todos$ = Collection(
    Todo,
    {DOM},
    addTodo$,
    item => xs.merge(
      item.remove$,
      removeItemIfComplete$(removeComplete$, item.complete$)
    )
  );

  const filter$ = xs.merge(
    DOM.select('.show-all').events('click').mapTo((completed) => true),
    DOM.select('.show-completed').events('click').mapTo((completed) => completed),
    DOM.select('.show-active').events('click').mapTo((completed) => !completed)
  ).startWith((completed) => true);

  const todoVtrees$ = Collection.pluck(
    todos$,
    item => xs
      .combine(item.DOM, item.complete$, filter$)
      .map(showViewUnlessFiltered)
  );

  const todosComplete$ = Collection.pluck(todos$, item => item.complete$);

  return {
    DOM: xs.combine(todoVtrees$, todosComplete$).map(view)
  };
}
