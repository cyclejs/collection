const fs = require('fs-extra');
fs.removeSync('lib') && fs.mkdirp('lib');
