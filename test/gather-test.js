import assert from 'assert';
import xs from 'xstream';
import delay from 'xstream/extra/delay';
import Collection from '../src/collection';

function Widget ({props}) {
  return {
    state$: props
  };
}

describe('Collection.gather', () => {
  it('adds initial items', (done) => {
    const itemState$ = xs.of([
      { id: 0, props: {foo: 'bar'}},
      { id: 1, props: {baz: 'quix'}}
    ]);
    const collection$ = Collection.gather(Widget, {}, itemState$);

    const expected = [
      [],
      [
        [{foo: 'bar'}],
        [{baz: 'quix'}]
      ]
    ];

    collection$.take(expected.length).addListener({
      next (items) {
        const expectedItems = expected.shift();
        assert.equal(items.length, expectedItems.length);
        
        items.forEach(item => {
          const expectedItem = expectedItems.shift();
          item.state$.take(expectedItem.length).addListener({
            next (val) {
              assert.deepEqual(val, expectedItem.shift());
            },
            error (err) {done(err)},
            complete () {
              assert.equal(expectedItem.length, 0);
            }
          });
        });
      },
      error (err) {done(err)},
      complete () {
        assert.equal(expected.length, 0);
        done();
      }
    });
  });
  
  it('tracks item\'s state by id', (done) => {
    const itemState$ = xs.of([
      { id: 0, props: {foo: 'bar'}}
    ],
    [
      { id: 0, props: {baz: 'quix'}}
    ]);
    const collection$ = Collection.gather(Widget, {}, itemState$);

    const expected = [
      [],
      [
        [{foo: 'bar'}, {baz: 'quix'}]
      ]
    ];

    collection$.take(expected.length).addListener({
      next (items) {
        const expectedItems = expected.shift();
        assert.equal(items.length, expectedItems.length);

        items.forEach(item => {
          const expectedItem = expectedItems.shift();
          item.state$.take(expectedItem.length).addListener({
            next (val) {
              assert.deepEqual(val, expectedItem.shift());
            },
            error (err) {done(err)},
            complete () {
              assert.equal(expectedItem.length, 0);
            }
          });
        });
      },
      error (err) {done(err)},
      complete () {
        assert.equal(expected.length, 0);
        done();
      }
    });
  });
  
  it('adds new appearing items', (done) => {
    const itemState$ = xs.of([
      { id: 0, props: {foo: 'bar'}}
    ],
    [
      { id: 0, props: {foo: 'bar'}},
      { id: 1, props: {baz: 'quix'}}
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

    collection$.take(expected.length).addListener({
      next (items) {
        const expectedItems = expected.shift();
        assert.equal(items.length, expectedItems.length);

        items.forEach(item => {
          const expectedItem = expectedItems.shift();
          item.state$.take(expectedItem.length).addListener({
            next (val) {
              assert.deepEqual(val, expectedItem.shift());
            },
            error (err) {done(err)},
            complete () {
              assert.equal(expectedItem.length, 0);
            }
          });
        });
      },
      error (err) {done(err)},
      complete () {
        assert.equal(expected.length, 0);
        done();
      }
    });
  });
  
  it('removes the items that are no more present', (done) => {
    const itemState$ = xs.of([
      { id: 0, props: {foo: 'bar'}},
      { id: 1, props: {baz: 'quix'}}
    ],
    [
      { id: 0, props: {foo: 'bar'}}
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

    collection$.take(expected.length).addListener({
      next (items) {
        const expectedItems = expected.shift();
        assert.equal(items.length, expectedItems.length);

        items.forEach(item => {
          const expectedItem = expectedItems.shift();
          item.state$.take(expectedItem.length).addListener({
            next (val) {
              assert.deepEqual(val, expectedItem.shift());
            },
            error (err) {done(err)},
            complete () {
              assert.equal(expectedItem.length, 0);
            }
          });
        });
      },
      error (err) {done(err)},
      complete () {
        assert.equal(expected.length, 0);
        done();
      }
    });
  });
});