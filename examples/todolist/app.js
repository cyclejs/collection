import {div, span, button, input} from '@cycle/dom';
import xs from 'xstream';
import Collection from '../../src/collection';

function todoView ([complete, editing, text]) {
  return (
    div('.todo', [
      input('.complete', {attrs: {type: 'checkbox', checked: complete}}),
      input('.change-text', {
        props: {value: text, hidden: !editing},
        hook: {
          update({elm}) {
            if(editing) {
              elm.focus();
              elm.selectionStart = text.length;
            }
          }
        }
      }),
      editing
        ? ''
        : span('.text', {style: {'text-decoration': complete ? 'line-through' : 'initial'}}, text),
      button('.remove', 'Remove')
    ])
  );
}

function Todo ({DOM, text$}) {
  const remove$ = DOM
    .select('.remove')
    .events('click');

  const complete$ = DOM
    .select('.complete')
    .events('change')
    .map(event => event.target.checked)
    .startWith(false);

  const changeText = DOM.select('.change-text');
  const changeText$ = xs.merge(
    changeText.events('keydown')
      .filter(event => event.code === 'Enter'),
    changeText.events('blur')
  ).map(event => event.target.value);


  const editing$ = xs.merge(
    DOM.select('.text').events('click').mapTo(true),
    changeText$.mapTo(false)
  ).startWith(false);

  return {
    DOM: xs.combine(
      complete$,
      editing$,
      xs.merge(text$, changeText$)
    ).map(todoView),

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
  return itemComplete$
    .map(complete => removeComplete$.filter(() => complete))
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
    .map(text => addTodoClick$.mapTo({text$: xs.of(text)}))
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
