
/* globals describe, it */
import assert from 'assert';
import xs from 'xstream';
import Collection from '../src/collection';

describe('Collection', () => {
  it('takes a broadcast selector to allow communication between items', (done) => {
    function WhatTheFuck ({input$, Broadcast}) {
      return {
        output$: input$,
        broadcast$: Broadcast.output$
      };
    }

    const firstItem = {input$: xs.periodic(100).take(3)};
    const secondItem = {input$: xs.of(1)};

    const collection$ = Collection(
      WhatTheFuck,
      {},
      xs.of([firstItem, secondItem]),
      item => item.destroy$,
      {
        output$: item => item.output$
      }
    );

    const expected = [
      [],
      [1, 0],
      [1, 1],
      [1, 2]
    ];

    Collection.pluck(collection$, item => item.broadcast$).addListener({
      next (items) {
        assert.deepEqual(items, expected.shift());
      },
      error: done,
      complete () {
        assert.equal(expected.length, 0);
        done();
      }
    });
  });
});
