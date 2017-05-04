/* globals describe, it, beforeEach, afterEach */
import * as assert from 'assert';
import {Observable as O} from 'rxjs';
import {makeCollection} from '../src/collection';
import {setAdapt} from '@cycle/run/lib/adapt';

const Collection = makeCollection();

function Widget ({props$}) {
  return {
    state$: props$
  };
}

describe('Collection.pluck with different stream libs', () => {
  beforeEach(function () {
    setAdapt(O.from);
  });

  afterEach(function () {
    setAdapt(x => x);
  });

  it('should return adapted stream', (done) => {
    const collection$ = Collection(Widget, {});
    const states$ = Collection.pluck(collection$, item => item.state$);
    assert.equal(typeof states$.let, 'function');
    done();
  });

  it('handles adding items', (done) => {
    const props$ = O.never().startWith({foo: 'bar'});

    const collection$ = Collection(Widget, {}, O.of(
      {props$},
      {props$: O.of({baz: 'quix'})}
    ));

    const states$ = Collection.pluck(collection$, item => item.state$);

    const expected = [
      [],
      [],
      [{foo: 'bar'}],
      [{foo: 'bar'}, {baz: 'quix'}]
    ];

    states$.take(expected.length).subscribe({
      next (val) {
        assert.deepEqual(val, expected.shift());
      },
      error (err) { done(err); },
      complete () {
        assert.equal(expected.length, 0);
        done();
      }
    });
  });
});
