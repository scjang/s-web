(function () {
	'use strict';

	const s3 = require('gulp-s3');
	const gulp = require('gulp');

	const AWS = {
	  'key':    process.env.AWS_ACCESS_KEY_ID,
	  'secret': process.env.AWS_SECRET_ACCESS_KEY,
	  'bucket': 'dev.example.com',
	  'region': 'eu-west-1'
	};
	 
	gulp.task('default', () => {
	  gulp.src('./dist/**').pipe(s3(AWS));
	});

})();