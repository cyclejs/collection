/* globals describe, it */
import assert from 'assert';
import xs from 'xstream';
import Collection from '../src/collection';

function Widget ({props$}) {
  return {
    state$: props$
  }
}

describe('Collection.pluck', (done) => {
  it('returns a stream of the values of the given sink', (done) => {
    let collection = Collection(Widget, {}, {});

    const props$ = xs.create();

    collection.add(props$).pluck('state$').addListener({
      next (val) {
        assert.deepEqual(val, [{foo: 'bar'}])
        done();
      },
      error (err) {
      },
      complete () {
      }
    });

    props$.shamefullySendNext({foo: 'bar'})
  });

  it('handles multiple items', (done) => {
    let collection = Collection(Widget, {}, {});

    const props$ = xs.create();
    const props2$ = xs.create();

    const states$ = collection
      .add(props$)
      .add(props2$)
      .pluck('state$');

    const expected = [
      [{foo: 'bar'}, {baz: 'quix'}],
      [{foo: 'bazaar!'}, {baz: 'quix'}]
    ];

    states$.take(2).addListener({
      next (val) {
        assert.deepEqual(val, expected.shift());

        if (expected.length === 1) {
          props$.shamefullySendNext({foo: 'bar'});
        }

        if (expected.length === 0) {
          done();
        }
      },
      error () {},
      complete () {}
    });

    props$.shamefullySendNext({foo: 'bar'});
    props2$.shamefullySendNext({baz: 'quix'});
  });

  it('handles adding items', (done) => {
    const collection = Collection(Widget, {}, {});

    const props$ = xs.create().startWith({foo: 'bar'});

    const collectionUpdate$ = xs.fromArray([
      (col) => col.add(props$),
      (col) => col.add({baz: 'quix'})
    ]);

    const collection$ = collectionUpdate$
      .fold((collection, action) => action(collection), collection);

    const states$ = Collection.pluck(collection$, 'state$');

    const expected = [
      [],
      [],
      [{foo: 'bar'}],
      [{foo: 'bar'}, {baz: 'quix'}]
    ];

    states$.take(4).addListener({
      next (val) {
        assert.deepEqual(val, expected.shift());

        if (expected.length === 0) {
          done();
        }
      },
      error (err) {done(err)},
      complete () {}
    });
  });
});
