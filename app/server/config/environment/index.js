'use strict';

var path = require('path');
var _ = require('lodash');

var all = {
  app_name: 'S',
  version: '@version',
  env: process.env.NODE_ENV,
  root: path.normalize(__dirname + '/../../../..'),
  port: process.env.PORT || 9000,
  ip: process.env.IP || '0.0.0.0',
  facebook: {
  	client_id: '',
  	client_secret: '',
  	client_url: ''
  },
  google: {
    tracking_id: ''
  },
  twitter: {
    name: ''
  }
};

module.exports = _.merge(
  all,
  require('./' + process.env.NODE_ENV + '.js') || {}
);
