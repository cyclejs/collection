import {run} from '@cycle/core';
import {makeDOMDriver, div, button, input} from '@cycle/dom';
import {Observable} from 'rx';
import Collection from './collection';

function Friend ({DOM, props$}) {
  const dismiss$ = DOM
    .select('.dismiss')
    .events('click');

  return {
    DOM: props$.map(props => (
      div('.friend', [
        props.name,
        button('.dismiss', 'x')
      ])
    )),

    dismiss$
  }
}

function addFriend (name) {
  return (state) => ({...state, friends: state.friends.add({name})});
}

function FriendsList ({DOM}) {
  const friends = Collection(Friend, {DOM}, {
    dismiss$: function (state, dismissedFriend, event) {
      return {
        ...state,

        friends: state.friends.remove(dismissedFriend)
      }
    }
  })

  const initialState = {
    friends
  }

  const friendName$ = DOM
    .select('.friend-name')
    .events('change')
    .map(ev => ev.target.value);

  const addFriend$ = DOM
    .select('.add-friend')
    .events('click')
    .withLatestFrom(friendName$, (_, friendName) => addFriend(friendName));

  const action$ = Observable.merge(
    addFriend$,
    friends.action$
  )

  const state$ = action$
    .startWith(initialState)
    .scan((state, action) => action(state));

  return {
    DOM: state$.map(state => (
      div('.friends', [
        input('.friend-name'),
        button('.add-friend', 'Add friend'),
        ...state.friends.asArray().map(friend => friend.DOM)
      ])
    ))
  }
}

export default FriendsList;
