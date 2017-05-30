(function () {
	var mProto = Backbone.Model.prototype;

	S.Model = Backbone.Model.extend({
		idAttribute: '_id',
		/**
		 * S.Model#overrides -> Object
		 * 
     * This is a map of property names to functions or method names for
     * overriding properties passed to [[R.Model#get]]. The function will
     * be called when somebody calls `get` with the specified property.
     *
     * This is generally used to transform sub-objects into their correct
     * models.
		 *
		 * ##### Example
     *
     *      var MyModel = R.Model.extend({
     *        overrides: {
     *          'comment': 'comment',
     *          'tracks': R.Models.TrackCollection
     *        },
     *        comment: function() {
     *          return new R.Models.Comment(this.attributes.comment);
     *        }
     *      });
     *
     *      var model = new MyModel(someData);
     *      someData.get('comment'); // returns a comment model instance
		 */
		overrides: {},

		_refCount: 0,
		
		constructor: function (attrs, options) {
			var args = _.toArray(arguments);
			if (attrs instanceof Backbone.Model) {
				args[0] = attrs = attrs.attributes;
				console.warn('Backbone.Model no longer accepts another model as an argument - use attributes instead.');
			}
			return Backbone.Model.apply(this, args);
		},
		initialize: function (attrs, options) {
			var self = this;
			
			this.options = options || {};

			this.overrides = _.extend({}, this.overrides);
			
			// override는 method의 이름이 되고, prop은 get에 사용할 key가 된다.
			_.each(this.overrides, function (override, prop) {
				if (_.isString(override)) {
					self.overrides[prop] = {
						get: self[override]
					};
				} else if (_.isFunction(override)) {
					var privateProp = '__' + prop;
					var getter = function () {
						var instance, options;

						if (!self[privateProp]) {
							options = {
								parentModel: self,
								parentProperty: prop
							};

							if (override.factory) {
								// S.Model 상속 받은 녀석들
								instance = override.factory()(self.attributes[prop], options);
							} else {
								// overrides의 prop는 attributes의 prop와 동일해야한다.
								// 하지만 없다고 해서 동작하지 않는 것은 아니다.
								instance = new override(self.attributes[prop], options);
							}
							self[privateProp] = instance;
							// attributes에서는 property를 삭제한다.
							delete self.attributes[prop];
						}
						return self[privateProp];
					};
					var setter = function (newVal, options) {
						var prop = self[privateProp];
						if (prop) {
							if (newVal && newVal.models) {
								if (prop.constructor == newVal.constructor) {
									prop.reset(newVal.models, options);
								} else if (prop instanceof prop.constructor) {
									prop.reset(newVal.models, options);
								} else {
									console.error('Tried to reset ', prop, ' with ', newVal);
									throw new Error('Collection constructors do not match.');
								}
							} else {
								if (prop.reset) {
									// Collection
									prop.reset(newVal, options);
								} else if (prop.set) {
									// Model
									if (newVal) {
										prop.set(newVal, options);
									} else {
										prop.clear();
									}
								}
							}
						}
					};

					self.overrides[prop] = {
						get: getter,
						set: setter
					};
				} else {
					try {
						if (!_.isString(override) && !_.isFunction(override)) {
							throw new Error(typeof override);
						}	
					} catch (e) {
						S.slog(e.name + ': override\'s typeof ' + e.message);	
					}
				}
			});

			mProto.initialize.apply(this, arguments);
		},
		get: function (prop) {
			var override = this.overrides[prop];
			if (override) {
				return override.get.call(this, prop);
			}
			return mProto.get.call(this, prop);
		},
		set: function (prop, value, options) {
			var attrs = prop;

			if (_.isString(attrs)) {
				attrs = {};
				attrs[prop] = value;
			} else {
				options = value;
				// 모델에 set을 이용하여 다른 모델을 넘길 수 있다.
				// 만약 넘기면 의 attributes를 그대로 set할거다.
				// S.currentUser.set(model, options);
				if (attrs instanceof Backbone.Model) {
					attrs = attrs.attributes;
				}
			}

			for (prop in attrs) {
				if (_.has(attrs, prop)) {
					var attrValue = attrs[prop];
					var override = this.overrides[prop];

					// overrides property에 모델을 직접 지정한 경우
					if (override && override.set) {
						override.set.call(self, attrValue, options);
					// Checking for _.isUndefined since in Backbone v1 `unset` would set the field to undefined instead of null.
					} else if (self.attributes && self.attributes[prop] instanceof S.Models.ModelFieldCollection && !_.isNull(attrValue) && !_.isUndefined(attrValue)) {
            self.attributes[prop].reset(attrValue.models);
            self.attributes[prop].limit(attrValue.limit());
            delete attrs[prop];
          }
				}
			}

			return mProto.set.call(this, attrs, options);
		},
		unset: function (prop, options) {
			var shadow = '__' + prop;
			if (this[shadow]) {
				this[shadow] = null;
			}
			return mProto.unset.apply(this, arguments);
		},
		clear: function () {
			var self = this;
			_.each(this.overrides, function (value, prop) {
				var shadow = '__' + prop;
				if (self[shadow]) {
					self[shadow] = null;
				}
			});
			return mProto.clear.apply(this, arguments);
		},
		clone: function () {
			var newModel = Backbone.Model.prototype.clone.apply(this, arguments);

			// Clone private properties used by overrides.
      _.each(this, function(v, k) {
        if (this.hasOwnProperty(k) && k.indexOf('__') === 0) {
          newModel[k] = v;
        }
      }, this);

      return newModel;
		},
		reference: function () {
			this.onReferenced(++this._refCount);
			return this._refCount;
		},
		release: function () {
			if (this._refCount) {
				this._refCount--;
			} else {
				console.warn('Model released when the reference count is already 0.');
			}
			this.onReleased(this._refCount);
			return this._refCount;
		},
		onReferenced: S.doNothing,
		onReleased: S.doNothing
	}, {
		factory: function (c) {
			c = c || this;
			return function (data, options) {
				return new c(data, options);
			};
		}
	});
	
	/**
	 * Backbone.sync -> function
	 * - crudMethod (string): read, create, update, delete
	 * - model (object): crud를 요청한 모델 인스턴스
	 * - options (object): Backbone.Model.prototype.fetch에서 넘기는 options
	 *   options.success는 Backbone.Model에서 재정의 하여 넘겨준다.
	 *   Backbone의 fetch 과정에는 1. success 콜백을 실행시키고 2. model.trigger('sync', model, resp, options)를 한다.
	 *   만약 에러발생시 1. error 콜백 실행 2. model.trigger('error', model, resp, options)를 한다.
	 * 
	 * 서버사이드에 정의한 api method 이름을 활용하기 위해 재정의 함
	 * 호출 순서도 S.Component#_fetchModel -> Bakcbone.Model#fetch -> Backbone.sync -> S.Api.request
	 * restucture는 이 중 S.Api.request에서 해야한다.
	 */
	Backbone.sync = function (crudMethod, model, options) {
		if (!model.method) {
			S.slog("S.Component에서 fetch를 시도했으나 api method가 없습니다.");
			return;
		}

		// config는 content를 재설정 할 용도로 fetch함수의 인자로 넘길 수 있다.
		// eg. model.fetch({config: { ... }});
		var config = options.config || {};

		var content;
		// model.content는 function, object 등으로 쓸 수 있다.
		if (model.content) {
			if (_.isFunction(model.content)) {
				content = model.content.call(model, config);
			} else {
				content = model.content[crudMethod].call(model, config);
			}
		}
		
		content = _.isUndefined(content) ? {} : content;
		
		/**
		 * method는 object, function, string으로 작성 가능하다.
		 * eg. method: { create: 'createComment', update: 'updateComment', 'delete': 'deleteComment'}
		 * eg. method: function () { if (this._loadTopAlbums) { return 'getTopCharts'; }} 
		 * eg. method: 'getReleaseAlbums'
		 */
		var method = model.method;
		if (_.isObject(method) && !_.isFunction(method)) {
			method = model.method[crudMethod];
		}

		if (_.isFunction(method)) {
			method = method.call(model);
		}

		var ajaxConfig = _.extend({
			method: method,
			content: content,
			dataType : model.dataType
		}, options);

		ajaxConfig.success = function (response) {
			return options.success(response);
		};

		ajaxConfig.error = function (error) {
			if (options.error) {
				return options.error(error);
			}
		};

		return S.Api.request(ajaxConfig);
	};

	
	S.Models.CompositeModel = Backbone.Model.extend({
		
		initialize: function(attrs, options) {
			this._innerModelNames = options.innerModelNames;
		},

		shouldFetch: true,

		fetch: function(options) {
			var self = this;
			var outerSuccess = _.isFunction(options.success) ? options.success : S.doNothing;
			var outerError = _.isFunction(options.error) ? options.error : S.doNothing;
			// _.after는 하단의 _.each문에서 this._innerModelNames가 모두 처리된 뒤에 콜백이 실행됨
			var success = _.after(_.size(this._innerModelNames), function() {
				outerSuccess(self);
			});

			_.each(this._innerModelNames, function(modelAttr) {
				self.get(modelAttr).fetch({
					success: success,
					error: outerError
				});
			});
		},

		getInnerModels: function() {
			var innerModelNames = this._innerModelNames;
			return _.filter(this.attributes, function(value, attrName) {
				return _.include(innerModelNames, attrName);
			});
		}
	});

})();
