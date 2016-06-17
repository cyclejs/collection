/* globals describe, it */
import assert from 'assert';
import xs from 'xstream';
import Collection from '../src/collection';

function Widget ({props$}) {
  return {
    action$: props$
  };
}

describe('Collection.merge', () => {
  it('handles adding items', (done) => {
    const props$ = xs.of({foo: 'bar'});

    const collection$ = Collection(Widget, {}, xs.of(
      {props$},
      {props$: xs.of({baz: 'quix'})}
    ));

    const actions$ = Collection.merge(collection$, 'action$');

    const expected = [
      {foo: 'bar'},
      {baz: 'quix'}
    ];

    actions$.take(expected.length).addListener({
      next (val) {
        assert.deepEqual(val, expected.shift());
      },
      error (err) {done(err)},
      complete () {
        assert.equal(expected.length, 0);
        done();
      }
    });
  });
});
