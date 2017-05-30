(function ($) {

	/**
	 * class S.Component < Backbone.View
	 * 
	 * 소리바다 UI Components
	 */
	S.Component = Backbone.View.extend({
		
		/**
		 * S.Component#dependencies -> array
		 * 
		 * 현재 컴포넌트가 필요로 하는 다른 컴포넌트들을 추가할 수 있습니다.
		 * superClass, children components들은 반드시 추가 되어야 합니다.
		 */
		dependencies: [],
		
		/**
		 * S.Component#libraries -> array | function
		 * 
		 * 외부 라이브러리를 불러올 때 배열에 url을 추가해주세요.
		 */
		libraries: [],

		/** 
		 * S.Component#requireFields -> array
		 * 
		 * 컴포넌트의 모델에 반드시 존재해야 하는 필드 리스트
		 * 만약 모델에 필드가 없다면 fetch를 진행합니다.
		 */
		requiredFields: [],

		/**
     * S.Component#cache -> boolean
     *
     * false 일 경우 app.history에 넣지 않고 파괴한다.
     * Default: true
     **/
		cache: true,
		
		/**
		 * S.Component#hasTemplate -> boolean
		 * 
		 * 컴포넌트가 템플릿을 가지고 있는지의 여부 표기할 수 있습니다.
		 * 만약 true면 템플릿을 자동으로 로드하여 template 프로퍼티를 만듭니다.
		 */
		hasTemplate: false,
		
		/**
		 * S.Component#onFetchError -> string
		 * 
		 * App.js에서는 모델 fetch에서 실패한 경우 NotFound 컴포넌트를 출력합니다.
		 */
		onFetchError: 'NotFound',

		/**
		 * S.Component#handleFetchError -> boolean
		 *
		 * 이 값을 true로 설정하면 페치 에러가 발생했을 경우 NotFound 컴포넌트를 랜더링 하는 대신 
		 * 해당 컴포넌트에서 에러를 핸들링 할 수 있게 됩니다. 
		 * fetch 실패했을 경우 컴포넌트에 fetchError를 트리거하므로 이벤트를 리슨해주세요.
		 * S.Component#_fetchModel 참고
		 */
		handleFetchError: false,
		
		/**
		 * S.Component#constructor(options) -> object
		 * - options (object): 컴포넌트 생성시 넘겨받은 객체
		 * 
		 * 컴포넌트 생성시 넘겨받은 객체는 this.options 프로퍼티에 할당합니다.
		 * 컴포넌트에 디폴트 options이 설정되어 있을 경우에는 전달받은 것이 덮어쓰게 됩니다.
		 * options object는 컴포넌트의 분기처리, 모델 페치를 할 때 기준으로 잡으시면 좋습니다.
		 */
		constructor: function (options) {
			S.slog('S.Component#constructor: ', this._name, options);
			
			options = options || {};
			
			if (this.options) {
				options = _.extend({}, S.Utils.value(this.options), options);
			}
			
			this.options = options;

			return Backbone.View.apply(this, arguments);
		},

		/**
		 * S.Component#initialize
		 */
		initialize: function (options) {
			S.slog('S.Component#initialize: ', this._name, options);
			
			if (options && options.extraClassName) {
        $(this.el).addClass(options.extraClassName);
      }

			this._eventHandlers = [];
			// 필요한 필드 등록하여 검사하는 절차
			this._addedRequiredFields = false;

			// S.Component 호출 전에 이미 모델을 생성했다면 바로 trigger
			if (this.model) {
				this._onModelCreated();
			}
		},

		/**
		 * S.Component#mixin(mixin, options) -> undefined
		 * - mixin (object): S.Mixins 객체
		 * - options (object): onMixin에 넘길 인자 값
		 * 
		 * usage: this.mixin(S.Mixins.trackFeatures, options);
		 * 미리 정의한 객체의 메서드를 컴포넌트의 프로퍼티로 복사해주는 녀석입니다.
		 * S.Mixins 객체는 core/mixins 디렉토리에 만들어주세요.
		 */
		mixin: function(mixin, options) {
			var self = this;

			if (!mixin) {
				throw new Error('Mixin not defined');
			}

			_.each(mixin, function(method, methodName) {
				if (!self[methodName]) {
					self[methodName] = method;
				} else {
					var originalCall = self[methodName];
					var newCall = method;
					// 이름이 똑같은 메서드가 정의되어 있으면 오리지널을 먼저 수행후, mixin 메서드를 수행합니다.
					self[methodName] = function() {
						originalCall.apply(this, arguments);
						newCall.apply(this, arguments);
					};
				}
			});

			if (mixin.className) {
				$(this.el).addClass(mixin.className);
			}

			if (mixin.onMixin) {
				mixin.onMixin.call(this, options || {});
			}
		},

		listen: function(object, eventName, eventHandler) {
			if (!object || !object.bind || !this._eventHandlers) {
				return;
			}

			this._eventHandlers.push([object, eventName, eventHandler]);
			object.bind(eventName, eventHandler, this);
		},

		stopListening: function(object, eventName, eventHandler) {
			var self = this;
			_.each(self._eventHandlers, function(handler, i) {
				if (object == handler[0]) {
					if (eventName && eventName == handler[1]) {
						if (eventHandler && eventHandler == handler[2]) {
							self._removeEventHandler(handler);
						} else if (!eventHandler) {
							self._removeEventHandler(handler);
						}
					} else if (!eventName) {
						self._removeEventHandler(handler);
					}
				}
			});
		},

		bubbleEvent: function(eventName, event) {
      var component = this;
      var args = _.toArray(arguments);

      if (_.isUndefined(event)) {
        event = $.Event();
        args[1] = event;
      }

      event.targetComponent = this;

      while (component && !event.isPropagationStopped()) {
        // So it's actually possible that triggering this event will cause
        // the destruction of the current component, so we need to check
        // to make sure it still exists on the next loop.
        event.currentComponent = component;
        component.trigger.apply(component, args);
        component = component.parent();
      }

      return !event.isDefaultPrevented();
    },
    
		_removeEventHandler: function(handler, i) {
			handler[0].unbind(handler[1], handler[2], this);
			delete this._eventHandlers[i];
		},
		
		ensureModel: function (k) {
			S.slog('S.Component#ensureModel: ', this._name);
			
			var self = this, hadMissingFields, shouldFetch;

			k = k || S.doNothing;

			if (this.model || !(this.modelClass || this.modelFactory)) {
				this._verifyModelType();
				if (this.model && this._addModelFields() && this._shouldFetch()) {
					this._fetchModel(k);
				} else {
					k();
				}
				return;
			}

			var modelClass = this.modelClass;
			var modelFactory = this.modelFactory;

			if (modelFactory) {
				this.model = modelFactory.call(this);
			} else if (modelClass && _.isFunction(modelClass)) {
				this.model = new modelClass();
			}

			this._verifyModelType();

			hadMissingFields = this._addModelFields();
			shouldFetch = this._shouldFetch();

			if (hadMissingFields && !shouldFetch) {
        console.warn('Warning: component had missing fields, but not fetching');
      }
			
			if (shouldFetch) {
				this._fetchModel(function () {
					self._onModelCreated();
					k();
				});	
			} else {
				this._onModelCreated();
				k();
			}
		},
		_shouldFetch: function () {
			var isShouldFetchDefined = !_.isUndefined(this.model.shouldFetch);
			var shouldFetch = S.Utils.value.call(this.model, this.model.shouldFetch);

			// If shouldFetch is defined, fetch if it evaluates to true.
      // If shouldFetch is not defined, only fetch if the model has a 'method' defined.
			return (isShouldFetchDefined && shouldFetch) || (!isShouldFetchDefined && this.model.method);
		},
		_onModelCreated: function () {
			if (_.isFunction(this.model.reference)) {
				this.model.reference();
			}
			this.onModelCreated();
		},

		/*
     * Adds requiredFields to the model if they have not yet been added.
     * Returns true if missing fields were added to the model.
     */
    _addModelFields: function() {
      if (this.requiredFields.length > 0 && !this._addedRequiredFields) {
        var hadMissingFields = _.difference(this.requiredFields, this.model.getAllFields()).length > 0;

        // todo, S.Models.ObjectModel#addFieldRefs
        this.model.addFieldRefs(this.requiredFields);
        this._addedRequiredFields = true;

        return hadMissingFields;
      }

      return false;
    },
		_fetchModel: function (k) {
			S.slog('S.Component#_fetchModel: ', this._name);
			
			var self = this;
			// model.fetch로 전달되는 객체는 Backbone.sync에서 options으로 받는다.
			self.pendingFetch = self.model.fetch({
				success: function (model, response) {
					self.pendingFetch = null;
					k();
				},
				error: function (model, response) {
					self.pendingFetch = null;
					self.trigger('fetchError', model, response);
					if (response && response.statusText) {
						console.error('Request failed ' + response.statusText);
					} else {
						console.error('Request failed');
					}
					if (self.handleFetchError) {
						k();
					}
				},
				silent: true
			});
		},
		isType: function (object, type) {
			return object instanceof type;
		},
		_verifyModelType: function () {
			var modelClass = this.modelClass;
			var model = this.model;
			if (modelClass && model) {
				if (_.isFunction(modelClass) && !this.isType(model, modelClass)) {
					throw new TypeError('Model is not correct type');
				}
			}

		},
		render: function (k, isSubtree) {
			S.slog("S.Component#render: ", this._name);
			if (this._willBeDestroyed) {
				return k ? k() : null;
			}

			if (this.ensureModel) {
				this.ensureModel(_.bind(this._readyToRender, this, k, isSubtree));
			} else {
				this._readyToRender(k, isSubtree);
			}
		},
		_cleanupAfterRenderingError: function (exc) {
			S.slog("Exception occurred when trying to render:  " + this._name, exc);
			
			this.renderLock = false;
		},
		_readyToRender: function (k, isSubtree) {
			
			var self = this;
			
			if (this._renderLock) {
				throw new Error("Render called while rendering");
			}

			this._renderLock = true;

			var templateExecuted;
			try {
				_.each(this.children, function (child) {
					child.destroy();
				});
				this.children = [];

				if (this.createChildComponents) {
					this.createChildComponents();
				}

				templateExecuted = this._executeTemplate();

			} catch (exc) {
				this._cleanupAfterRenderingError(exc);
				return;
			}
			
			templateExecuted.then(function () {
				try {
					return self._renderAllChildren();
				} catch (exc) {
					self._cleanupAfterRenderingError(exc);
					return $.Deferred().reject();
				}
			}).done(function () {
				if (self.onRendered) {
					self.onRendered();
					// self.onRendered(self.model);
				}

				if (k) {
					k();
				}

				try {
					self.trigger('render', self.model);
					
					if (!isSubtree) {
						if (self.isRendered() || self._inserted) {
							_.each(self.children, function (child) {
								child.insert();
							});
						} else if (!self.parent() || self.parent().isInserted()) {
							self.insert();
						}
					}
				} catch (exc) {
					self._cleanupAfterRenderingError(exc);
					return;
				}

				self._rendered = true;
				self._renderLock = false;
			});
			
		},
		_executeTemplate: function () {
			S.slog("S.Component#_executeTemplate: ", this._name);

			var templateExecuted = $.Deferred();

			if (!this.template) {
				templateExecuted.resolve();
				return templateExecuted;		
			}

			var model = this.model || new Backbone.Model();

			this.$el.html(this.template(model.toJSON()));
			templateExecuted.resolve();
			
			return templateExecuted;
		},
		_renderAllChildren: function() {
			S.slog("S.Component#_renderAllChildren: ", this._name);
			var self = this;
			return $.when.apply($, _.map(this.children, function(child) {
				var childRendered = $.Deferred();
				child.render(function() {
					self._insertChildEl(child);
					childRendered.resolve();
				}, true);
				return childRendered;
			}));
		},
		_insertChildEl: function (child) {
			S.slog("S.Component#_insertChildEl: ", this._name);
			var containerId = child.containerId;
			var el;
			if (containerId) {
				el = this.$("#" + containerId);
				if (el) {
					el.replaceWith(child.el);
				}
			}
		},
		addChildFromTemplate: function (containerId, child) {

			if (!child) {
				S.slog('child 컴포넌트가 없습니다.');
			}
			child.containerId = containerId;

			if (!_.contains(this.children, child)) {
				this.addChild(child);
			}
		},
		addChild: function (child) {
			child._parent = this;
			if (this.children) {
				this.children.push(child);
			} else {
				console.warn('없어진 컴포넌트에 자식을 추가했습니다.');
			}
			return child;
		},

		/**
		 * S.Component#renderNewChild(child, selector, k, options) -> S.Component
		 * - child (object): 자식으로 붙일 S.Component 인스턴스
		 * - selector (string | jQuery | element): 부모의 어느 엘리먼트에 붙일지 결정
		 *   false면 부모의 컴포넌트에 append함.
		 * - k (function): 랜더링 끝나고 실행시킬 함수
		 * - options (object): options.where에는 html, prepend 등을 정의할 수 있음.
		 * 
		 * show more 버튼이라던지, 인피닛 스크롤에 이용하면 좋은 함수.
		 */
		renderNewChild: function (child, selector, k, options) {
			if (!child) {
				throw new TypeError('차일드가 없어서 랜더할 수 없습니다.');
			}

			var self = this;
			k = k || S.doNothing;

			this.addChild(child);
			child.render(function () {
				var method = (options && options.where) ? options.where : 'append';
				var $el = self.$el;
				if (selector && selector !== self.$el) {
					$el = self.$(selector);
				}
				$el[method](child.el);
				self.trigger('childRender', child);
				k();
			});
			return child;
		},
		removeChild: function (child) {
			this.children = _.without(this.children, child);
			child._parent = null;
			return child;
		},
		parent: function () {
			return this._parent;
		},
		insert: function () {
			if (this._inserted) {
				return this;
			}
			this._inserted = true;

			_.each(this.children, function (child) {
				child.insert();
			});

			if (this.onInserted) {
				this.onInserted();
			}
			this.trigger('insert', this);
			return this;
		},
		detach: function () {
			if (!this._inserted) {
				return;
			}
			this._inserted = false;

			_.each(this.children, function (child) {
				child.detach();
			});
			if (this.onDetached) {
				this.onDetached();
			}
			this.trigger('detach', this);
			return this;
		},
		remove: function () {
			if (this._parent) {
				this.parent().removeChild(this);
			}
			Backbone.View.prototype.remove.apply(this, arguments);
			if (this.isInserted()) {
				this.onDetached();
			}
		},
		destroy: function (parentDying) {
			var self = this;
			if (!this._willBeDestroyed) {
				this._willBeDestroyed = true;
			}

			if (!parentDying) {
				this.detach();
				this.remove();
			}

			_.each(this.children, function (child) {
				child.destroy(true);
			});
			this.children = null;
			this._parent = null;
			this.trigger('destroy', this);

			_.defer(function () {
				if (self._destroyed) {
					return;
				}
				self._destroyed = true;

				_.each(self._eventHandlers, function (args) {
					args[0].unbind(args[1], args[2], self);
				});
				self._eventHandlers = null;

				self.onDestroyed();

				self.unbind();
				$(self.el).unbind();

				if (self.options) {
					self.options = null;
				}
				if (self.model) {
					if (self._addedRequiredFields) {
						// todo, S.Models.ObjectModel#removeFields
						self.model.removeFields(self.requiredFields);
					}
					if (_.isFunction(self.model.release)) {
						self.model.release();
					}
					self.model = null;
				}
				if (self.pendingFetch) {
					self.pendingFetch.abort();
					self.pendingFetch = null;
				}

				// Set destroyComplete to true after all the cleanup has cleared
				self._destroyComplete = true;
			});
		},
		isRendered: function () {
			return !!this._rendered;
		},
		isInserted: function() {
			return !!this._inserted;
		},
		isDestroyed: function () {
			return this._destroyed;
		},
		isDestroyComplete: function () {
			return this._destroyComplete;
		},
		/**
     * S.Component#findChild(filterFunc) -> S.Component
     * - filterFunc (Function): true를 반환하는 함수를 만들어 제공할 것. _.find 참고
     *
     * This finds the first child in the component's children list that passes
     * the test provided by `filterFunc`.
     *
     * Returns the found child component.
     **/
		findChild: function (filterFunc) {
			return _.find(this.children, filterFunc);
		},

    findChildWithModel: function(model) {
      return this.findChild(function(child) {
        return child.model === model;
      });
    },

    /**
     * S.Components#eachDescendant(f) -> undefined
     *
     * Call the argument function on each descendant component of this component
     * in the tree.
     **/
    eachDescendant: function(f) {
      var queue = _.clone(this.children);
      var child;

      while (!_.isEmpty(queue)) {
        child = queue.shift();

        if (_.isObject(child)) {
          f(child);
        }

        if (_.isArray(child.children)) {
          queue = queue.concat(child.children);
        }
      }
    },

    findAllChildren: function(filterFunc) {
      var found = [];
      this.eachDescendant(function(descendant) {
        if (filterFunc(descendant)) {
          found.push(descendant);
        }
      });
      return found;
    },
		
    invokeChildren: function(childClass, method) {
      var args = _.rest(arguments, 2);
      if (_.isString(childClass)) {
        childClass = S.Component.getObject(childClass);
      }
      var children = _.each(this.children, function(ch) {
        if (ch instanceof childClass) {
          // Rather than checking that the method exists, let this
          // call be noisy if it fails so we know invokeChildren was
          // used incorrectly.
          ch[method].apply(ch, args);
        }
      });
    },
		onModelCreated: S.doNothing,
		createChildComponents: S.doNothing,
		onRendered: S.doNothing,
		onInserted: S.doNothing,
		onDetached: S.doNothing,
		onDestroyed: S.doNothing
	},{
		create: function (fullName, properties) {
			
			var deps = properties.dependencies;
			var libs = properties.libraries;
			var path = fullName.split('.');
			var name = _.last(path);
			var hasTemplate = properties.hasTemplate;
			var className = path.join('_');

			properties = _.extend({
				_name: fullName,
				superClass: S.Component,
				template: hasTemplate ? _.template(S.Loader.get(fullName, name)) : null
			}, properties);

			var loadingExternalScripts = S.Loader.loadExternalScripts(libs);

			var loadingDeps = S.Loader.load(deps, function () {
				// 슈퍼클래스 처리
				var superClass = properties.superClass;
				if (_.isString(superClass)) {
					properties.superClass = S.Component.getObject(superClass);
					superClass = properties.superClass;
				}

				// 슈퍼클래스 순회
				var ctor = superClass;
				while (ctor !== S.Component) {
					className = ctor.prototype.className + ' ' + className;
					ctor = ctor.prototype.superClass;
				}
				
				properties.className = properties.className ? className + ' ' + properties.className : className;

				var namespace = S.Component.getObject(_.initial(path), true);
				
				// 컴포넌트 클래스 익스텐드
				var componentClass = superClass.extend(properties);

				if (namespace[name]) {
					_.extend(componentClass, namespace[name]);
				}
				namespace[name] = componentClass;
			}, false);

			$.when(loadingExternalScripts, loadingDeps).done(function () {
				S.Loader.loaded(fullName);
			});
		},
		getObject: function (path, createAsResolved) {
			var i, 
				sub,
				pointer = S.Components;

			if (_.isString(path)) {
				path = path.split('.'); 
			}

			for (i = 0; i < path.length; i++) {
				sub = path[i]; 
				if (createAsResolved && !pointer[sub]) { 
					pointer[sub] = {};
				}

				pointer = pointer[sub];
				if (!pointer) {
					return null;
				}
			}
			return pointer;
		},
		callSuper: function callSuper(self, method) {
			// 이걸 호출하는 시점은 객체 상태가 아니기 때문에 동일한 함수명을 써줌
			var args;

			if (arguments.length >= 3) {
				args = _.toArray(arguments).slice(2);
			} else {
				args = (callSuper.caller || arguments.callee.caller).arguments;
			}

			return this.prototype.superClass.prototype[method].apply(self, args);
		}

	});

})(S.$);

