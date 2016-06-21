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
  }
};

function Card ({DOM}) {
  const remove$ = DOM
    .select('.remove')
    .events('click');

  const editing$ = DOM
    .select('.card')
    .events('dblclick')
    .mapTo(cardReducers.toggleEditing);

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

  const initialState = {
    text: 'Double click to edit',
    editing: false
  };

  const reducer$ = xs.merge(
    editing$,

    saveChanges$
  );

  const state$ = reducer$.fold((state, reducer) => reducer(state), initialState);

  return {
    DOM: state$.map(state => (
      div('.card', [
        state.editing ? textarea('.change-text', state.text) : state.text,
        button('.remove', 'x'),
        state.editing ? button('.save', 'Save') : ''
      ])
    )),

    remove$
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

function List ({DOM, props$}) {
  const remove$ = DOM
    .select('.remove')
    .events('click');

  const addCard$ = DOM
    .select('.add-card')
    .events('click')
    .mapTo(null);

  const cards$ = Collection(Card, {DOM}, addCard$, item => item.remove$);

  const cardsVtrees$ = Collection.pluck(cards$, item => item.DOM);

  return {
    DOM: cardsVtrees$.map(listView),

    remove$
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

export default function main ({DOM}) {
  const addList$ = DOM
    .select('.add-list')
    .events('click')
    .mapTo(null);

  const lists$ = Collection(List, {DOM}, addList$, item => item.remove$);

  const listVtrees$ = Collection.pluck(lists$, item => item.DOM);

  return {
    DOM: listVtrees$.map(view)
  };
}
