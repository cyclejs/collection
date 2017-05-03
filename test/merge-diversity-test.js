/* globals describe, it, beforeEach, afterEach */
import * as assert from 'assert';
import {Observable as O} from 'rxjs';
import {makeCollection} from '../src/collection';
import {setAdapt} from '@cycle/run/lib/adapt';

const Collection = makeCollection();

function Widget ({props$}) {
  return {
    action$: props$
  };
}

describe('Collection.merge with different stream libs', () => {
  beforeEach(function () {
    setAdapt(O.from);
  });

  afterEach(function () {
    setAdapt(x => x);
  });

  it('should return adapted stream', (done) => {
    const collection$ = Collection(Widget, {});
    const actions$ = Collection.merge(collection$, item => item.action$);
    assert.equal(typeof actions$.let, 'function');
    done();
  });

  it('handles adding items', (done) => {
    const props$ = O.of({foo: 'bar'});

    const collection$ = Collection(Widget, {}, O.of(
      {props$},
      {props$: O.of({baz: 'quix'})}
    ));

    const actions$ = Collection.merge(collection$, item => item.action$);

    const expected = [
      {foo: 'bar'},
      {baz: 'quix'}
    ];

    actions$.take(expected.length).subscribe({
      next (val) {
        assert.deepEqual(val, expected.shift());
      },
      error (err) {
        done(err);
      },
      complete () {
        assert.equal(expected.length, 0);
        done();
      }
    });
  });
});
