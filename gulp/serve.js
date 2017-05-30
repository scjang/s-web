(function () {
	'use strict';

	var gulp, paths, nodemon, browserSync, reload, runSequence, argv;

	gulp = require('gulp');

	paths = gulp.paths;

	nodemon = require('gulp-nodemon');

	browserSync = require('browser-sync').create();

	reload = browserSync.reload;

	runSequence = require('run-sequence');

	argv = require('yargs').argv;

	gulp.task('browser-sync', ['nodemon'], function() {
		var port = argv.production ? '9090' : '9000';
		
		return browserSync.init({
			proxy: 'http://localhost:' + port,
      port: 7000,
      ui: false,
      files: [paths.app + '/client/**/*.*']
		});
	});

	gulp.task('nodemon', function (k) {
		var NODE_ENV = argv.production ? 'production' : 'development';
		var started = false;

		return nodemon({
			script: './app/server/app.js',
			env: { 'NODE_ENV': NODE_ENV },
			debug: true,
			ignore: [
				'node_modules',
				'gulpfile.js'
			]
		}).on('start', function () {
			if (!started) {
				k();
				started = true;
			}
		}).on('restart', function () {
			setTimeout(function () {
				reload({ stream: false });
			}, 1500);
		});
	});

	/**
	 * This task uses the yargs module. 
	 * So, you can pass an arguments for running different mode of app.
	 * You have to excute build task before running production mode.
	 * 
	 * commands.  
	 * gulp serve: running development mode
	 * gulp serve --production: running production mode with dist directory
	 */
	gulp.task('serve', ['browser-sync'], function () {
		gulp.watch([
			paths.app + '/server/**/*.{html,js}',
		], function () {
			reload({ stream: false });	
		});
	});

	/* todo. .tmp 디렉토리 이용하는 것, 나중에 다시 */
	gulp.task('serve:dev', function () {
		runSequence(
			'watch',
			'browser-sync', 
			function () {
				gulp.watch([
					paths.app + '/server/**/*.js',
					paths.tmp.components + '/*.js',
					paths.tmp.core + '/*.js',
					paths.tmp.client + '/fonts/**/*',
					paths.tmp.client + '/images/**/*',
					paths.tmp.client + '/libs/**/*'
				], function () {
					reload({ stream: false });
				});
			}
		);
	});
})();  