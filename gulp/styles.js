(function () {
	'use strict';

	var gulp, paths, $, sass;

	gulp = require('gulp');
	paths = gulp.paths;
	$ = require('gulp-load-plugins')();

	/**
	 * sass 파일을 css로 변경
	 * css 파일을 .tmp 디렉토리로 이동
	 * 그냥 일반 css 파일일 경우 그냥 .tmp로 이동
	 */
	gulp.task('styles', function () {
		return gulp.src([paths.app + '/**/*.scss'])
			.pipe($.sass({outputStyle: 'compressed'}).on('error', $.sass.logError))
			.pipe(gulp.dest(paths.tmp.app));
	});
})();