'use strict';

const _ = require('lodash');
const request = require('request');
const querystring = require('querystring');
const apiMap = require('./api_map');
const auth = require('./auth');
const config = require('../config/environment');

function getApiRoute (method) {
	if (apiMap[method] === undefined) {
		console.error('>>>> api method not found!');
		return;
	}
	return apiMap[method];
}

function extractTokens (req, res, next) {
	if (req.body.encryptedTokens) {
		req.tokens = auth.decryptToken(req.body.encryptedTokens);
		return next();
	} 

	if (req.cookies[config.app_name]) {
		req.tokens = auth.decryptToken(req.cookies[config.app_name]);
		return next();
	} 
	
	return res.status(401).json({
		status: 'error',
		message: 'tokens did not attached'
	});
}

function proxy (req, res, next) {
	let apiRoute = getApiRoute(req.body.method);
	let apiUrl = apiRoute.url;
	let regexp = /([:]\D\w+)/g;
	let match;
	
	if (!apiRoute) {
		return res.status(404).send('Not Found!');
	}
	
	while (match = regexp.exec(apiRoute.url)) {
		_.each(req.body, function (value, key) {
			if (match[1] === ':' + key) {
				apiUrl = apiUrl.replace(':' + key, value);
				delete req.body[key];
				return false;
			}
		});
	}

	let headers = {
		'Authorization': 'Bearer ' + req.tokens.access_token
	};

	let options = {
		url: apiUrl,
		method: apiRoute.method,
		headers: headers,
		timeout: 5000,
		json: true
	};

	if (apiRoute.method === 'GET') {
		options = _.extend(options, {
			qs: req.body
		});
	} else {
		options = _.extend(options, {
			body: req.body
		});	
	}

	if (req.body.method) {
		delete req.body.method;
	}

	request(options, function (error, response, body) {
		if (!body) return res.status(500);

		if (config.env !== 'production') {
			console.log('.......... api proxy start .............')
			console.log('[start] %j', options);
			console.log('[error] %j', error);
			console.log('[status_code] %j', response.statusCode);
			console.log('[body] %j', body);
		}
		if ((body.status && body.data) && body.status === 'error' && body.data.code === 'invalid_token') {
			req.originalRequest = options;
			return next();
		}

		if (body.status === 'success') {
			return res.status(response.statusCode).json(body.data);
		}

		return res.status(response.statusCode).json(body);
	});
}

function getNewToken (req, res, next) {
	let originalRequest = req.originalRequest;
	let tokenOptions = {
		url: config.api_server + '/token/refresh',
		method: 'POST',
		body: {
			refresh_token: req.tokens.refresh_token
		},
		timeout: 5000,
		json: true
	};

	request(tokenOptions, function (error, response, body) {
		if (!body) return res.status(500);

		let cookieValue = auth.encryptToken(body.data.access_token, body.data.refresh_token);
		
		res.clearCookie(config.app_name);
		res.cookie(config.app_name, JSON.stringify(cookieValue).replace(/\"/g, ''));

		// change new token and request
		originalRequest = _.extend(originalRequest, {
			headers: {
				'Authorization': 'Bearer ' + body.data.access_token
			}
		});

		request(originalRequest, function (error, response, body) {
			if (!body) return res.status(500);
			if (body.status === 'success') {
				return res.status(response.statusCode).json(body.data);
			}
			return res.status(response.statusCode).json(body);
		})
	})
}

exports.extractTokens = extractTokens;
exports.proxy = proxy;
exports.getNewToken = getNewToken;

