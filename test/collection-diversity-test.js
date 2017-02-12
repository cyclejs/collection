/* globals describe, it */
import * as assert from 'assert';
import {Observable as O} from 'rxjs';
import rxjsAdapter from '@cycle/rxjs-adapter';
import {makeCollection} from '../src/collection';

const Collection = makeCollection(rxjsAdapter);

function Widget ({props$}) {
  return {
    state$: props$
  };
}

describe('Collection with different stream libs', () => {
  it('takes an object of sources to pass to each item', (done) => {
    const props$ = O.empty();

    const collection$ = Collection(Widget, {props$}, O.of(null));

    const expected = [[], [props$]];

    collection$.take(expected.length).subscribe({
      next (items) {
        const expectedItems = expected.shift();
        assert.equal(items.length, expectedItems.length);

        items.forEach(item => {
          assert.equal(item.state$, expectedItems.shift());
        });
      },
      error (err) { done(err); },
      complete () {
        assert.equal(expected.length, 0);
        done();
      }
    });
  });

  it('is immutable', (done) => {
    const collection$ = Collection(Widget, {}, O.of(null, null, null));

    const expected = [0, 1, 2, 3];
    const real = [];

    collection$.take(expected.length).subscribe({
      next (items) {
        real.push(items);

        real.forEach((items, i) => {
          assert.equal(items.length, expected[i]);
        });
      },
      error (err) { done(err); },
      complete () {
        assert.equal(real.length, expected.length);
        done();
      }
    });
  });

  it('adds multiple items at once', (done) => {
    const collection$ = Collection(Widget, {}, O.of(null, [null, null]));

    const expected = [0, 1, 3];

    collection$.take(expected.length).subscribe({
      next (items) {
        assert.equal(items.length, expected.shift());
      },
      error (err) { done(err); },
      complete () {
        assert.equal(expected.length, 0);
        done();
      }
    });
  });

  it('takes an object of additional sources to be passed to the item', (done) => {
    const props$ = O.empty();

    const collection$ = Collection(Widget, {}, O.of({props$}));

    const expected = [[], [props$]];

    collection$.take(expected.length).subscribe({
      next (items) {
        const expectedItems = expected.shift();
        assert.equal(items.length, expectedItems.length);

        items.forEach(item => {
          assert.equal(item.state$, expectedItems.shift());
        });
      },
      error (err) { done(err); },
      complete () {
        assert.equal(expected.length, 0);
        done();
      }
    });
  });

  it('takes a function returning sink responsible for removal', (done) => {
    function Destroyable ({props$}) {
      return {
        destroy$: props$
      };
    }

    const props$ = O.interval(100).take(1);

    const collection$ = Collection(Destroyable, {}, O.of({props$}), item => item.destroy$);

    const expected = [0, 1, 0];

    collection$.take(expected.length).subscribe({
      next (items) {
        assert.equal(items.length, expected.shift());
      },
      error (err) { done(err); },
      complete () {
        assert.equal(expected.length, 0);
        done();
      }
    });
  });

  it('doesn\'t explode in case of repetative removal', (done) => {
    function Destroyable ({props$}) {
      return {
        destroy$: props$
      };
    }

    const props$ = O.interval(100);

    const collection$ = Collection(Destroyable, {}, O.of({props$}), item => item.destroy$);

    const expected = [0, 1, 0];
    let completed = false;

    collection$.take(expected.length).subscribe({
      next (items) {
        assert.equal(items.length, expected.shift());
      },
      error (err) { done(err); },
      complete () {
        completed = true;
      }
    });

    setTimeout(() => {
      assert.equal(expected.length, 0);
      assert.equal(completed, true);
      done();
    }, 500);
  });
});
