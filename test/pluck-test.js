/* globals describe, it */
import assert from 'assert';
import xs from 'xstream';
import Collection from '../src/collection';

function Widget ({props$}) {
  return {
    state$: props$
  };
}

describe('Collection.pluck', (done) => {
  it('handles adding items', (done) => {
    const collection = Collection(Widget, {}, {});

    const props$ = xs.create().startWith({foo: 'bar'});

    const collectionUpdate$ = xs.fromArray([
      (col) => col.add({props$}),
      (col) => col.add({props$: xs.of({baz: 'quix'})})
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
