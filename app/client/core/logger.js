(function () {

/**
 * ConsoleController
 * S.slog() < console.log();
 * 
 * 디버깅을 위해 찍어놓은 console.log() 등은 
 * window.console 객체가 없는 하위브라우저에서 에러를 일으킴
 * 그래서 S.slog()를 사용
 * 
 * - 사용법
 * 브라우저 콘솔에 S.Config.setMode('development'); 입력후 새로고침하면
 * S.slog()를 찍어놓은 것들이 출력됨
 */
	S.Config = {
		init: function (options) {
			this.options = options || {};
			
			_.defaults(this.options, {
				appName: 'WebApp',
				mode: 'product'
			});

			var appMode = S.Utils.getCookie(this.options.appName);

			if (appMode) {
				this.options.mode = appMode;
			} else {
				this.options.mode = 'product';
			}
		},
		
		setMode: function (mode) {
			this.options.mode = mode;
			S.Utils.setCookie(this.options.appName, mode, 30);
		},
		
		getMode: function () {
			return this.options.mode;
		}
	};


	S.slog = S.doNothing;

	/**
	 * @description S 디버그 모드 설정
	 * @namespace
	 */
	S.con = {

		/**
		 * @description S가 최초 실행할 경우 자동실행
		 * 디버깅을 위해 찍어놓은 console.log() 등은
		 * window.console 객체가 없는 하위브라우저에서 에러를 일으킴
		 * 그래서 S.slog()를 사용
		 */
		init: function () {
			if (S.Config.getMode() === 'development') {
				S.slog = function () {
					if (typeof console == 'undefined') return;

					var args = [];

					args.push('[S ' + (new Date().toLocaleTimeString()) + ']');

					args = args.concat($.makeArray(arguments));

					var clog = console.log;

					if (typeof clog === 'function') { //ie9 fix
						clog.apply(console,args);
					} else {
						console.log(args);
					}
				};
			}

			this.consoleFallback();

			S.slog('------------------ ' + S.Config.getMode() + ' mode' + '------------------ ');
		},
		
		consoleFallback: function () {
			var method;
			var methods = [
				'assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error',
				'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log',
				'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd',
				'timeStamp', 'trace', 'warn'
			];
			var length = methods.length;
			var console = (window.console = window.console || {});

			while (length--) {
				method = methods[length];

				// Only stub undefined methods.
				if (!console[method]) {
					console[method] = S.doNothing;
				}
			}
		}
	};
})();
