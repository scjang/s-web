(function () {
	'use strict';

	var gulp, paths;
	
	gulp = require('gulp');
	paths = gulp.paths;
	
	gulp.task('copy:client', function () {
		return gulp.src([paths.app + '/client/**/*.*'])
			.pipe(gulp.dest(paths.tmp.app + '/client'));
	});

	gulp.task('copy:server', function () {
		return gulp.src([paths.app + '/server/**/*.*'])
			.pipe(gulp.dest(paths.dist + '/app/server'));		
	});

	gulp.task('copy:images', function () {
		return gulp.src([paths.tmp.client + '/{fonts,images}/**/*'])
			.pipe(gulp.dest(paths.dist + '/app/client/'));
	});

	gulp.task('copy:etc', function () {
		return gulp.src([
				'./.gitlab-ci.yml',
				'./package.json',
				'./README.md'
			])
			.pipe(gulp.dest(paths.dist));
	});
	
	gulp.task('copy:build', ['copy:images', 'copy:etc'], function () {
		console.log('completed copy task for build!')
	});
})();