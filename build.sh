#!/usr/bin/env bash
if [ ! -d "node_modules" ]; then
    npm install
fi
./node_modules/uglify-js/bin/uglifyjs -mc -o jassino.min.js ./src/jassino.js
./node_modules/node-qunit-phantomjs/bin/node-qunit-phantomjs ./test/open_me_to_run_min.html --verbose
