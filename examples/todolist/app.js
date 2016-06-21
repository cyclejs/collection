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
    .startWith(false);

  const removeIfComplete$ = complete$
    .map(complete => removeComplete$.filter(() => complete))
    .flatten();

  function viewUnlessFiltered ([complete, filter]) {
    if (filter(complete)) {
      return todoView(complete, text);
    } else {
      return div('.todo', {style: {display: 'none'}});
    }
  }

  return {
    DOM: xs.combine(complete$, filter$).map(viewUnlessFiltered),

    remove$: xs.merge(removeClick$, removeIfComplete$),

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

export default function TodoList ({DOM}) {
  const removeComplete$ = DOM
    .select('.remove-complete')
    .events('click');

  const filter$ = xs.merge(
    DOM.select('.show-all').events('click').mapTo((completed) => true),
    DOM.select('.show-completed').events('click').mapTo((completed) => completed),
    DOM.select('.show-active').events('click').mapTo((completed) => !completed)
  ).startWith((completed) => true);

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

  const todos$ = Collection(Todo, {DOM, removeComplete$, filter$}, addTodo$, item => item.remove$);

  const todoVtrees$ = Collection.pluck(todos$, item => item.DOM);
  const todosComplete$ = Collection.pluck(todos$, item => item.complete$);

  return {
    DOM: xs.combine(todoVtrees$, todosComplete$).map(view)
  };
}
