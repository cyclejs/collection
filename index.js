import {run} from '@cycle/core';
import {makeDOMDriver} from '@cycle/dom';
import {restart, restartable} from 'cycle-restart';
import isolate from '@cycle/isolate';

var app = require('./src/app').default;

const drivers = {
  DOM: restartable(makeDOMDriver('.app'), {pauseSinksWhileReplaying: false}),
};

const {sinks, sources} = run(app, drivers);

if (module.hot) {
  module.hot.accept('./src/app', () => {
    app = require('./src/app').default;

    restart(app, drivers, {sinks, sources}, isolate);
  });
}
