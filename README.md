# cycle-collections
An easier way to do collections in Cycle

Managing child components in Cycle.js can be a pain. The recommended approach is using "Dataflow Components", which are really just mini Cycle main functions. The tricky part is managing their addition, removal, updates and isolation.

`cycle-collections` provides a little helper function to manage your collections.

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

counters.asArray();
// => [{counter!}]
```

You can also `.remove()` items:
```js
const updatedCounters = counters
  .add()
  .add();

const firstCounter = counters.asArray()[0];

updatedCounters
  .remove(firstCounter)
  .asArray()
  .length
// => 2
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


