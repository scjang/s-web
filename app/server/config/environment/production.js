'use strict';

var path = require('path');
/**
 * Production specific configuration
 */
module.exports = {
	api_server: 'http://api.wouzoo.com',
  root: path.normalize(__dirname + '/../../../../..'),
  port: 9000
};