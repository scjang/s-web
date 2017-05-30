(function () {
	'use strict';

	var gulp, Server;

	gulp = require('gulp');
	Server = require('karma').Server;

	function runTests(singleRun, done) {
		new Server ({
			configFile: __dirname + '/../karma.conf.js',
	    singleRun: true,
	    files: [
	    	'app/client/libs/jquery.js',
	    	'app/client/libs/underscore.js',
	    	'app/client/libs/backbone.js',
	    	'app/client/libs/moment.min.js',
	    	'app/client/libs/*.js',
	    	'app/client/core/s_base.js',
	    	'app/client/core/component.js',
	    	'app/client/core/utils.js',
	    	'app/client/core/*.js',
	    	'app/client/models/*.js',
	    	'app/client/Components/**/*.js'
	    ]
		}, done).start();
	}


	gulp.task('test', function (done) {
		return runTests(true, done);
	});

	gulp.task('test:auto', function (done) {
		return runTests(false, done);
	});
})();