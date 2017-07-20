'use strict';

var path = require('path');
/**
 * Production specific configuration
 */
module.exports = {
	api_server: 'http://api.wouzoo.com',
  root: path.normalize(__dirname + '/../../../../..'),
  version: '@version',
  port: 9000
};