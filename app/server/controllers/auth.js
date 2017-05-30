'use strict';

const request = require('request');
const _ = require('lodash');
const config = require('../config/environment');

function encryptToken (accessToken, refreshToken) {
  let tokens = accessToken + '|' + refreshToken;
  let encryptedToken = new Buffer(tokens).toString('base64');

  return encryptedToken;
};

function decryptToken (encryptedToken) {  
  let decryptedToken = new Buffer(encryptedToken, 'base64').toString('ascii');
  let token = decryptedToken.split('|');

  return {
    access_token: token[0],
    refresh_token: token[1]
  };
};

function signup (req, res, next) {
  let options = {
    url: config.api_server + '/account/create',
    method: 'POST',
    body: req.body,
    json: true
  };

  request(options, function (err, response, body) {
  	if (err) return res.send(err);
    if (body.status === 'error') {
      _.extend(req.app.locals, { error: body.error.message });
      return res.render('signup', { env: req.app.locals });
    }

    req.token = body.data;
    next();
  });
}

function login (req, res, next) {
  let options = {
    url: config.api_server + '/auth/local',
    method: 'POST',
    body: req.body,
    json: true
  };

  request(options, function (err, response, body) {
  	if (err) return res.send(err);
    if (body.status === 'error') {
      _.extend(req.app.locals, { error: body.message });
      return res.render('login', { env: req.app.locals });
    }

    req.token = body.data;
    next();
  });
}

function setCookie (req, res, next) {
  let accessToken = req.token.access_token;
  let refreshToken = req.token.refresh_token;
  let cookieValue = encryptToken(accessToken, refreshToken);

  res.cookie(config.app_name, JSON.stringify(cookieValue).replace(/\"/g, ''));
  res.redirect('/');
};

exports.signup = signup;
exports.login = login;
exports.encryptToken = encryptToken;
exports.decryptToken = decryptToken;
exports.setCookie = setCookie;
