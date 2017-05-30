(function () {

	if (typeof(S) === "undefined") {
		S = {};
	}

	_.extend(S, {
		/**
		 * S#rootPath() -> string
		 *
		 * 현재 도메인이 지정되어 있습니다.
		 */
		rootPath: function () {
			var url, array; 

			url = window.location.href;
			array = url.split('/');

			return array[0] + '//' + array[2];
		},

		/**
		 * S#doNothing() -> undefined
		 */
		doNothing: function () {},
		
		injectScript: function(src, root, onLoad, onError) {
			if (!src) {
				throw("Trying to inject an empty script into the page");
			}

			var headEl = document.getElementsByTagName("head")[0];
			var script = document.createElement('script');

			var basePath = src;
			if (src.indexOf('//') === -1) {
				basePath = this.rootPath() + src;
			}

			script.type = 'text/javascript';
			script.src = basePath;
			script.async = true;
			$(script).data('origsrc', src);

			if (onLoad) {
			// onreadystatechange for old versions of IE
				script.onload = script.onreadystatechange = function() {
					if (script.readyState &&
						script.readyState != 'complete' && script.readyState != 'loaded') {
						return;
					}
					script.onload = script.onreadystatechange = null;
					onLoad(src);
				};
			}
			// This doesn't work in IE and there's no way to make it work in IE, but
			// it will allow error handling for everybody else.
			if (onError) {
				script.onerror = onError;
			}

			if (root) {
				root.appendChild(script);
			} else {
				headEl.appendChild(script);
			}

			return script;
		},

		fbInit: function (callback) {
			var src;

			if ($('#fb-root').length === 0) {
				$('body').prepend('<div id="fb-root"></div>');
			}

			window.fbAsyncInit = function () {
				FB.init({
					appId: S.serverInfo.get('facebook_app_id'),
					status: true,
					cookie: true,
					xfbml: true,
					version: 'v2.4'
				});
				if (callback && typeof callback == 'function') {
					callback();
				}
			}

			src = '//connect.facebook.net/en_US/sdk.js';
			this.injectScript(src, $('#fb-root')[0]);
		},
		
		twtInit: function () {
			var src = '//platform.twitter.com/widgets.js';
			this.injectScript(src);
		},

		/**
 		 * S.Components
 		 *
 		 * S.Component.create 함수를 쓰면 이 네임스페이스에 클래스들이 모이게 됩니다.
 		 * 실제 객체를 생성하려면 new S.Components.App(); 식으로 사용해야 합니다.
 		 */
		Components: {},

		/**
		 * S.Models
		 *
		 * S.Models 클래스들을 담게될 네임스페이스 입니다.
		 */
		Models: {},
		
		/**
		 * S.Services
		 *
		 * S.Services 클래스들을 담게될 네임스페이스 입니다.
		 */
		Services: {},

		/**
		 * S.Mixins 
		 *
		 * S.Mixins 객체를 담을 네임스페이스 입니다.
		 */
		Mixins: {},

		/**
		 * S.$
		 *
		 * 백본 디펜던시로 사용한 제이쿼리로 정확한 레퍼런스입니다.
		 */
		$: Backbone.$
	});
})();