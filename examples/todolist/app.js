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

function Todo ({DOM, text, removeComplete$, filter$}) {
  const removeClick$ = DOM
    .select('.remove')
    .events('click');

  const complete$ = DOM
    .select('.complete')
    .events('change')
    .map(event => event.target.checked)
    .startWith(false)
    .remember();

  const removeIfComplete$ = complete$
    .map(complete => removeComplete$.filter(() => complete))
    .flatten();

  function viewUnlessFiltered (complete, filter) {
    if (filter(complete)) {
      return todoView(complete, text);
    } else {
      return div('.todo', {style: {display: 'none'}});
    }
  }

  return {
    DOM: xs.combine(viewUnlessFiltered, complete$, filter$),

    remove$: xs.merge(removeClick$, removeIfComplete$),

    complete$
  };
}

function addTodoReducer (todos, text) {
  return todos.add({text});
}

function view (todoVtrees, todosComplete) {
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

export default function TodoList ({DOM}) {
  const removeComplete$ = DOM
    .select('.remove-complete')
    .events('click');

  const filter$ = xs.merge(
    DOM.select('.show-all').events('click').mapTo((completed) => true),
    DOM.select('.show-completed').events('click').mapTo((completed) => completed),
    DOM.select('.show-active').events('click').mapTo((completed) => !completed)
  ).startWith((completed) => true).remember();

  const todos = Collection(Todo, {DOM, removeComplete$, filter$}, {
    remove$ (todos, todo) {
      return todos.remove(todo);
    }
  });

  const addTodoClick$ = DOM
    .select('.add-todo')
    .events('click');

  const newTodoText$ = DOM
    .select('.new-todo-text')
    .events('change')
    .map(event => event.target.value)
    .startWith('');

  const addTodo$ = newTodoText$
    .map(text => addTodoClick$.mapTo((state) => addTodoReducer(state, text)))
    .flatten();

  const reducer$ = xs.merge(
    addTodo$,

    todos.reducers
  );

  const todos$ = reducer$
    .fold((todos, reducer) => reducer(todos), todos);

  const todoVtrees$ = Collection.pluck(todos$, 'DOM');
  const todosComplete$ = Collection.pluck(todos$, 'complete$');

  return {
    DOM: xs.combine(view, todoVtrees$, todosComplete$)
  };
}
