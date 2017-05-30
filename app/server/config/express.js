'use strict';

const express = require('express');
const favicon = require('serve-favicon');
const compression = require('compression');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const cookieParser = require('cookie-parser');
const errorHandler = require('errorhandler');
const path = require('path');
const config = require('./environment');
const passport = require('passport');
const fs = require('fs');

module.exports = function (app) {
  let env = app.get('env');

  app.set('views', config.root + '/app/server/views');
  app.engine('html', require('ejs').renderFile);
  app.set('view engine', 'html');
  // compress all responses
  app.use(compression());
  // extened를 true로 설정하지 않으면 몽구스의 nested 스키마에 저장이 되지 않음
  // app.use(bodyParser.urlencoded({ extended: true }));
  // app.use(bodyParser.json());
  // file size 제한
  app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
  app.use(bodyParser.json({limit: '50mb'}));
  
  app.use(methodOverride());
  app.use(cookieParser());
  app.use(passport.initialize());

  if ('production' === env) {
    app.use(favicon(path.join(config.root, '/dist/app/client/images/favicon', '/favicon.ico')));
    app.use(express.static(path.join(config.root, '/dist/app/client')));
    app.set('appPath', path.join(config.root, '/dist/app/client'));
    
    let dependencies = {
      css: 'libs/' + fs.readdirSync(path.join(app.get('appPath'), 'libs'))[0],
      libs: 'libs/' + fs.readdirSync(path.join(app.get('appPath'), 'libs'))[1],
      core: 'core/' + fs.readdirSync(path.join(app.get('appPath'), 'core')),
    };
    let loaderVersion = require(path.join(config.root, 'dist/app/components.json'));

    app.locals = {
      loaderVersion: loaderVersion,
      dependencies: [
        dependencies.libs,
        dependencies.core
      ],
      css: [
        dependencies.css
      ]
    };
  } else if ('development' === env || 'test' === env) {
    app.use(favicon(path.join(config.root, '/app/client/images/favicon', 'favicon.ico')));
    app.use(express.static(path.join(config.root, '/app/client')));
    app.set('appPath', path.join(config.root, '/app/client'));
    
    app.use(errorHandler()); // Error handler - has to be last
    
    app.locals = {
      loaderVersion: {},
      dependencies: [
        'libs/jquery.js',
        'libs/underscore.js',
        'libs/backbone.js',
        'libs/moment.min.js',
        'libs/js.cookie.js',
        'libs/bootstrap.min.js',
        'core/s_base.js',
        'core/component.js',
        'core/utils.js',
        'core/api.js',
        'core/logger.js',
        'core/app_init.js',
        'core/loader.js',
        'core/model.js',
        'core/services.js',
        'core/object_model.js',
        'core/collection_utils.js',
        'core/sparse_collection.js',
        'core/router.js',
        'core/services/storage.js',
        'models/user.js',
      ],
      css: [
        'libs/bootstrap.min.css'
      ]
    };
  }

  app.locals.serverInfo = {
    app_name: config.app_name,
    base_component: 'App.Grape',
    google_tracking_id: config.google.tracking_id,
    facebook_app_id: config.facebook.client_id,
    twitter_name: config.twitter.name,
    is_prod: (env === 'production') ? true : false,
    can_external: true,
    ssl: false
  };
};