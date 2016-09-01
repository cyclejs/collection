import {run} from '@cycle/xstream-run';
import {makeDOMDriver} from '@cycle/dom';

import app from './app';

const drivers = {
  DOM: makeDOMDriver('.app')
};

run(app, drivers);
