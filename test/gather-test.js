import assert from 'assert';
import xs from 'xstream';
import delay from 'xstream/extra/delay';
import Collection from '../src/collection';

function Widget ({props}) {
  return {
    state$: props
  };
}

describe('Collection.gather', (done) => {
  it('adds initial items', (done) => {
    const itemState$ = xs.of([
      { id: 0, props: {foo: 'bar'}},
      { id: 1, props: {baz: 'quix'}}
    ]);
    const collection$ = Collection.gather(itemState$, Widget, {}, {});

    const expected = [
      [],
      [
        [{foo: 'bar'}],
        [{baz: 'quix'}]
      ]
    ];

    collection$.take(expected.length).addListener({
      next (collection) {
        const expectedItems = expected.shift();
        const items = collection.asArray();
        assert.equal(items.length, expectedItems.length);
        
        items.forEach((item, i) => {
          const expectedItem = expectedItems[i];
          item.state$.take(expectedItem.length).addListener({
            next (val) {
              assert.deepEqual(val, expectedItem.shift());
            },
            error (err) {done(err)},
            complete () {}
          });
        });
      },
      error (err) {done(err)},
      complete () {
        done();
      }
    });
  });
});

describe('Collection.gather', (done) => {
  it('tracks item\'s state by id', (done) => {
    const itemState$ = xs.of([
      { id: 0, props: {foo: 'bar'}}
    ],
    [
      { id: 0, props: {baz: 'quix'}}
    ]);
    const collection$ = Collection.gather(itemState$, Widget, {}, {});

    const expected = [
      [],
      [
        [{foo: 'bar'}, {baz: 'quix'}]
      ]
    ];

    collection$.take(expected.length).addListener({
      next (collection) {
        const expectedItems = expected.shift();
        const items = collection.asArray();
        assert.equal(items.length, expectedItems.length);

        items.forEach((item, i) => {
          const expectedItem = expectedItems[i];
          item.state$.take(expectedItem.length).addListener({
            next (val) {
              assert.deepEqual(val, expectedItem.shift());
            },
            error (err) {done(err)},
            complete () {}
          });
        });
      },
      error (err) {done(err)},
      complete () {
        done();
      }
    });
  });
});

describe('Collection.gather', (done) => {
  it('adds new appearing items', (done) => {
    const itemState$ = xs.of([
      { id: 0, props: {foo: 'bar'}}
    ],
    [
      { id: 0, props: {foo: 'bar'}},
      { id: 1, props: {baz: 'quix'}}
    ]);
    const collection$ = Collection.gather(itemState$, Widget, {}, {});

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
      next (collection) {
        const expectedItems = expected.shift();
        const items = collection.asArray();
        assert.equal(items.length, expectedItems.length);

        items.forEach((item, i) => {
          const expectedItem = expectedItems[i];
          item.state$.take(expectedItem.length).addListener({
            next (val) {
              assert.deepEqual(val, expectedItem.shift());
            },
            error (err) {done(err)},
            complete () {}
          });
        });
      },
      error (err) {done(err)},
      complete () {
        done();
      }
    });
  });
});

describe('Collection.gather', (done) => {
  it('removes the items that are no more present', (done) => {
    const itemState$ = xs.of([
        { id: 0, props: {foo: 'bar'}},
        { id: 1, props: {baz: 'quix'}}
      ],
      [
        { id: 0, props: {foo: 'bar'}}
      ])
      // items should be added asynchronously for collection.reducers to work properly
      .compose(delay());
    const collection$ = Collection.gather(itemState$, Widget, {}, {});

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
      next (collection) {
        const expectedItems = expected.shift();
        const items = collection.asArray();
        assert.equal(items.length, expectedItems.length);

        items.forEach((item, i) => {
          const expectedItem = expectedItems[i];
          item.state$.take(expectedItem.length).addListener({
            next (val) {
              assert.deepEqual(val, expectedItem.shift());
            },
            error (err) {done(err)},
            complete () {}
          });
        });
      },
      error (err) {done(err)},
      complete () {
        done();
      }
    });
  });
});