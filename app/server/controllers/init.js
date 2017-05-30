'use strict';

const request = require('request');
const _ = require('lodash');
const config = require('../config/environment');
const auth = require('./auth');
const USER_AGENT = {
	twitter: ['Twitterbot/1.0'],
	facebook: [
		'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    'facebookexternalhit/1.1',
    'Facebot'
   ]
};

function isTwitter (userAgent) {
	return _.indexOf(USER_AGENT.twitter, userAgent) >= 0 ? true : false;
}

function isFacebook (userAgent) {
	return _.indexOf(USER_AGENT.facebook, userAgent) >= 0 ? true : false;
}

function getApiOptions (req, method) {
	let protocol = req.app.locals.serverInfo.ssl === true ? 'https' : 'http';
	let url = [protocol, '://', req.app.locals.host, '/api/do/', method].join(''); 

  return {
		url: url,
		method: 'POST',
		body: {
			method: method,
			encryptedTokens: req.cookies[config.app_name]
		},
		timeout: 5000,
		json: true
	};
}

function startApp (req, res, next) {
	let userAgent = req.get('User-Agent');

	if (isFacebook(userAgent) || isTwitter(userAgent)) {
		return next();
	}

	if (req.cookies && req.cookies[config.app_name] !== undefined) {
		let options = getApiOptions(req, 'getMe');

		request(options, function (err, response, body) {
			if (err) return console.log('err: ', err);
			req.app.locals.currentUser = body;
			return res.render('index', { env: req.app.locals });
		});
	} else {
		return res.render('index', { env: req.app.locals });
	}
}

function runPhantom (req, res) {
	let content = '';
  let url = 'http://' + req.headers.host + '/' + unescape(req.params[0]);
  let program = phantomjs.exec(__dirname + '/phantom_script.js', url);

  program.stdout.setEncoding('utf8');
  program.stdout.on('data', function (data) {
    content += data.toString();
  }); 
  program.on('exit', function (code) {
    if (code !== 0) {
      console.log('We have an error');    
    } else {
      res.send(content);
      console.log('================ phantom job finished =================');
    }
  });
}

exports.startApp = startApp;
exports.runPhantom = runPhantom;