'use strict';

var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;
var request = require('request');
var config = require('../../config/environment');

exports.setup = function (config) {

  passport.use(new FacebookStrategy({
      clientId: config.facebook.client_id,
      clientSecret: config.facebook.client_secret,
      clientUrl: config.facebook.client_url,
      profileFields: ['id', 'displayName', 'email']
    },
    function(accessToken, refreshToken, profile, done) {      
      
      var options = {
        url: config.api_server + '/users/create',
        form: {
          accessToken: accessToken,
          facebookId: profile._json.id,
          facebookName: profile._json.name,
          facebookEmail: profile._json.email
        }
      };
      
      console.log('>>>>>: ', accessToken, refreshToken, profile, done);

      request.post(options, function (err, httpResponse, body) {
        console.log('callback response: ', body);
        return done(err, body);
      });
    }
  ));
};