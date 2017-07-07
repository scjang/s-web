(function () {
  'use strict';

  var gulp, paths, eslint;

  gulp = require('gulp');
  paths = gulp.paths;
  eslint = require('gulp-eslint');

  gulp.task('eslint', function () {
    return gulp.src(paths.app + '/**/*.js')
      .pipe(eslint())
      .pipe(eslint.format())
      .pipe(eslint.failAfterError());
  });
})();