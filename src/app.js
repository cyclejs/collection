import {div, button, textarea} from '@cycle/dom';
import xs from 'xstream';
import Collection from './collection';

const cardActions = {
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
    .mapTo(cardActions.toggleEditing);

  const clickSave$ = DOM
    .select('.save')
    .events('click');

  const textChange$ = DOM
    .select('.change-text')
    .events('change')
    .map(ev => ev.target.value);

  const saveChanges$ = textChange$
    .map(text => clickSave$.map(() => cardActions.saveChanges(text)))
    .flatten();

  const initialState = {
    text: 'Double click to edit',
    editing: false
  };

  const action$ = xs.merge(
    editing$,

    saveChanges$
  );

  const state$ = action$.fold((state, action) => action(state), initialState);

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

const listActions = {
  addCard (state) {
    return {
      ...state,

      cards: state.cards.add({})
    };
  }
};

const cardChildActions = {
  remove$ (state, removedCard) {
    return {
      ...state,

      cards: state.cards.remove(removedCard)
    };
  }
};

function listView (state, cardsVtrees) {
  return (
    div('.list', [
      button('.add-card', 'Add card'),

      div('.cards', cardsVtrees)
    ])
  );
}

function List ({DOM, props$}) {
  const cards = Collection(Card, {DOM}, cardChildActions);

  const addCard$ = DOM
    .select('.add-card')
    .events('click')
    .mapTo(listActions.addCard);

  const action$ = xs.merge(
    cards.action$,

    addCard$
  );

  const initialState = {
    cards
  };

  const state$ = action$.fold((state, action) => action(state), initialState);

  const cards$ = state$.map(state => state.cards);

  const cardsVtrees$ = Collection.pluck(cards$, 'DOM');

  return {
    DOM: xs.combine(listView, state$, cardsVtrees$).remember()
  };
}

const actions = {
  addList (state) {
    return {
      ...state,

      lists: state.lists.add({})
    };
  }
};

const listChildActions = {};

function view (state, listVtrees) {
  return (
    div('.main', [
      button('.add-list', 'Add list'),

      div('.lists', listVtrees)
    ])
  );
}

export default function main ({DOM}) {
  const lists = Collection(List, {DOM}, listChildActions);

  const initialState = {
    lists
  };

  const addList$ = DOM
    .select('.add-list')
    .events('click')
    .mapTo(actions.addList);

  const action$ = xs.merge(
    lists.action$,

    addList$
  );

  const state$ = action$.fold((state, action) => action(state), initialState);

  const lists$ = state$.map(state => state.lists);

  const listVtrees$ = Collection.pluck(lists$, 'DOM');

  return {
    DOM: xs.combine(view, state$, listVtrees$)
  };
}
