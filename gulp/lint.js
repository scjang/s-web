(function () {
  'use strict';

  var gulp, paths, eslint;

  gulp = require('gulp');
  paths = gulp.paths;
  eslint = require('gulp-eslint');

  gulp.task('eslint', function () {
    var target = [
      paths.app + '/**/*.js', 
      '!'+paths.app+'/client/libs/**/*.js',
      '!'+paths.app+'/server/views/include/**/*.js'
    ];

    return gulp.src(target)
      .pipe(eslint())
      .pipe(eslint.format())
      .pipe(eslint.failAfterError());
  });
})();