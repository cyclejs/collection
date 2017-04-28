import {run} from '@cycle/run';
import {makeDOMDriver} from '@cycle/dom';

import app from './app';

const drivers = {
  DOM: makeDOMDriver('.app')
};

run(app, drivers);
