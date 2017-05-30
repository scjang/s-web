'use strict';

const config = require('../config/environment');

module.exports = {
	createAccount: {
		url: config.api_server + '/account/create',
		method: 'POST'
	}
};
