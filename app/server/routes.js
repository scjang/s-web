'use strict';

const errors = require('./controllers/errors');
const init = require('./controllers/init');
const auth = require('./controllers/auth');
const api = require('./controllers/api');
const mobile = require('is-mobile');
const path = require('path');
const request = require('request');

function getLocals (req, res, next) {
  req.app.locals.host = req.headers.host;
  req.app.locals.serverInfo.isMobile = mobile(req);
  next();
};

function requestLog (req, res, next) {
  let userAgent = req.get('User-Agent');
  let log = ['[', new Date(), ']', , req.url, '||', userAgent];
  console.log(log.join(' '));
  next();
}

module.exports = function (app) {
  app.get('/:url(Components|core|fonts|images|libs|models)/*', errors[404]);
  app.post('/api/do/*', requestLog, getLocals, api.extractTokens, api.proxy, api.getNewToken);
  app.get('/*', requestLog, getLocals, init.startApp, init.runPhantom);
};