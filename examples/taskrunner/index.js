import {run} from '@cycle/run';
import {makeDOMDriver} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';

var app = require('./app').default;

const drivers = {
  DOM: makeDOMDriver('.app'),
  HTTP: makeHTTPDriver()
};

run(app, drivers);
