import {div, span, button, input} from '@cycle/dom';
import xs from 'xstream';
import dropRepeats from 'xstream/extra/dropRepeats';
import Collection from '../../src/collection';

function taskView ({status, text, visible}) {
  return (
    div('.task', {
        style: visible ? {} : {display: 'none'}
      }, [
      span('.status', status),
      ': ',
      span('.text', text),
      button('.delete', 'Delete')
    ])
  );
}

function Task ({DOM, props, deleteComplete$, filter$}) {
  const deleteClick$ = DOM
    .select('.delete')
    .events('click');

  const deleteIfComplete$ = props
    .map(({status}) => deleteComplete$.filter(() => status === 'complete'))
    .flatten();

  const delete$ = xs.merge(deleteClick$, deleteIfComplete$);

  const viewUnlessFiltered  = (props, filter) =>
    taskView({
      ...props,
      visible: filter(props.status)
    });

  return {
    DOM: xs.combine(viewUnlessFiltered, props, filter$),
    complete$: props.map(({status}) => status === 'complete').compose(dropRepeats()),
    HTTP: props
      .map(({id}) => delete$.mapTo({
        url: `/tasks/${id}`,
        method: 'DELETE',
        type: 'application/json'
      }))
      .flatten()
  };
}

function addTodoReducer (todos, text) {
  return todos.add({text});
}

function view (tasksVtrees, tasksComplete) {
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

export default function TaskRunner ({DOM, HTTP}) {
  const deleteComplete$ = DOM
    .select('.delete-complete')
    .events('click');

  const filter$ = xs.merge(
    DOM.select('.show-all').events('click').mapTo(() => true),
    DOM.select('.show-complete').events('click').mapTo(status => status === 'complete'),
    DOM.select('.show-running').events('click').mapTo(status => status !== 'complete')
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

  const tasks$ = Collection.gather(tasksState$, Task, {DOM, deleteComplete$, filter$});

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
  })

  const tasksVtrees$ = Collection.pluck(tasks$, 'DOM');
  const tasksComplete$ = Collection.pluck(tasks$, 'complete$');
  const tasksRequest$ = tasks$
    .map(collection => collection.asArray().map(item => item.HTTP))
    .map(sinkStreams => xs.merge(...sinkStreams))
    .flatten();

  return {
    DOM: xs.combine(view, tasksVtrees$, tasksComplete$),
    HTTP: xs.merge(
      addTask$,
      refreshList$,
      tasksRequest$
    )
  };
}
