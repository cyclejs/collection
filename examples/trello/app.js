import {div, button, textarea} from '@cycle/dom';
import xs from 'xstream';
import Collection from '../../src/collection';

const cardReducers = {
  toggleEditing (state) {
    return {
      ...state,

      editing: !state.editing
    };
  },

  saveChanges (text) {
    return (state) => {
      return {
        ...state,

        text,

        editing: false
      };
    };
  },

  startDragging (state) {
    return {
      ...state,

      dragging: true
    };
  },

  stopDragging (state) {
    return {
      ...state,

      dragging: false
    };
  }
};

function cardStyle (state, mousePosition) {
  if (!state.dragging) {
    return {};
  }

  return {
    position: `absolute`,
    top: '0px',
    left: '0px',
    transform: `translate(${mousePosition.x}px, ${mousePosition.y}px`
  };
}

function Card ({DOM, Mouse}) {
  const remove$ = DOM
    .select('.remove')
    .events('click');

  const move$ = DOM
    .select('.card')
    .events('mousedown');

  const clickSave$ = DOM
    .select('.save')
    .events('click');

  const textChange$ = DOM
    .select('.change-text')
    .events('change')
    .map(ev => ev.target.value);

  const saveChanges$ = textChange$
    .map(text => clickSave$.map(() => cardReducers.saveChanges(text)))
    .flatten();

  const editing$ = DOM
    .select('.card')
    .events('dblclick')
    .mapTo(cardReducers.toggleEditing);

  const dragging$ = move$
    .mapTo(cardReducers.startDragging);

  const stopDragging$ = Mouse
    .up$
    .mapTo(cardReducers.stopDragging);

  const initialState = {
    text: 'Double click to edit',
    editing: false,
    dragging: false
  };

  const reducer$ = xs.merge(
    editing$,

    saveChanges$,

    dragging$,

    stopDragging$
  );

  const state$ = reducer$.fold((state, reducer) => reducer(state), initialState);

  const stateWithMousePosition$ = Mouse
    .positions()
    .map(mousePosition => state$.map(state => ({state, mousePosition})))
    .flatten();

  return {
    DOM: stateWithMousePosition$.map(({state, mousePosition}) => (
      div('.card', {style: cardStyle(state, mousePosition)}, [
        state.editing ? textarea('.change-text', state.text) : state.text,
        button('.remove', 'x'),
        state.editing ? button('.save', 'Save') : '',
        button('.move', 'Move')
      ])
    )),

    remove$,

    dragging$,

    state$
  };
}

function listView (cardsVtrees) {
  return (
    div('.list', [
      button('.add-card', 'Add card'),

      button('.remove', 'x'),

      div('.cards', cardsVtrees)
    ])
  );
}

function List (sources) {
  const remove$ = sources
    .DOM
    .select('.remove')
    .events('click');

  const addCard$ = sources
    .DOM
    .select('.add-card')
    .events('click')
    .mapTo(null);

  const dropCardClick$ = sources
    .DOM
    .select('.list')
    .events('mouseup')

  const otherDragging$ = sources
    .Broadcast
    .dragging$
    .debug()
    .remember()
    .debug()
    .map(draggingCard => dropCardClick$.mapTo(draggingCard.state$))
    .flatten()
    .map(props => ({props$: xs.of(props)}))

  const cards$ = Collection(
    Card,
    sources,
    xs.merge(addCard$, otherDragging$.filter(props => !!props)),
    item => item.remove$
  );

  const cardsVtrees$ = Collection.pluck(cards$, item => item.DOM);

  const draggingCard$ = Collection.merge(cards$, item => item.dragging$.mapTo(item));

  return {
    DOM: cardsVtrees$.map(listView),

    remove$,

    dragging$: xs.merge(draggingCard$, otherDragging$.mapTo({state$: xs.empty}))
  };
}

function view (listVtrees) {
  return (
    div('.main', [
      button('.add-list', 'Add list'),

      div('.lists', listVtrees)
    ])
  );
}

export default function main (sources) {
  const addList$ = sources
    .DOM
    .select('.add-list')
    .events('click')
    .mapTo(null);

  const lists$ = Collection(
    List,
    sources,
    addList$,
    item => item.remove$,
    {
      dragging$: item => item.dragging$,
      received$: item => item.received$
    }
  );

  const listVtrees$ = Collection.pluck(lists$, item => item.DOM);

  return {
    DOM: listVtrees$.map(view)
  };
}
