# cycle-collections
An easier way to do collections in Cycle

Collection components, like todo lists and feeds, are one of the weakest points of Cycle's architecture currently.

Consider a TodoItem in a TodoList. It might have a remove button, and surely the whole point of isolation is that the TodoItem can select it's own remove button and click events. What happens when remove is clicked?

The current idiom involves having the components return a stream of actions, that are manually hooked up using a subject to the main stream of actions in the application.

cycle-collections provides a Collection helper function, to mask the subject and ease the pain of common actions like adding, removing and updating child components. It's designed to be used in any dataflow component that has children.


Installation
---

Coming soon to an npm near you...

Example
---

```js
import {run} from '@cycle/core';
import {makeDOMDriver, div, button} from '@cycle/dom';
import Collection from 'cycle-collections';

function Friend ({DOM, props$}) {
  const dismiss$ = DOM
    .select('.dismiss')
    .events('click');

  return {
    DOM: props$.map(props => (
      div('.friend', [
        JSON.stringify(props),
        button('.dismiss', 'x')
      ])
    ),

    dismiss$
  }
}

function FriendsList ({DOM}) {
  const friends = Collection(Friend, {DOM}, {
    dismiss$: function (state, dismissedFriend) => {
      return {
        ...state,

        friends: state.friends.remove(dismissedFriend)
      }
    }
  })

  const initialState = {
    friends
  }

  const addStartingFriend$ = Observable.just(
    (state) => ({...state, friends: state.friends.add({name: 'test'})})
  );

  const action$ = Observable.merge(
    addStartingFriend$,
    friends.action$
  )

  const state$ = action$
    .startWith(initialState)
    .scan((state, action) => action(state));

  return {
    DOM: state$.map(state => (
      div('.friends', state.friends.asArray().map(friend => friend.DOM))
    )
  }
}
```

