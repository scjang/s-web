(function () {
	'use strict';

	var gulp, paths, eslint, sass, sassLint, autoprefixer, postcss, watch;

	gulp = require('gulp');
	paths = gulp.paths;
	eslint = require('gulp-eslint');
	sass = require('gulp-sass');
	sassLint = require('gulp-sass-lint');
	autoprefixer = require('autoprefixer');
	postcss = require('gulp-postcss');
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
				.pipe(sassLint())
		    .pipe(sassLint.failOnError())
				.pipe(sass({outputStyle: 'compressed'}).on('error', sass.logError))
				.pipe(postcss([autoprefixer()]))
				.pipe(gulp.dest(paths.tmp.app));
		});
	});

	gulp.task('watch:html', function () {
		watch([paths.app + '/client/**/*.{html,css}'], function (event) {
			return gulp.src(event.path, {base: paths.app})
				.pipe(gulp.dest(paths.tmp.app));
		});
	});

	gulp.task('watch', ['watch:js', 'watch:scss', 'watch:html']);
})();