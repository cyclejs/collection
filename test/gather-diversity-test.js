/* globals describe, it, beforeEach, afterEach */
import * as assert from 'assert';
import {Observable as O} from 'rxjs';
import {makeCollection} from '../src/collection';
import {setAdapt} from '@cycle/run/lib/adapt';

const Collection = makeCollection();

function Widget ({props}) {
  return {
    state$: props
  };
}

describe('Collection.gather with different stream libs', () => {
  beforeEach(function () {
    setAdapt(O.from);
  });

  afterEach(function () {
    setAdapt(x => x);
  });

  it('should return adapted stream', (done) => {
    const collection$ = Collection.gather(Widget, {}, O.of({ props: 'foo' }));
    assert.equal(typeof collection$.let, 'function');
    done();
  });

  it('adds initial items', (done) => {
    const itemState$ = O.of([
      {id: 0, props: {foo: 'bar'}},
      {id: 1, props: {baz: 'quix'}}
    ]);
    const collection$ = Collection.gather(Widget, {}, itemState$);

    const expected = [
      [],
      [
        [{foo: 'bar'}],
        [{baz: 'quix'}]
      ]
    ];

    collection$.take(expected.length).subscribe({
      next (items) {
        const expectedItems = expected.shift();
        assert.equal(items.length, expectedItems.length);

        items.forEach(item => {
          const expectedItem = expectedItems.shift();
          item.state$.take(expectedItem.length).subscribe({
            next (val) {
              assert.deepEqual(val, expectedItem.shift());
            },
            error (err) { done(err); },
            complete () {
              assert.equal(expectedItem.length, 0);
            }
          });
        });
      },
      error (err) { done(err); },
      complete () {
        assert.equal(expected.length, 0);
        done();
      }
    });
  });

  it('tracks item\'s state by id', (done) => {
    const itemState$ = O.of([
      {id: 0, props: {foo: 'bar'}}
    ], [
      {id: 0, props: {baz: 'quix'}}
    ]);
    const collection$ = Collection.gather(Widget, {}, itemState$);

    const expected = [
      [],
      [
        [{foo: 'bar'}, {baz: 'quix'}]
      ]
    ];

    collection$.take(expected.length).subscribe({
      next (items) {
        const expectedItems = expected.shift();
        assert.equal(items.length, expectedItems.length);

        items.forEach(item => {
          const expectedItem = expectedItems.shift();
          item.state$.take(expectedItem.length).subscribe({
            next (val) {
              assert.deepEqual(val, expectedItem.shift());
            },
            error (err) { done(err); },
            complete () {
              assert.equal(expectedItem.length, 0);
            }
          });
        });
      },
      error (err) { done(err); },
      complete () {
        assert.equal(expected.length, 0);
        done();
      }
    });
  });

  it('adds new appearing items', (done) => {
    const itemState$ = O.of([
      {id: 0, props: {foo: 'bar'}}
    ], [
      {id: 0, props: {foo: 'bar'}},
      {id: 1, props: {baz: 'quix'}}
    ]);
    const collection$ = Collection.gather(Widget, {}, itemState$);

    const expected = [
      [],
      [
        [{foo: 'bar'}]
      ],
      [
        [{foo: 'bar'}],
        [{baz: 'quix'}]
      ]
    ];

    collection$.take(expected.length).subscribe({
      next (items) {
        const expectedItems = expected.shift();
        assert.equal(items.length, expectedItems.length);

        items.forEach(item => {
          const expectedItem = expectedItems.shift();
          item.state$.take(expectedItem.length).subscribe({
            next (val) {
              assert.deepEqual(val, expectedItem.shift());
            },
            error (err) { done(err); },
            complete () {
              assert.equal(expectedItem.length, 0);
            }
          });
        });
      },
      error (err) { done(err); },
      complete () {
        assert.equal(expected.length, 0);
        done();
      }
    });
  });

  it('removes the items that are no more present', (done) => {
    const itemState$ = O.of([
      {id: 0, props: {foo: 'bar'}},
      {id: 1, props: {baz: 'quix'}}
    ], [
      {id: 0, props: {foo: 'bar'}}
    ]);
    const collection$ = Collection.gather(Widget, {}, itemState$);

    const expected = [
      [],
      [
        [{foo: 'bar'}],
        [{baz: 'quix'}]
      ],
      [
        [{foo: 'bar'}]
      ]
    ];

    collection$.take(expected.length).subscribe({
      next (items) {
        const expectedItems = expected.shift();
        assert.equal(items.length, expectedItems.length);

        items.forEach(item => {
          const expectedItem = expectedItems.shift();
          item.state$.take(expectedItem.length).subscribe({
            next (val) {
              assert.deepEqual(val, expectedItem.shift());
            },
            error (err) { done(err); },
            complete () {
              assert.equal(expectedItem.length, 0);
            }
          });
        });
      },
      error (err) { done(err); },
      complete () {
        assert.equal(expected.length, 0);
        done();
      }
    });
  });

  it('uses transformKey function to transform source keys', (done) => {
    const itemState$ = O.of([
      {id: 0, props: {foo: 'bar'}}
    ]);

    function MockedComponent (sources) {
      assert.ok(sources.props$);
      done();
    }

    const collection$ = Collection.gather(MockedComponent, {}, itemState$, 'id', key => `${key}$`);
    collection$.subscribe({
      next () {},
      error (err) { done(err); },
      complete () {}
    });
  });
});
