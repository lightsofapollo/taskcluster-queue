#! /bin/bash -vex

# These can safely be run in all cases
./node_modules/.bin/nodeunit test/validate_test.js
 # test/data_test.js (disabled as it doesn't work reliably)

./node_modules/.bin/mocha \
  test/api/*.js \
  test/queue/*.js
