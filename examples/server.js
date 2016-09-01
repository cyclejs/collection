import budo from 'budo';
import babelify from 'babelify';
import bulkify from 'bulkify';
import hotModuleReloading from 'browserify-hmr';
import path from 'path';

budo(path.join(__dirname, '/index.js'), {
  serve: 'bundle.js',
  live: '*.{css,html}',
  port: 8000,
  stream: process.stdout,
  browserify: {
    transform: [babelify, bulkify],
    plugin: hotModuleReloading
  }
});
