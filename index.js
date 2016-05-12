import {run} from '@cycle/xstream-run';
import {makeDOMDriver} from '@cycle/dom';
import {restart, restartable} from 'cycle-restart';
import isolate from '@cycle/isolate';

var app = require('./src/app').default;

const drivers = {
  DOM: makeDOMDriver('.app'),
};

const {sinks, sources} = run(app, drivers);
