(function () {
	'use strict';

	var gulp, paths, runSequence;

	gulp = require('gulp');
	paths = gulp.paths;
	runSequence = require('run-sequence');

	/* todo. .tmp 디렉토리 이용하는 것 나중에 다시*/
	gulp.task('watch', function () {
		gulp.watch([
			paths.app + '/client/**/*.{html,css,js}'
		], [
			// task
		]);
			// 1. watch를 하기 전에는 .tmp로 모두 이동시켜야만 한다?
			// 2. app 디렉토리의 파일이 변경된 경우 .tmp로 복사 & 압축
			// 3. .tmp 파일이 변경된 경우 browser-sync reload <- serve 태스크에서 실행
	});
})();