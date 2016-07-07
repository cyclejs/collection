import {run} from '@cycle/xstream-run';
import {makeDOMDriver} from '@cycle/dom';
import mouseDriver from './mouse-driver';

import app from './app';

const drivers = {
  DOM: makeDOMDriver('.app'),
  Mouse: mouseDriver
};

run(app, drivers);

if (module.hot) {
  module.hot.accept();
}
