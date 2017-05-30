'use strict';

var path = require('path');
var _ = require('lodash');

var all = {
  app_name: 'wouzoo',
  env: process.env.NODE_ENV,
  // Root path of server
  root: path.normalize(__dirname + '/../../../..'),
  // Server port
  port: process.env.PORT || 9000,
  // Server IP
  ip: process.env.IP || '0.0.0.0',
  // facebook
  facebook: {
  	client_id: '227171867753653',
  	client_secret: '7f78a85163cc53b66a792da233ac1cdd',
  	client_url: '/auth/facebook/callback'
  },
  google: {
    tracking_id: 'UA-68405896-1'
  },
  twitter: {
    name: '@wouzoo'
  }
};

module.exports = _.merge(
  all,
  require('./' + process.env.NODE_ENV + '.js') || {}
);
