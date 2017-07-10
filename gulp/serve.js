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

	gulp.task('nodemon', function (done) {
		var env = argv.production ? 'production' : 'development';
    var started = false;

		return nodemon({
			script: './app/server/app.js',
			env: { 'NODE_ENV': env },
			debug: true,
			ignore: [
        'app/client/**/*',
				'node_modules',
				'gulpfile.js'
			]
		}).on('start', function () {
      // waiting for running express server
      setTimeout(function () {
        if (!started) {
          started = true;
          done();  
        } else {
          reload();
        }
      }, 1500);  
    });
	});

  gulp.task('browser-sync', ['nodemon'], function() {
    var port = argv.production ? '9090' : '9000';
    
    return browserSync.init({
      proxy: 'http://localhost:' + port,
      // port: 7000,
      ui: false
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
    gulp.watch([paths.app + '/client/**/*.*'], function () {
      reload();
    });
	});

  gulp.task('default', ['serve']);
})();  