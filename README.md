# cycle-collections
An easier way to do collections in Cycle

Components can be hard to manage in Cycle.js. They can be especially painful when you're working with lists of components.

`Collection` is a helper function that makes managing your lists of components a cinch.

Installation
---
```bash
$ npm install @cycle/collection --save
```

How does it work?
---

<!-- share-code-between-examples -->

```js
import Collection from '@cycle/collection';
```

Let's say we have a `TodoListItem` component, and we want to make a `TodoList`.

```js
function TodoListItem (sources) {
  // ...

  return sinks;
}
```

You can make a collection stream by calling `Collection()` and passing it a component.

```js
const todoListItems$ = Collection(TodoListItem);
```

It's common in Cycle that you want to pass your `sources` to your children. You can pass a `sources` object as the second argument. Each item in the collection will be passed these sources.

```js
const todoListItems$ = Collection(TodoListItem, sources);
```

To actually populate the collection, you pass an `add$` stream. Its emitted values may be sources objects, which will be merged with the sources object you passed when you created the `collection$`. This is useful for passing `props$`.

```js
const todoListItems$ = Collection(TodoListItem, sources, xs.of(additionalSources));
```

`add$` can emit an array, if multiple items should be added at once.

```js
const todoListItems$ = Collection(TodoListItem, sources, xs.of([firstSources, secondSources]));
```

`Collection()` returns a stream with arrays of items as values. Those arrays are cloned from internal ones, so changes will not impact the state of the `collection$`.

Collections are **immutable**. This is because in Cycle.js values that change are represented as streams.

If we put it all together in our `TodoList` it looks like this:

```js
function TodoList (sources) {
  const addTodo$ = sources.DOM
    .select('.add-todo')
    .events('click')
    .mapTo(null); // to prevent adding click events as sources

  const todoListItems$ = Collection(TodoListItem, sources, addTodo$);

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

Wait, how do we get the `todoListItems` to show up in the `DOM`?
---

`Collection.pluck` to the rescue!

```js
const todoListItemVtrees$ = Collection.pluck(todoListItems$, 'DOM');
```

`Collection.pluck` takes a collection stream and a sink property and returns a stream of arrays of the latest value for each item. So for the `DOM` property each item in the stream is an array of vtrees. It handles the map/combine/flatten for you and also ensures that any `DOM` streams have unique keys on their vtree. This improves performance quite a bit and helps snabbdom tell the difference between each item.

We can now map over `todoListItemVtrees$` to display our todoListItems.

```js
function TodoList (sources) {
  const addTodo$ = sources.DOM
    .select('.add-todo')
    .events('click')
    .mapTo(null); // to prevent adding click events as sources

  const todoListItems$ = Collection(TodoListItem, sources, addTodo$);

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

When you create a `Collection` you can optionally pass a `removeSinkName` string to specify that corresponding sink will trigger item's removal.

```js
const todoListItems = Collection(TodoListItem, sources, add$, 'remove$'); // 'remove$' is the default value, so it might be omitted as well
```

All together now!

```js
function TodoList (sources) {
  const addTodo$ = sources.DOM
    .select('.add-todo')
    .events('click')
    .mapTo(null); // to prevent adding click events as sources

  const todoListItems$ = Collection(TodoListItem, sources, addTodo$, 'remove$');

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

And how do we process fetched data?
---

It's a quite common use case when a collection is built from fetched data. Usually it comes in a form of items' state snapshot. `Collection.gather` takes a stream of those snapshots and turns into a stream of collections. Its signature is similar to `Collection`, but it takes `itemState$` instead of `add$`, plus it has an optional `idAttribute` argument, which defaults to `'id'`.

```js
const tasks$ = Collection.gather(Task, sources, fetchedTasks$, 'remove$', 'uid')
```

It uses a set of rules:

- items are keyed by `idAttribute`.
- items that weren't present in the previous snapshot are added to collection.
- each added item tracks it's own state, turning the sequence of each field's values into a source.
- item is removed from collection if it's no more present in a snapshot.

So what if our components issue HTTP requests?
---

There are kinds of sinks that rather represent actions than states. HTTP sink is a good example. If we want to get a stream of all HTTP requests issued by collection's items, `Collection.merge` will provide us one. It works basically the same as `Collection.pluck`, but merges the sinks instead of combining them into array.

```js
const tasksRequest$ = Collection.merge(tasks$, 'HTTP');
```