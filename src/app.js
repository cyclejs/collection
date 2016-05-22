import {div, button, textarea} from '@cycle/dom';
import xs from 'xstream';
import Collection from './collection';

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

const listReducers = {
  addCard (cards) {
    return cards.add();
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
  const cards = Collection(Card, {DOM}, {
    remove$ (cards, removedCard) {
      return cards.remove(removedCard);
    }
  });

  const remove$ = DOM
    .select('.remove')
    .events('click');

  const addCard$ = DOM
    .select('.add-card')
    .events('click')
    .mapTo(listReducers.addCard);

  const reducer$ = xs.merge(
    cards.reducers,

    addCard$
  );

  const cards$ = reducer$.fold((state, reducer) => reducer(state), cards);

  const cardsVtrees$ = Collection.pluck(cards$, 'DOM');

  return {
    DOM: cardsVtrees$.map(listView),

    remove$
  };
}

const reducers = {
  addList (lists) {
    return lists.add();
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
  const lists = Collection(List, {DOM}, {
    remove$ (lists, removedList) {
      return lists.remove(removedList);
    }
  });

  const addList$ = DOM
    .select('.add-list')
    .events('click')
    .mapTo(reducers.addList);

  const reducer$ = xs.merge(
    lists.reducers,

    addList$
  );

  const lists$ = reducer$.fold((state, reducer) => reducer(state), lists);

  const listVtrees$ = Collection.pluck(lists$, 'DOM');

  return {
    DOM: listVtrees$.map(view)
  };
}
