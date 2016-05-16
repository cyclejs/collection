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
  addCard (cards) {
    return cards.add();
  }
};

const cardChildActions = {
  remove$ (cards, removedCard) {
    return cards.remove(removedCard);
  }
};

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
  const cards = Collection(Card, {DOM}, cardChildActions);

  const remove$ = DOM
    .select('.remove')
    .events('click');

  const addCard$ = DOM
    .select('.add-card')
    .events('click')
    .mapTo(listActions.addCard);

  const action$ = xs.merge(
    cards.action$,

    addCard$
  );

  const cards$ = action$.fold((state, action) => action(state), cards);

  const cardsVtrees$ = Collection.pluck(cards$, 'DOM');

  return {
    DOM: cardsVtrees$.map(listView),

    remove$
  };
}

const actions = {
  addList (lists) {
    return lists.add();
  }
};

const listChildActions = {
  remove$ (lists, removedList) {
    return lists.remove(removedList);
  }
};

function view (listVtrees) {
  return (
    div('.main', [
      button('.add-list', 'Add list'),

      div('.lists', listVtrees)
    ])
  );
}

export default function main ({DOM}) {
  const lists = Collection(List, {DOM}, listChildActions);

  const addList$ = DOM
    .select('.add-list')
    .events('click')
    .mapTo(actions.addList);

  const action$ = xs.merge(
    lists.action$,

    addList$
  );

  const lists$ = action$.fold((state, action) => action(state), lists);

  const listVtrees$ = Collection.pluck(lists$, 'DOM');

  return {
    DOM: listVtrees$.map(view)
  };
}
