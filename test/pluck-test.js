/* globals describe, it */
import assert from 'assert';
import xs from 'xstream';
import Collection from '../src/collection';

function Widget ({props$}) {
  return {
    state$: props$
  };
}

describe('Collection.pluck', () => {
  it('handles adding items', (done) => {
    const props$ = xs.create().startWith({foo: 'bar'});

    const collection$ = Collection(Widget, {}, xs.of(
      {props$},
      {props$: xs.of({baz: 'quix'})}
    ));

    const states$ = Collection.pluck(collection$, item => item.state$);

    const expected = [
      [],
      [],
      [{foo: 'bar'}],
      [{foo: 'bar'}, {baz: 'quix'}]
    ];

    states$.take(expected.length).addListener({
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
