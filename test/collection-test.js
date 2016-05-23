/* globals describe, it */
import assert from 'assert';
import xs from 'xstream';
import Collection from '../src/collection';

function Widget ({props$}) {
  return {
    state$: props$
  };
}

describe('Collection', () => {
  const collection = Collection(Widget);

  it('takes an object of sources to pass to each item', () => {
    const props$ = xs.empty();

    const collection = Collection(Widget, {props$});

    assert.equal(collection.add().asArray()[0].state$, props$);
  });

  describe('.add', () => {
    it('starts out empty', () => {
      assert.equal(collection.asArray().length, 0);
    });

    it('adds items', () => {
      assert.equal(collection.add().asArray().length, 1);
    });

    it('is immutable', () => {
      const collectionWithOneItem = collection.add();

      assert.equal(collectionWithOneItem.asArray().length, 1);

      collectionWithOneItem.add();
      collectionWithOneItem.add();
      collectionWithOneItem.add();

      assert.equal(collectionWithOneItem.asArray().length, 1);
      assert.equal(collectionWithOneItem.add().asArray().length, 2);
    });

    it('takes an object of additional sources to be passed to the item', () => {
      const props$ = xs.empty();

      const collectionWithOneItemWithProps = collection.add({props$});

      assert.equal(props$, collectionWithOneItemWithProps.asArray()[0].state$);
    });
  });

  describe('.remove', () => {
    it('removes the given item from the collection', () => {
      const collectionWithOneItem = collection.add();

      const item = collectionWithOneItem.asArray()[0];

      const emptyCollection = collectionWithOneItem.remove(item);

      assert.equal(emptyCollection.asArray().length, 0);
    });

    it("doesn't explode if the item isn't present", () => {
      const collectionWithOneItem = collection.add();

      const item = collectionWithOneItem.asArray()[0];

      collectionWithOneItem
        .remove(item)
        .remove(item);
    });
  });

  describe('.reducers', () => {
    it('maps item sinks into a stream of reducers', (done) => {
      function Removable ({props$}) {
        return {
          remove$: props$.mapTo('remove!')
        };
      }

      const props$ = xs.create();

      const collection = Collection(Removable, {}, {
        remove$ (state, item, event) {
          return state.remove(item);
        }
      }).add({props$});

      collection.reducers.take(1).addListener({
        next (reducer) {
          assert.equal(reducer(collection).asArray().length, 0);

          done();
        },

        error (err) {
          throw err;
        },

        complete () {}
      });

      props$.shamefullySendNext('woo');
    });
  });
});
