(function($,S){
	/**
	 * this.route(url, name, callback);
	 */
	S.Router = Backbone.Router.extend({
		routes: {
			'': 'home',
			'*other': 'defaultRoute'
		},

		home: function () {
			this.trigger('contentChanged', 'Home');
		},
		
		initialize: function () {
			var self = this;

			$('a').unbind('click');

			$(document).on('click', 'a', (function (e) {
				var t = $(this);
				var target = t.attr('target');
				if (target !== '_top' && target !== '_blank') {
					e.preventDefault();
					self.anchorClick(this, self);
				}
			}));

			// 페이스북 redirect_url에서 #_=_을 붙이는 버그 있음.
			this.removeHash();
		},

		anchorClick: function (e) {
			var routerUrl = $(e).attr('href');

			if (routerUrl) {
				if (routerUrl.indexOf(S.rootPath) !== -1) { //ie fix
					routerUrl = routerUrl.split(S.rootPath)[1];
				}
        this.navigate(routerUrl, true);
			}
		},

		navigate: function (fragment, triggerRoute) {
      var options = _.isObject(triggerRoute) ? triggerRoute : {
        trigger: triggerRoute
      };

			Backbone.Router.prototype.navigate.call(this, fragment, options);

			if (S.serverInfo.get('can_external') === true) {
				ga('send', 'pageview', fragment);
			}
		},

		defaultRoute: function () {
			this.trigger('contentChanged', 'NotFound');
		},

		routeNotFound: function (component) {
			component = component || 'NotFound';
			this.trigger('contentChanged', component);
		},
		
		removeHash: function () {
			if (window.location.hash && window.location.hash == '#_=_') {
        if (window.history && history.pushState) {
            window.history.pushState('', document.title, window.location.pathname);
        } else {
          // Prevent scrolling by storing the page's current scroll offset
          var scroll = {
              top: document.body.scrollTop,
              left: document.body.scrollLeft
          };
          window.location.hash = '';
          // Restore the scroll offset, should be flicker free
          document.body.scrollTop = scroll.top;
          document.body.scrollLeft = scroll.left;
        }
	    }
		}
	});

})(jQuery,window.S = window.S || {});