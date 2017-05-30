(function () {
  'use strict';

  var gulp = require('gulp');
  
  gulp.paths = {
    app: 'app',
    dist: 'dist',
    distProd: 'dist-prod',
    tmp: {
      root: '.tmp',
      app: '.tmp/app',
      client: '.tmp/app/client',
      components: '.tmp/app/client/Components',
      core: '.tmp/app/client/core',
      libs: '.tmp/app/client/libs'
    },
    spec: 'spec',
    specUt: 'spec/ut'
  };

  require('require-dir')('./gulp');
  
  gulp.task('default', function () {
    gulp.start('serve');
  });

})();