(function () {
  'use strict';

  var gulp, path, paths, del;
  
  gulp = require('gulp');
  path = require('path');
  paths = gulp.paths;
  del = require('del');

  gulp.task('clean:tmp', function (done) {
    return del([paths.tmp.app], done);
  });

  gulp.task('clean:all', function (done) {
    return del([
      paths.dist,
      paths.tmp.root
    ], done);
  });

  gulp.task('clean:app', function () {
    return del([
      path.join(paths.tmp.components, '/**/*.{html,css}'),
      path.join(paths.tmp.core, '/**/*.js'),
      path.join(paths.tmp.libs, '/**/*.{js,css}'),
      path.join(paths.tmp.client, '/models'),
      '!.tmp/app/client/core/s.min.js',
      '!.tmp/app/client/libs/libs.min.js',
      '!.tmp/app/client/libs/bootstrap.min.css'
    ]).then(function (paths) {
      console.log('Deleted files and folders:\n', paths.join('\n'));
    });
  })
})();