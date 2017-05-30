(function () {
	var BaseService = function (options) {
		this.options = options || {};
		this._readyState = S.Services.STATE_NOT_READY;
		this.initialize();
		this.trigger('initialized');
	};

	BaseService.extend = Backbone.View.extend;

	_.extend(BaseService.prototype, Backbone.Events, {
		isGlobal: false, 
		initialize: function () {
			this.onInitialized();
		},
		onInitialized: S.doNothing,
		isReady: function () {
			return this._readyState == S.Services.STATE_READY;
		},
		onStarted: function (k) {
			k();
		},
		onStopping: S.doNothing,
		onStopped: S.doNothing,
		isUsable: function () {
			return true;
		},
		getCaps: S.doNothing,
		_setReadyState: function (newState) {
			if (this._readyState === newState) {
				return;
			}

			switch (newState) {
				case S.Services.STATE_READY:
					var self = this;
					var k = function () {
						self._readyState = newState;
						if (self.isReady()) {
							console.log('[Services] ' + self._name + ' is ready');
              self.trigger('ready');
              S.Services.trigger(self._name + ':ready');
						}
					};

					this.onStarted(k);
					break;
				case S.Services.STATE_STOPPED:
					this.onStopped();
					this._readyState = newState;
					break;
				case S.Services.STATE_STOPPING:
					this.onStopping();
					this._readyState = newState;
					break;
				default:
					console.error('Unable to handle new ready state: ', newState);
          break;
			}
		}
	});

	_.extend(S.Services, Backbone.Events, {
		_serviceKlasses: {},
		_activeServices: {},
		register: function (name, props, options) {
			var klass = BaseService.extend(props);
			
			options = options || {};
			_.defaults(options, {
				priority: this._serviceKlasses[name] ? this._serviceKlasses[name].length + 1 : 1,
				id: _.uniqueId()
			});

			klass.prototype._name = name;
			klass.prototype.__options = options;

			if (this._serviceKlasses[name] && this._serviceKlasses[name].length) {
				if (klass.prototype.isGlobal !== this._serviceKlasses[name][0].prototype.isGlobal) {
					throw new Error('[Services] all implementations of ' + name + ' must agree on isGlobal');
				}
				this._serviceKlasses[name].push(klass);
			} else {
				this._serviceKlasses[name] = [klass];
			}
		},
		unregister: function (name) {
			this.stop(name);
			delete this._serviceKlasses[name];
		},
		start: function (names, optionsMap) {
			optionsMap = optionsMap || {};
			names = names ? S.Utils.array(names) : _.keys(this._serviceKlasses);
			var servicesToStart = _.map(names, function (name) {
				if (this._activeServices[name]) {
					console.log('Service named ' + name + ' already started');
				} else {
					if (!this._serviceKlasses[name]) {
						console.log('No service named ', name);
						return;
					}

					this._createService(name, optionsMap[name]);
					return name;
				}
			}, this);

			var deferreds = [];
			_.each(servicesToStart, function (serviceName) {
				if (serviceName && this._activeServices[serviceName].isUsable()) {
					this._activeServices[serviceName]._setReadyState(this.STATE_READY);
					deferreds.push(this.ready(serviceName));
				}
			}, this);

			return $.when.apply($, deferreds);
		},
		stop: function (name) {
			var self = this;
			var servicesToStop = name ? [name] : _.keys(this._serviceKlasses);
			var servicesStopping = [];
			_.each(servicesToStop, function (name) {
				if (self._activeServices[name] && self._activeServices[name].isReady()) {
					self._activeServices[name]._setReadyState(self.STATE_STOPPING);
					servicesStopping.push(name);
				}
			});
			_.each(servicesStopping, function (name) {
				self._activeServices[name]._setReadyState(self.STATE_STOPPED);
			});
			_.each(servicesToStop, function (name) {
				self._deleteReferences(name);
			});
		},
		isReady: function (name) {
			return this._activeServices[name] && this._activeServices[name].isReady();
		},
		ready: function (name, k) {
			var deferred = $.Deferred();
			if (this.isReady(name)) {
				deferred.resolve();
			} else {
				this.once(name + ':ready', function () {
					deferred.resolve();
				});
			}
			return deferred.done(k || S.doNothing).promise();
		},
		getCaps: function () {
			var self = this;
			function combine (a, b) {
				_.each(b, function (v, k) {
					if (k in a) {
						if (_.isObject(v) && _.isObject(a[k])) {
							combine(a[k], v);
						} else {
							throw new Error('[Services] getCaps collision on ' + k + ' combining ' + v + ' and ' + a[k]);
						}
					} else {
						a[k] = v;
					}
				});
			}

			var caps = {};
			_.each(this._serviceKlasses, function (klass, name) {
				var serviceCaps = self._activeServices[name].getCaps();
				if (serviceCaps) {
					combine(caps, serviceCaps);
				}
			});

			return caps;
		},
		_createService: function (name, options) {
			var klasses = _.sortBy(this._serviceKlasses[name], function (k) {
				return S.Utils.value(k.prototype.__options.priority);
			});

			var impl = null;

			for (var i = 0; i < klasses.length; i++) {
				impl = new klasses[i](options);

				if (impl.isUsable()) {
					break;
				}
			}

			if (impl === null) {
				console.error('Unable to find a usable implementation for service: ' + name);
				return;
			}

			var self = this;
			impl.on('remove', function () {
				console.log('[Services] A service implementation of type ' + name + ' failed and asked to be removed, doing so now');
        self._serviceKlasses[name] = _.reject(self._serviceKlasses[name], function(klass) {
          return klass.prototype.__options.id == impl.__options.id;
        });
        self.stop(name);
        self.start(name);
			});

			this._activeServices[name] = impl;
			if (impl.isGlobal) {
				var globalName = S.Utils.lowerCaseInitial(name);
				if (globalName in S) {
					console.error('[Services] global slot should be empty for ' + globalName);
				}
				S[globalName] = impl;
			} else {
				if (name in this) {
					console.error('[Services] local slot should be empty for ' + name);
				}
				this[name] = impl;
			}
		},
		_deleteReferences: function (name) {
			if (this._activeServices[name]) {
				if (this._activeServices[name].isGlobal) {
					delete S[S.Utils.lowerCaseInitial(name)];
				} else {
					delete this[name];
				}
				delete this._activeServices[name];
			}
		}
	}, {
		STATE_NOT_READY: 0,
		STATE_READY: 1,
		STATE_STOPPED: 2, 
		STATE_STOPPING: 3
	});

	S.getEventProxy('S.Services', function (eventProxy) {
		eventProxy.trigger('ready');
	});
}).call(this);