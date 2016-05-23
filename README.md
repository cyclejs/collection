# cycle-collections
An easier way to do collections in Cycle

Components can be hard to manage in Cycle.js. They can be especially painful when you're working with lists of components.

`Collection` is a helper function that makes managing your lists of components a cinch.

How does it work?
---

<!-- share-code-between-examples -->

```js
import Collection from 'cycle-collections';
```

Let's say we have a `TodoListItem` component, and we want to make a `TodoList`.

```js
function TodoListItem (sources) {
  // ...

  return sinks;
}
```

You can make a collection by calling `Collection()` and passing it a component.

```js
const todoListItems = Collection(TodoListItem);
```

It's common in Cycle that you want to pass your `sources` to your children. You can pass a `sources` object as the second argument. Each item in the collection will be passed these sources.

```js
const todoListItems = Collection(TodoListItem, sources);
```

A `collection` has a couple of helpful methods:

  `collection.add(sources = {}): collection`

Returns a new collection, with a new item added. You can pass a sources object, which will be merged with the sources object you passed when you created the `collection`. This is useful for passing `props$`.

  `collection.remove(item): collection`

Returns a new collection with the item removed.

  `collection.asArray(): array`

Returns an array of the items in the `collection`. This array is cloned from the internal one, so changes will not impact the state of the `collection`.

Collections are **immutable**. This is because in Cycle.js values that change are represented as streams.

So how do you build collections that change over time?
---

The way that you build state over time in Cycle.js is to use `fold` (aka `scan` in Rx).

There is a particularly helpful pattern where you update a state object over time by `fold`ing over a stream of `reducers`.

So what is a `reducer`?

A `reducer` is a function that takes in `state` and returns an updated `state`.

Say we have a `TodoList` function, and we want to be able to add new `TodoListItem`s.

```js
function TodoList (sources) {
  const todoListItems = Collection(TodoListItem, sources);

  const sinks = {
    DOM: xs.of(
      div('.todo-list', [
        button('.add-todo', 'Add todo')
      ])
    )
  }

  return sinks;
}
```

We want to add a new TodoListItem to the collection when we click the 'Add todo' button.

To do this we need to get a stream of reducers to update the collection.

First we declare our reducer.

```js
function addItemReducer(todoListItems) {
  return todoListItems.add();
}
```

This will return a new copy of todoListItems with a new item added.

Now we can take a stream of click events on the 'Add todo' button.

```js
const addTodoClick$ = sources.DOM.select('.add-todo').events('click');
```

We then map over our `addTodoClick` stream to make our `reducer` stream.

```js
const addTodoReducer$ = addTodoClick$.mapTo(addItemReducer);
```

We can then build our collection stream by folding over our `reducer` stream.

```js
const todoListItems$ = addTodoReducer$
  .fold((items, reducer) => reducer(item), todoListItems);
```

There are a few things going in this line.
 * We're folding over `addTodoReducer$`, which is a stream of functions that take `todoListItems` and return updated `todoListItems`
 * We're calling each `reducer` and passing the current `items` into it. Each `reducer` returns an updated `items`.
 * We're passing `todoListItems` as the initial value to `fold`, which is the empty collection we made above in our `TodoList` function.

 If we put it all together in our `TodoList` it looks like this:

```js
function addItemReducer(todoListItems) {
  return todoListItems.add();
}

function TodoList (sources) {
  const todoListItems = Collection(TodoListItem, sources);

  const addTodoClick$ = sources.DOM.select('.add-todo').events('click');

  const addTodoReducer$ = addTodoClick$.mapTo(addItemReducer);

  const todoListItems$ = addTodoReducer$
    .fold((items, reducer) => reducer(item), todoListItems);

  const sinks = {
    DOM: xs.of(
      div('.todo-list', [
        button('.add-todo', 'Add todo')
      ])
    )
  }

  return sinks;
}
```

But wait, how do we get the `todoListItems` to show up in the `DOM`?

`Collection.pluck` to the rescue!

```js
const todoListItemVtrees$ = Collection.pluck(todoListItems$, 'DOM');
```

`Collection.pluck` takes a collection stream and a sink property and returns a stream of arrays of the latest value for each item. So for the `DOM` property each item in the stream is an array of vtrees. It handles the map/combine/flatten for you and also ensures that any `DOM` streams have unique keys on their vtree. This improves performance quite a bit and helps snabbdom tell the difference between each item.

We can now map over `todoListItemVtrees$` to display our todoListItems.

```js
const sinks = {
  DOM: todoListItemVtrees$.map(vtrees =>
    div('.todo-list', [
      button('.add-todo', 'Add todo'),

      div('.items', vtrees)
    ])
  )
}
```

Here's that all together:

```js
function addItemReducer(todoListItems) {
  return todoListItems.add();
}

function TodoList (sources) {
  const todoListItems = Collection(TodoListItem, sources);

  const addTodoClick$ = sources.DOM.select('.add-todo').events('click');

  const addTodoReducer$ = addTodoClick$.mapTo(addItemReducer);

  const todoListItems$ = addTodoReducer$
    .fold((items, reducer) => reducer(item), todoListItems);

  const todoListItemVtrees$ = Collection.pluck(todoListItems$, 'DOM');

  const sinks = {
    DOM: todoListItemVtrees$.map(vtrees =>
      div('.todo-list', [
        button('.add-todo', 'Add todo'),

        div('.items', vtrees)
      ])
    )
  }

  return sinks;
}
```

But wait, there's more!
---

There is another common and hard to solve problem with lists in Cycle.js.

Say our `TodoListItem` has a 'remove' button. What happens when you click it?

A `TodoListItem` can't really remove itself. The state of the parent element needs to change.

All that a `TodoListItem` can do is return a `remove$` stream as part of it's `sinks`, along with `DOM`.

Normally, to solve this problem you would need to create a circular reference between the sinks of the items in your collections and the stream of `reducers` you're `fold`ing over. This is achieved using `imitate` in `xs` or `Subject` in `rx`. This can be tricky code to write and read, and often adds quite a bit of boilerplate to your component.

When you create a `Collection` you can optionally pass a `sinkHandlers` object to map `sink` events on collection items to reducers in a stream.

```js
const todoListItems = Collection(TodoListItem, sources, {
  remove$: function (todoListItems, item, event) {
    return todoListItems.remove(item);
  }
});
```

Each of the functions provided in this object should match the name of a sink on the child components. Events coming out of the child sinks are then mapped using the provided function, and a reducer is returned.

The reducers from these sink events are available as `collection.reducers`. They take in `state` and return `state`.

In order to actually remove our `TodoListItem`s we need to merge our `reducers` into the stream of `reducers` we're `fold`ing over.

```js
const reducer$ = xs.merge(
  addTodoReducer$,

  todoListItems.reducers
);

const todoListItems$ = reducer$
  .fold((items, reducer) => reducer(item), todoListItems);
```

All together now!

```js
function addItemReducer(todoListItems) {
  return todoListItems.add();
}

function TodoList (sources) {
  const todoListItems = Collection(TodoListItem, sources, {
    remove$: function (todoListItems, item, event) {
      return todoListItems.remove(item);
    }
  });

  const addTodoClick$ = sources.DOM.select('.add-todo').events('click');

  const addTodoReducer$ = addTodoClick$.mapTo(addItemReducer);

  const reducer$ = xs.merge( // NEW
    addTodoReducer$,

    todoListItems.reducers
  );

  const todoListItems$ = reducers$ // CHANGED
    .fold((items, reducer) => reducer(item), todoListItems);

  const todoListItemVtrees$ = Collection.pluck(todoListItems$, 'DOM');

  const sinks = {
    DOM: todoListItemVtrees$.map(vtrees =>
      div('.todo-list', [
        button('.add-todo', 'Add todo'),

        div('.items', vtrees)
      ])
    )
  }

  return sinks;
}
```
