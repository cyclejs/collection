# cycle-collections
An easier way to do collections in Cycle

Managing child components in Cycle.js can be a pain. The recommended approach is using "Dataflow Components", which are really just mini Cycle main functions. The tricky part is managing their addition, removal, updates and isolation.

`cycle-collections` provides a little helper function to manage your collections. It automatically isolates and adds keys to your DOM streams, so you can easily write components that work how you expect.

Say we have a `Counter` component:

<!-- share-code-between-examples -->

```js
function Counter({DOM}) {
  const add$ = DOM
    .select('.add')
    .events('click')
    .mapTo(+1);

  const count$ = add$
    .fold((total, change) => total + change, 0);

  return {
    DOM: count$.map(count => (
      div('.counter', [
        div('.count', count.toString()),
        button('.add', '+')
      ])
    ))
  }
}
```

If we want to make a list of them, we can do it like so:

```js
const counters = Collection(Counter, {DOM});

counters.asArray();
// => []
```

We can add a new counter by calling `.add()`

```js
counters.add();

counters.asArray();
// => []
```

Why is counters still empty? Well, all of the methods on a `Collection` are immutable, aka they return a new collection, not modifying your current one.

So how do you build up a collection? You store the result of the call to `.add()`

```js
const updatedCounters = counters.add();

updatedCounters.asArray();
// => [{counter!}]
```

You can also `.remove()` items:
```js
const twoCounters = counters
  .add()
  .add();

const firstCounter = counters.asArray()[0];

updatedCounters
  .remove(firstCounter)
  .asArray()
  .length
// => 1
```

If the usage seems strange it's because `Collection` is designed to be used inside of the `scan`/`fold` of a Cycle.js component.

Here is an example of a CounterList function:

```js
function CounterList ({DOM}) {
  const initialCounters = Collection(Counter, {DOM});

  const addCounter$ = DOM
    .select('.add-counter')
    .events('click');

  const counters$ = addCounter$
    .fold((counters) => counters.add(), initialCounters);

  const counterVtrees$ = Collection.pluck(counters$, 'DOM');

  return {
    DOM: counterVtrees$.map(counterVtrees => (
      div('.counter-list', [
        button('.add-counter', 'Add counter'),
        div('.counters', counterVtrees)
      ])
    ))
  };
}
```

Here we encounter one of the most useful parts of `Collection`, `Collection.pluck`. `Collection.pluck` takes a stream where each item is a collection, and a property to pluck. It returns a stream of an array of each item's property combined.

Normally this is a map + flatten + combine but cycle-collection makes this one function call.

There's another problem with collections in Cycle that can be very painful. Say we want our counters to have a remove button:

```js
function Counter({DOM}) {
  const add$ = DOM
    .select('.add')
    .events('click')
    .mapTo(+1);

  const count$ = add$
    .fold((total, change) => total + change, 0);

  const remove$ = DOM
    .select('.remove')
    .events('click');

  return {
    DOM: count$.map(count => (
      div('.counter', [
        div('.count', count.toString()),
        button('.add', '+'),
        button('.remove', 'x')
      ])
    )),

    remove$
  }
}
```

It's obvious that the `Counter` should `.select` the remove events stream, and display the button, but what happens when it's clicked? How can a component remove itself?

It can't. Removing oneself is to change the state of the component that contains you. So `cycle-collections` allows for exactly that.

When you create a collection, you can provide a object with functions to handle actions from your child components:

```js
const counterChildActions = {
  remove$: function (counters, removedCounter) {
    return counters.remove(removedCounter);
  }
}

const counters = Collection(counters, {DOM}, counterChildActions);
```

We can get a stream of these child actions from `Collection.action$`:

```js
const counterChildActions = {
  remove$: function (counters, removedCounter) {
    return counters.remove(removedCounter);
  }
}

const actions = {
  addCounter: function (counters) {
    return counters.add();
  }
}

function CounterList ({DOM}) {
  const initialCounters = Collection(Counter, {DOM}, counterChildActions);

  const addCounter$ = DOM
    .select('.add-counter')
    .events('click')
    .mapTo(actions.addCounter);

  const action$ = xs.merge(
    initialCounters.action$,

    addCounter$
  );

  const counters$ = action$
    .fold((counters, action) => action(counters), initialCounters);

  const counterVtrees$ = Collection.pluck(counters$, 'DOM');

  return {
    DOM: counterVtrees$.map(counterVtrees => (
      div('.counter-list', [
        button('.add-counter', 'Add counter'),
        div('.counters', counterVtrees)
      ])
    ))
  };
}
```
