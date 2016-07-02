import {div, span, button, input} from '@cycle/dom';
import xs from 'xstream';
import delay from 'xstream/extra/delay';
import Collection from '../../src/collection';

function taskView ([{status, text}, editing]) {
  return (
    div('.task', [
      span('.status', status),
      ': ',
      input('.change-text', {
        props: {value: text, hidden: !editing},
        hook: {
          update ({elm}) {
            if (editing) {
              elm.focus();
              elm.selectionStart = text.length;
            }
          }
        }
      }),
      editing
        ? ''
        : span('.text', text),
      button('.delete', 'Delete')
    ])
  );
}

function Task ({DOM, props}) {
  const delete$ = DOM
    .select('.delete')
    .events('click');

  const changeText = DOM.select('.change-text');
  const changeText$ = xs.merge(
    changeText.events('keydown')
      .filter(event => event.code === 'Enter'),
    changeText.events('blur')
  ).map(event => event.target.value);

  const editing$ = xs.merge(
    DOM.select('.text').events('click').mapTo(true),
    changeText$.compose(delay()).mapTo(false)
  ).startWith(false);

  const edit$ = editing$.map(editing => changeText$.filter(() => editing)).flatten();

  return {
    DOM: xs.combine(props, editing$).map(taskView),
    complete$: props.map(({status}) => status === 'complete'),
    delete$,
    edit$,
    HTTP: props.map(({id}) => ({
      url: `/tasks/${id}`
    }))
  };
}

function view ([tasksVtrees, tasksComplete]) {
  const tasksCount = tasksComplete.length;
  const completeCount = tasksComplete.filter(complete => complete).length;

  return (
    div('.task-runner', [
      input('.new-task-text'),
      button('.add-task', 'Add task'),
      button('.delete-complete', 'Delete complete'),
      button('.show-all', 'Show all'),
      button('.show-complete', 'Show complete'),
      button('.show-running', 'Show running'),
      `${completeCount}/${tasksCount} complete`,
      div('.todos', tasksVtrees)
    ])
  );
}

function showViewUnlessFiltered ([vtree, complete, filter]) {
  return filter(complete) ? vtree : '';
}

function deleteItemIfComplete$ (deleteComplete$, itemComplete$) {
  return itemComplete$
    .map(complete => deleteComplete$.filter(() => complete))
    .flatten();
}

function itemRequests$ (deleteComplete$, item) {
  const delete$ = xs.merge(
    item.delete$,
    deleteItemIfComplete$(deleteComplete$, item.complete$)
  ).mapTo({
    method: 'DELETE',
    type: 'application/json'
  });

  const edit$ = item.edit$.map(text => ({
    method: 'PATCH',
    type: 'application/json',
    send: {text}
  }));

  const request$ = xs.merge(delete$, edit$);

  return item.HTTP.map(base => request$.map(request => ({
    ...base,
    ...request
  })))
    .flatten();
}

export default function TaskRunner ({DOM, HTTP}) {
  const deleteComplete$ = DOM
    .select('.delete-complete')
    .events('click');

  const filter$ = xs.merge(
    DOM.select('.show-all').events('click').mapTo(complete => true),
    DOM.select('.show-complete').events('click').mapTo(complete => complete),
    DOM.select('.show-running').events('click').mapTo(complete => !complete)
  ).startWith(() => true);

  const tasksState$ = HTTP.response$$
    .flatten()
    .map(({text}) =>
      JSON.parse(text)
        .map(task => ({
          id: task.id,
          props: task
        }))
    )
    .startWith([]);

  const tasks$ = Collection.gather(Task, {DOM}, tasksState$);

  const addTaskClick$ = DOM
    .select('.add-task')
    .events('click');

  const newTaskText$ = DOM
    .select('.new-task-text')
    .events('change')
    .map(event => event.target.value)
    .startWith('');

  const addTask$ = newTaskText$
    .map(text => addTaskClick$.mapTo({
      url: '/tasks',
      method: 'POST',
      type: 'application/json',
      send: {text}
    }))
    .flatten();

  const refreshList$ = xs.periodic(1000).startWith().mapTo({
    url: '/tasks',
    method: 'GET',
    type: 'application/json'
  });

  const tasksVtrees$ = Collection.pluck(
    tasks$,
    item => xs
      .combine(item.DOM, item.complete$, filter$)
      .map(showViewUnlessFiltered)
  );
  const tasksComplete$ = Collection.pluck(tasks$, item => item.complete$);
  const tasksRequest$ = Collection.merge(tasks$, item => itemRequests$(deleteComplete$, item));

  return {
    DOM: xs.combine(tasksVtrees$, tasksComplete$).map(view),
    HTTP: xs.merge(
      addTask$,
      refreshList$,
      tasksRequest$
    )
  };
}
