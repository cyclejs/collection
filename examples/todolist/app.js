import {div, span, button, input} from '@cycle/dom';
import xs from 'xstream';
import Collection from '../../src/collection';

function Todo ({DOM, text, removeComplete$}) {
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

  return {
    DOM: complete$.map(complete =>
      div('.todo', [
        input('.complete', {attrs: {type: 'checkbox'}}),
        span('.text', {style: {'text-decoration': complete ? 'line-through' : 'initial'}}, text),
        button('.remove', 'Remove')
      ])
    ),

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
      `${completeCount}/${todosCount} complete`,
      div('.todos', todoVtrees)
    ])
  );
}

export default function TodoList ({DOM}) {
  const removeComplete$ = DOM
    .select('.remove-complete')
    .events('click');

  const todos = Collection(Todo, {DOM, removeComplete$}, {
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
