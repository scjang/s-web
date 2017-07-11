(function () {
	'use strict';

	var gulp, paths, eslint, sass, watch;

	gulp = require('gulp');
	paths = gulp.paths;
	eslint = require('gulp-eslint');
	sass = require('gulp-sass');
	watch = require('gulp-watch');

	gulp.task('watch:js', function () {
		watch([paths.app + '/client/**/*.js'], function (event) {
      return gulp.src(event.path, {base: paths.app})
      	.pipe(eslint())
      	.pipe(eslint.format())
				.pipe(gulp.dest(paths.tmp.app));
    });
	});

	gulp.task('watch:scss', function () {
		watch([paths.app + '/client/**/*.scss'], function (event) {
			return gulp.src(event.path, {base: paths.app})
				.pipe(sass({outputStyle: 'compressed'}).on('error', sass.logError))
				.pipe(gulp.dest(paths.tmp.app));
		});
	});

	gulp.task('watch:html', function () {
		watch([paths.app + '/client/**/*.{html, css}'], function (event) {
			return gulp.src(event.path, {base: paths.app})
				.pipe(gulp.dest(paths.tmp.app));
		});
	});

	gulp.task('watch', ['watch:js', 'watch:scss', 'watch:html']);
})();