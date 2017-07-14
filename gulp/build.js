(function () {
	'use strict';

	var gulp, path, paths, RevAll, cssnano, runSequence, $, _;

	gulp = require('gulp');
	path = require('path');
	paths = gulp.paths;
	RevAll = require('gulp-rev-all');
	cssnano = require('cssnano');
	runSequence = require('run-sequence');
	_ = require('underscore');
	$ = require('gulp-load-plugins')();

	function getComponentInfo (file) {
		var filePath, dirs, initial, componentName, componentPath;

		filePath = file.path.split(file.base);
		dirs = filePath[1].split('/');
		initial = _.initial(dirs);
		componentName = initial.join('.');		
		componentPath = '/' + initial.join('/');

		return {
			name: componentName,	
			path: componentPath
		};
	}

	function transform (file, t) {
		var componentName, extension;

		componentName = getComponentInfo(file).name;
		extension = path.extname(file.path);

		if (extension === '.html') {
			file.contents = Buffer.concat([
				new Buffer('S.Loader.loadComponentHtml(\'' + componentName + '\', \''),
				new Buffer(file.contents.toString().replace(/'/g, "\\'")),
				new Buffer('\');')
			]);	
		} else if (extension === '.css') {
			file.contents = Buffer.concat([
				new Buffer('S.Loader.loadComponentCss(\'' + componentName + '\', \''),
				new Buffer(file.contents.toString().replace(/'/g, "\\'")),
				new Buffer('\');')
			]);
		} 

		return file;
	}

	gulp.task('htmlmin', function () {
		return gulp.src([paths.tmp.app + '/client/Components/**/*.html'], {base: './'})
			.pipe($.htmlmin({
				processScripts: ['text/template'],
				removeComments: true,
				// collapseInlineTagWhitespace: true,
				collapseWhitespace: true,
				conservativeCollapse: true,
				collapseBooleanAttributes: false,
				removeCommentsFromCDATA: false,
				removeOptionalTags: false
			}))
			.pipe(gulp.dest('./'));
	});

	gulp.task('cssmin', function () {
		var processors = [
			cssnano({zindex: false})
		];

    return gulp.src([paths.tmp.app + '/client/Components/**/*.css'], {base: './'})
        .pipe($.postcss(processors))
        .pipe(gulp.dest('./'));
	});

	gulp.task('transform', ['htmlmin', 'cssmin'], function () {
		return gulp.src([paths.tmp.components + '/**/*.{html,css}'])
			.pipe($.tap(transform))
			.pipe(gulp.dest(paths.tmp.components))
			.pipe($.debug({title: 'transform finished!'}));
	});

	gulp.task('concat:components', ['transform'], function () {
		return gulp.src([paths.tmp.components + '/**/*.js'])
			.pipe($.foreach(function (stream, file) {
				var component, filename;

				component = getComponentInfo(file);
				filename = component.name + '.js';

				return gulp.src([paths.tmp.components + component.path + '/*.{html,css,js}'])
					.pipe($.concat(filename))
					.pipe($.uglify({ output: { quote_style: 1 }}).on('error', $.util.log))
					.pipe(gulp.dest(paths.tmp.components));
			}))
			.pipe($.debug({title: 'concat:components'}));
	});

	gulp.task('concat:core', function () {
		return gulp.src([
				paths.tmp.app + '/client/core/s_base.js',
				paths.tmp.app + '/client/core/logger.js',
				paths.tmp.app + '/client/core/model.js',
				paths.tmp.app + '/client/core/**/*.js',
				paths.tmp.app + '/client/models/user.js',
				paths.tmp.app + '/client/models/**/*.js'
			])
			.pipe($.concat('s.min.js'))
			.pipe($.uglify({ output: { quote_style: 1 }}))
			.pipe(gulp.dest(paths.tmp.core))
			.pipe($.debug({title: 'concat:core finished!'}));
	});

	gulp.task('concat:libs', function () {
		return gulp.src([
				paths.tmp.libs + '/jquery.js',
				paths.tmp.libs + '/underscore.js',
				paths.tmp.libs + '/backbone.js',
				paths.tmp.libs + '/moment.min.js',
				paths.tmp.libs + '/**/*.js'
			])
			.pipe($.concat('libs.min.js'))
			.pipe($.uglify({ output: { quote_style: 1 }}))
			.pipe(gulp.dest(paths.tmp.libs))
			.pipe($.debug({title: 'concat:libs finished!'}));
	});

	gulp.task('concat:libsCss', function () {
		var processors = [ cssnano({zindex: false}) ];
		return gulp.src([
			paths.tmp.libs + '/**/*.css'
		])
		.pipe($.concat('bootstrap.min.css'))
		.pipe($.postcss(processors))
		.pipe(gulp.dest(paths.tmp.libs))
		.pipe($.debug({title: 'concat:libsCss finished!'}));
	});

	gulp.task('rev:components', function () {
		var revAll = new RevAll({
			fileNameVersion: 'version.json',
			fileNameManifest: 'components.json',
			annotator: function(contents, path) {
			    var fragments = [{'contents': contents}];
			    return fragments;
			},
			replacer: function(fragment, replaceRegExp, newReference, referencedFile) {
			     fragment.contents = fragment.contents;
			}
		});
		
		return gulp.src([paths.tmp.components + '/*'])
			.pipe($.debug({title: 'hashing: '}))
			.pipe(revAll.revision())
			.pipe(gulp.dest(paths.dist + '/app/client/Components'))
			.pipe(revAll.manifestFile())
			.pipe(gulp.dest(paths.dist + '/app'))
			.pipe($.debug({title: 'components.json file was created!'}))
			.pipe(revAll.versionFile())
			.pipe(gulp.dest(paths.dist + '/app'))
			.pipe($.debug({title: 'version.json file was created!'}));
	});

	gulp.task('rev:core', function () {
		var revAll = new RevAll({
			annotator: function(contents, path) {
			    var fragments = [{'contents': contents}];
			    return fragments;
			},
			replacer: function(fragment, replaceRegExp, newReference, referencedFile) {
			     fragment.contents = fragment.contents;
			}
		});

		return gulp.src([paths.tmp.client + '/{core,libs}/*.*'])
			.pipe(revAll.revision())
			.pipe(gulp.dest(paths.dist + '/app/client'))
			.pipe($.debug({title: 'rev:core was finished!'}));
	});

	gulp.task('finish', function () {
      console.log('==================== Build successful ====================');
      process.exit(0);
  });

	gulp.task('build', function () {		
		runSequence(
			'eslint',
			'clean:all',
			'eslint',
			'copy:client',
			'styles',
			['concat:components', 'concat:core', 'concat:libs', 'concat:libsCss'], 
			'clean:app', 
			['rev:components', 'rev:core', 'copy:server', 'copy:build'],
			'finish'
		);
	});
})();