(function ($) {
	var loadedHTMLs = {};
	var loadedCSSs = {};
	var currentlyLoadingScripts = {};
	var currentlyLoadingComponents = {};

	S.Loader = {
		pathBuilder: function (componentName) {
			var basePath = '/Components/',
				extraPath = componentName.split('.'),
				name = _.last(extraPath),
				path = [extraPath.join('/'), '/', name].join(''),
				src;
			
			// production 버전일 경우
			if (S.serverInfo.get('is_prod')) {
				src = {
					js: basePath + S.loaderVersion[componentName + '.js']
				};
			
				return src;
			}
			// development일 경우에 이 로직을 탐
			src = {
				js: basePath + path + '.js',
				css: basePath + path + '.css',
				html: basePath + path + '.html'
			};

			return src;
		},

		load: function (components, k, reload) {
			var self = this;
			
			k = k || S.doNoting;

			if (!components || !components.length) {
				k();
				// $.when에서 다음 상태로 넘어가게 하기 위해
				return $.Deferred().resolve();
			}

			components = S.Utils.array(components);

			var componentDeferreds = [];
			var deferred = $.when.apply($, _.map(components, function (component) {

				var pending = currentlyLoadingComponents[component];
				var loadedComponent = S.Component.getObject(component);
				var src = self.pathBuilder(component);
				var componentDeferred, scriptDeferred;

				if (_.isFunction(loadedComponent) && !reload) {
					componentDeferred = $.Deferred().resolve();
				} else if (pending) {
					componentDeferred = pending;
				} else {
					componentDeferred = self.queueLoad(component);
					
					if (!S.serverInfo.get('is_prod')) {
						// S.Loader.get 함수 때문에 이 시점 전에 html이 있어야 한다.
						var loadingHtml = self.loadHTML(src.html, component);
						var loadingCss = self.loadCSS(src.css, component);
						// development일 경우 이 로직을 타야함, production일 때는? 또 분기해야하나?
						// html, css 파일 없는 컴포넌트는 html, css 요청하지 않도록 걸러낼 수 없을까?
					} else {
						var loadingHtml = $.Deferred().resolve();
						var loadingCss = $.Deferred().resolve();
					}
					
					$.when(loadingHtml, loadingCss).always(function () {
						// 컴포넌트를 head에 추가한다.
						scriptDeferred = self._loadSource(src.js, component);
						scriptDeferred.fail(function () {
							componentDeferred.reject();
							self.trigger('failed', component);
						});
						scriptDeferred.done(function () {
							// 컴포넌트 로드가 완료되면 css를 추가한다.
							// self.loadCSS(src.css, component);
							self.commitCss(component);
						});	
					});
				}

				return componentDeferred;
				
			}));
			return deferred.done(k).promise();
		},
		queueLoad: function (component) {
			if (!currentlyLoadingComponents[component]) {
				var componentDeferred = $.Deferred();
				currentlyLoadingComponents[component] = componentDeferred;
			}
			return currentlyLoadingComponents[component];
		},
		loadExternalScripts: function(scripts, k) {
			var self = this;
			k = k || S.doNothing;

			if (!scripts || !scripts.length) {
				k();
				return $.Deferred().resolve();
			}

			var deferred = $.when.apply($, _.map(scripts, function(script) {
				var pending = currentlyLoadingScripts[script];

				if (!pending) {
					pending = self._loadSource(script, 'external');
				}
				return pending;
			}));

			return deferred.done(k).promise();
		},
		_loadSource: function (src, component) {
			var self = this;
			var deferred = $.Deferred();
			deferred.attempts = 1;
			currentlyLoadingScripts[src] = deferred;
			this.trigger('requested', src, component);
			deferred.done(function () {
				self.trigger('downloaded', src);
			});
			S.injectScript(src, null, this._successLoading, this._errorLoading);
			return deferred.promise();

		},
		_successLoading: function(src) {
			if (currentlyLoadingScripts) {
				var currentlyLoadingScript = currentlyLoadingScripts[src];
				if (currentlyLoadingScript) {
					currentlyLoadingScript.resolve();
					delete currentlyLoadingScripts[src];
				}
			}
		},
		_errorLoading: function(e) {
			var self = this;
			var $failedScript = $(e.target);
			var src = $failedScript.data('origsrc') || $failedScript.attr('src');
			// 실패했을 때 3번까지 시도
			var currentlyLoadingScript = currentlyLoadingScripts[src];
			if (!currentlyLoadingScript) {
				return;
			}
			var numTries = currentlyLoadingScript.attempts;
			if (numTries <= 3) {
				_.defer(function() {
					S.injectScript(src, null, self._successLoading, self._errorLoading);
					var currentlyLoadingScript = currentlyLoadingScripts[src];
					if (currentlyLoadingScript) {
						currentlyLoadingScript.attempts++;
					}
				}, 100);
			} else {
				var currentlyLoadingScript = currentlyLoadingScripts[src];
				if (currentlyLoadingScript) {
					currentlyLoadingScript.reject();
				}
			}
		},
		loadHTML: function (src, component) {
			var self = this;
			
			if(!loadedHTMLs[component]){ //로드된 html이 아니라면
		
				var deferred = $.get(src, function (html) {

					if (html.indexOf('</html>') === -1) {
						loadedHTMLs[component] = _.filter($(html), function (node) {
							return node.nodeType === 1;
						});

						if (!loadedHTMLs[component] || loadedHTMLs[component] === undefined || loadedHTMLs[component] === "" ){
							S.slog("Loader: " + component + ".html" +" 의 내용이 없거나 로드중 문제가 발생했습니다.");
						}
					} else {
						console.log(component + '의 html이 없습니다.');
					}

				}, 'html');
				return deferred;
			} else {
				return $.Deferred().resolve();
			}
			
		},

		loadComponentHtml: function (component, htmlText) {
			if (htmlText && !loadedHTMLs[component]) {
				loadedHTMLs[component] = $(htmlText);
			}
		},
		// production 환경에서 사용
		loadComponentCss: function (component, cssText) {
			if (cssText && !loadedCSSs[component]) {
				loadedCSSs[component] = cssText;
			}
		},
		// development 환경에서 사용
		loadCSS: function (src, component) {
			var self = this;

			if (!loadedCSSs[component]) {
				var deferred = $.get(src, function (cssText) {
					trimSpaceText = cssText.replace(/(^\s*)|(\s*$)/g, "");
					
					if (trimSpaceText !== "" && cssText && !loadedCSSs[component] && cssText.indexOf('</html>') === -1) {
						loadedCSSs[component] = cssText;
					} else {
						console.log(component + "의 css가 없습니다.");
					}

				});
				return deferred;
			} else {
				return $.Deferred().resolve();
			}
		},
		commitCss: function (component) {
			var cssText;
			
			if (!loadedCSSs[component]) {
				return;
			} else {
				cssText = loadedCSSs[component];
			}

			if (document.createStyleSheet) {
				return this._ieLoadCss(cssText);
			}

			var textNode;
			var id = _.uniqueId("component_css");
			var styleEl = this._createStyleEl(id);
			textNode = document.createTextNode(cssText);
			styleEl.appendChild(textNode);
		},
		_ieLoadCss: function (cssText) {
			var id = 'css_for_components';
			var styleEl = document.getElementById(id);

			if (!styleEl) {
				styleEl = this._createStyleEl(id);
			}

			styleEl.styleSheet.cssText += cssText;
			return id;
		},
		_createStyleEl: function (id) {
			var styleEl = document.createElement("style");
			styleEl.type = "text/css";
			styleEl.media = "screen";
			styleEl.id = id;
			document.getElementsByTagName("head")[0].appendChild(styleEl);
			return styleEl;
		},

		get : function(component, id) {
			var dom;
			
			if (loadedHTMLs[component]){
				dom = _.find(loadedHTMLs[component], function (loaderData) {
					return loaderData.id === id;
				});
			
				var domStr = $(dom).html();
				domStr = domStr.replace(/\'/g, "'");

				if (domStr) {
					return $.trim(domStr);
				} else {
					console.error("Loader: " + component + ".html에 " + id + "가없습니다.");
				}
			} else {
				console.error("Loader: " + component + ".html가 로드되지 않고 사용되었습니다.");
			}
		},

		loaded: function (component) {
			
			if (currentlyLoadingComponents) {
				var pending = currentlyLoadingComponents[component];
				delete currentlyLoadingComponents[component];
				if (pending) {
					pending.resolve();
				}
			}
		}
	};

	_.extend(S.Loader, Backbone.Events);

})(S.$);