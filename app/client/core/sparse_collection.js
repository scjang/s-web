(function () {
  var wrapError = function(onError, model, options) {
    // S.slog('infinite: S.Models.SparseCollection#wrapError', onError, model, options);
    return function(resp) {
      model.loading--;
      if (onError) {
        onError(model, resp, options);
      } else {
        model.trigger('error', model, resp, options);
      }
    };
  };

  /*
   * Range functions:
   * For these, a range is an object with start & end Number properties.
   */
  var overlaps = function(r1, r2) {
    return (r1.start >= r2.start && r1.start <= r2.end) ||
      (r2.start >= r1.start && r2.start <= r1.end);
  };
  var contains = function(r1, r2) {
    return r1.start <= r2.start && r1.end >= r2.end;
  };

  function getItems(data) {
    if (!data) { return []; }
    if (_.isArray(data)) {
      return data;
    } else if (data.models) {
      return data.models;
    } else if (data.apps) {
      return data.apps;
    } else {
      return data.items;
    }
  }

  /**
   * class S.Models.SparseCollection
   *
   * Data storage class that fetches more data from the server.
   * Used by the [[S.Components.InfiniteScroll]] component.
   * 서버로부터 더 많은 데이터를 받아오는 데이터 스토리지 클래스
   * S.Components.InfiniteScroll 컴포넌트에서 사용
   **/

  /**
   * new S.Models.SparseCollection(models[, options])
   * - models (Array): default models
   * - options (Object): options
   *
   * Available options:
   *
   *    - fetch (`Boolean`): Default true, if false don't ever try to fetch more objects.
   *    - model: Class to use (can also be changed by subtypes with the `model` class property).
   *    - limit (`Number`): Don't fetch past N items in the list.
   **/
  S.Models.SparseCollection = function(models, options) {
    // S.slog('infinite: S.Models.SparseCollection#constructor');

    this.options = options || {};
    _.defaults(this.options, {
      fetch: true,
      limit: null
    });

    this.limit(this.options.limit);
    if (this.options.model) {
      this.model = this.options.model;
    }

    this.reset(models, { silent: true });

    this._pendingFetches = [];

    this.loading = 0;

    this.initialize.apply(this, arguments);
  };

  _.extend(S.Models.SparseCollection, {
    extend: Backbone.Collection.extend,
    factory: function(c) {
      c = c || this;

      return function(data, options) {
        // S.slog('infinite: S.Models.SparseCollection#factory', data, options);
        var limit = data ? data.total : null;
        var items = getItems(data);
        options = _.extend({
          limit: limit
        }, options);
        return new c(items, options);
      };
    }
  });

  _.extend(S.Models.SparseCollection.prototype, S.CollectionUtils, Backbone.Events, {
    toJSON: S.doNothing,
    /**
     * S.Models.SparseCollection#length() -> Number
     *
     * Returns the number of model in the collection.
     **/
    length: function() {
      if (!this.models) {
        return 0;
      }
      return this.models.length;
    },

    initialize: function() {
      // S.slog('infinite: S.Models.SparseCollection#initialize');

      _.bindAll(this, 'length');
    },

    /**
     * S.Models.SparseCollection#reviver -> Function
     *
     * Specify a custom reviver for JSON.parse
     **/
    reviver: null,

    // Get the model at the given index.
    at: function(index) {
      // S.slog('infinite: S.Models.SparseCollection#at');

      return this.get({ start: index, count: 1 })[0];
    },

    _markSparseAborted: function(range) {
      // S.slog('infinite: S.Models.SparseCollection#_markSparseAborted');

      for (var i = range.start; i < (range.start + range.count); i++) {
        if (this.models[i]) {
          this.models[i]._sparseAborted = true;
        }
      }
    },

    _createNewModelAt: function(i) {
      // S.slog('infinite: S.Models.SparseCollection#_createNewModelAt', i);

      var model;

      if (this.model) {
        model = new this.model();
      } else {
        model = new S.Model();
      }

      // set replace to true to replace the null placeholder
      this.add(model, { at: i, replace: true });
      return model;
    },

    _prepareFetchParams: function(options) {
      // S.slog('infinite: S.Models.SparseCollection#_prepareFetchParams', options);

      var result = [];
      var fetchStart = options.start;
      var fetchEnd = (options.start + options.count - 1);
      var needsFetch = false;
      var model;
      var i;

      function shouldFetch(i) {
        if (!needsFetch) {
          fetchStart = i;
        } else {
          fetchEnd = i;
        }
        needsFetch = true;
      }

      this._chainManipulating(function() {
        if (!this.appendOnly) {
          for (i = options.start; i < options.start + options.count; i++) {
            model = this.models[i];
            if (!model) {
              model = this._createNewModelAt(i);
              shouldFetch(i);
            } else if (model._sparseAborted) { // if this was aborted, need to re-fetch
              model._sparseAborted = false;
              shouldFetch(i);
            }
            result.push(model);
          }
        } else {
          fetchStart = this.length();
          needsFetch = true;
        }
      });

      return {
        result: result,
        needsFetch: needsFetch,
        fetchStart: fetchStart,
        fetchEnd: fetchEnd
      };
    },

    _filterPendingFetches: function(options, fetchStart, fetchEnd) {
      // S.slog('infinite: S.Models.SparseCollection#_filterPendingFetches');

      var needsFetch = true;
      var getRange = { start: options.start, end: options.start + options.count - 1 };

      this._pendingFetches = _.filter(this._pendingFetches, function(xhr) {
        if (!xhr) {
          return false;
        }

        if (!needsFetch) {
          return true;
        }

        // Don't mess with fetches that came from calling fetch directly, only
        // ones that were started by get.
        if (!xhr._startedByGet) {
          return true;
        }

        var range = xhr._sparseRange;
        if (!range) {
          return true;
        }

        var newFetchRange = { start: fetchStart, end: fetchEnd };
        var pendingRange = { start: range.start, end: range.start + range.count - 1 };

        var shouldKeepPending = true;

        // If this request does not overlap the current get, we kill it so this
        // fetch comes in faster.
        if (!overlaps(pendingRange, getRange)) {
          this._markSparseAborted(range);
          xhr.abort();
          shouldKeepPending = false;
        } else if (contains(pendingRange, newFetchRange)) {
          // If the new range is inside this range, kill the new fetch
          this._markSparseAborted({ start: fetchStart, count: fetchEnd - fetchStart + 1 });
          needsFetch = false;
        } else if (contains(newFetchRange, pendingRange)) {
          // If this range is inside the new range, kill this fetch
          this._markSparseAborted(range);
          xhr.abort();
          shouldKeepPending = false;
        } else if (pendingRange.start <= newFetchRange.start &&
            newFetchRange.start < pendingRange.end) {
          // If this range overlaps the new range on the low end, bump up the new
          // range start to be after this range's end
          this._markSparseAborted({ start: fetchStart, count: pendingRange.end - fetchStart });
          fetchStart = pendingRange.end + 1;
          // If the new range is now empty, kill it
          needsFetch = fetchStart < fetchEnd;
        } else if (newFetchRange.start <= pendingRange.start &&
            newFetchRange.end > pendingRange.start) {
          // If this range overlaps the new range on the high end, bump down the new
          // range end to be less than this range's start
          fetchEnd = Math.max(0, pendingRange.end - 1);
          // If the new range is now empty, kill it
          needsFetch = fetchStart < fetchEnd;
        }

        return shouldKeepPending;
      }, this);

      return {
        needsFetch: needsFetch,
        fetchStart: fetchStart,
        fetchEnd: fetchEnd
      };
    },

    _get: function(options) {
      // S.slog('infinite: S.Models.SparseCollection#_get', options);

      var fetchParams = this._prepareFetchParams(options);
      var result = fetchParams.result;
      var needsFetch = fetchParams.needsFetch;
      var fetchStart = fetchParams.fetchStart;
      var fetchEnd = fetchParams.fetchEnd;
      var filterResult;
      var request;

      if (needsFetch) {
        filterResult = this._filterPendingFetches(options, fetchStart, fetchEnd);
        needsFetch = filterResult.needsFetch;
        fetchStart = filterResult.fetchStart;
        fetchEnd = filterResult.fetchEnd;

        if (needsFetch) {
          if (this.appendOnly) {
            request = this.fetch({
              config: options.config,
              at: fetchStart,
              success: options.success,
              error: options.error
            });
          } else {
            request = this._chunkFetch({
              start: fetchStart,
              count: (fetchEnd - fetchStart + 1),
              chunk: options.chunk,
              at: fetchStart,
              config: options.config
            }, options.success, options.error);
          }

          if (request) {
            request._startedByGet = true;
          }
        }
      }

      return result;
    },

    /**
     * S.Models.SparseCollection#get(options) -> Array
     * - options (Object): Options for this get request
     *
     * Available options:
     *
     *    - start (`Number`): Index to start from (required if this SparseCollection is not appendOnly)
     *    - count (`Number`): Number of items to return (required if this SparseCollection is not appendOnly)
     *    - success (Function): Callback to call on success.
     *    - error (Function): Callback to call on error.
     *
     * This returns an Array that are the models requested. If they are already fetched, then it is done. If they aren't,
     * a fetch occurs to fill in the missing models. However, the model instances that are returned from this method are
     * the reused when the fetch is complete.
     *
     * If this is an append-only collection, then if you provide start/count it will return those models (assuming they
     * have been loaded). Otherwise, it loads the next chunk of data.
     **/
    get: function(options) {
      // S.slog('infinite: S.Models.SparseCollection#get', options);

      if (!this.options.fetch) {
        return [];
      }

      // Prevent fetching from negative indexes
      options = S.Utils.checkPagingIndex(options);

      // Prevent fetching 0 items
      if (options.count < 1) {
        return [];
      }

      if (this.appendOnly) {
        // hasFetchedToEnd is necessary for appendOnly sparse collections (e.g. RecentActivityPageModel)
        if (this.hasFetchedToEnd()) {
          return [];
        }
        if (options.start && options.count) {
          return this.models.slice(options.start, options.start + options.count);
        }
      } else if (!_.isNull(this._limit)) {
        if (options.start >= this._limit) {
          return [];
        }

        if (options.start + options.count > this._limit) {
          options.count = this._limit - options.start;
        }
      }

      return this._get(options);

    },

    /*
     * Returns an object O where O[i] = true if the model at i has already been
     * fetched or is currently being fetched.
     */
    _getModelsExistRange: function() {
      // S.slog('infinite: S.Models.SparseCollection#_getModelsExistRange');

      var modelsExistRange = _.reduce(this._pendingFetches, function(rangeObj, xhr) {
        if (xhr._sparseRange) {
          for (var i = xhr._sparseRange.start; i < xhr._sparseRange.start + xhr._sparseRange.count; i++) {
            rangeObj[i] = true;
          }
        }
        return rangeObj;
      }, {});

      _.each(this.models, function(model, i) {
        if (_.size(model.attributes)) {
          modelsExistRange[i] = true;
        }
      });

      return modelsExistRange;
    },

    _chunkFetch: function(config, success, error) {
      // S.slog('infinite: S.Models.SparseCollection#_chunkFetch', config, success, error);

      var self = this;
      var limit = this.limit();
      var fetchStart;
      var fetchEnd;
      var existingRange;
      var request;
      var nextStart;
      var nextCount;
      var nextChunk;

      if (!_.isNumber(config.chunk)) {
        request = this.fetch({
          config: config,
          at: config.at,
          success: success,
          error: error
        });
      } else if (config.chunk >= config.count) {
        // Stretch the range
        fetchStart = config.start;
        fetchEnd = config.start + config.count - 1;

        existingRange = this._getModelsExistRange();

        this._chainManipulating(function() {
          // If there's a limit, increase the fetch end index until any of these
          // are true:
          //  - it's equal to limit
          //  - the model at that index is already fetched/being fetched
          //  - size of the range has been increased to 'chunk'
          while ((limit && fetchEnd < (limit - 1)) &&
            !existingRange[fetchEnd + 1] &&
            (fetchEnd - fetchStart + 1) < config.chunk
          ) {
            fetchEnd += 1;
            if (!this.models[fetchEnd]) {
              this._createNewModelAt(fetchEnd);
            }
          }

          // Decrease the fetch start index until any of these:
          //  - it's 0
          //  - the model at that index is already fetched/being fetched
          //  - size of the range has been increased to 'chunk'
          while (fetchStart > 0 &&
            !existingRange[fetchStart - 1] &&
            (fetchEnd - fetchStart + 1) < config.chunk) {
            fetchStart -= 1;
            if (!this.models[fetchStart]) {
              this._createNewModelAt(fetchStart);
            }
          }
        });

        config.start = fetchStart;
        config.count = fetchEnd - fetchStart + 1;

        request = this.fetch({
          config: config,
          at: config.start,
          success: success,
          error: error
        });
      } else {
        // Split into several requests
        nextStart = config.start + config.chunk;
        nextCount = config.count - config.chunk;
        nextChunk = config.chunk;
        config.count = config.chunk;

        this._markSparseAborted({ start: nextStart, count: nextCount });

        request = this.fetch({
          config: config,
          at: config.start,
          success: function() {
            self.get({
              start: nextStart,
              count: nextCount,
              chunk: nextChunk,
              success: success,
              error: error
            });
          },
          error: error
        });
      }

      if (request) {
        request._sparseRange = {
          start: config.start,
          count: config.count
        };
      }

      return request;
    },

    hasFetchedToEnd: S.doNothing,

    fetch: function(options) {
      // S.slog('infinite: S.Models.SparseCollection#fetch', options);

      options = options || {};
      var self = this;
      var success = options.success;
      var error = options.error;
      var request;

      options.config = _.omit(options.config, 'at', 'chunk');
      options.success = function(resp, status, xhr) {
        self._pendingFetches = _.without(self._pendingFetches, request);

        var newModels = self.set(self.parse(resp), options);
        self.trigger('loaded', resp, newModels);
        self.loading--;
        if (success) {
          success(self, resp, newModels);
        }
      };
      options.error = wrapError(error, this, options);
      request = Backbone.sync.call(this, 'read', this, options);
      if (request) {
        this._pendingFetches.push(request);
        this.trigger('load');
        this.loading++;
      }
      return request;
    },

    /**
     * S.Models.SparseCollection#parse(data) -> Object
     * - data (Object): data to be parsed
     *
     * By default returns data, override if any special response parsing needs to occur.
     **/
    parse: function(data) {
      // S.slog('infinite: S.Models.SparseCollection#parse', data);

      if (data && _.isNumber(data.total)) {
        this.limit(data.total);
      }
      return getItems(data);
    },

    set: function(models, options) {
      // S.slog('infinite: S.Models.SparseCollection#set');

      var i, model, newModel, resultModels = [];
      options = _.extend({
        at: 0
      }, options);
      models = S.Utils.array(models);

      this._chainManipulating(function() {
        for (i = 0; i < models.length; i++) {
          model = this.models[options.at + i];
          if (!model) {
            newModel = this.prepModel(models[i]);
            this.add(newModel, _.extend({}, options, { at: options.at + i, replace: true }));
          } else {
            newModel = this.prepModel(models[i]);

            if (newModel.constructor == model.constructor && !(newModel instanceof S.Models.SparseCollection)) {
              model.set(models[i]);
            } else {
              this.remove(model, { at: options.at + i });
              this.add(newModel, { at: options.at + i });
              this.trigger('swapped', {
                oldModel: model,
                newModel: newModel,
                at: options.at + i
              });
            }
          }
          resultModels.push(newModel);
        }

        /* check to make sure we got back as many models as we asked for and clean up any 'dead' models */
        if (options.config && options.config.count && models.length < options.config.count) {
          console.log('[SparseCollection] got a partial result, EOF');
          var newLength = options.at + models.length;
          while (this.size() > newLength) {
            if (this.models[newLength] && _.isEmpty(this.models[newLength].attributes)) {
              this.remove(this.models[newLength], { at: newLength });
            } else {
              //not expected, but included to prevent an infinite loop
              ++newLength;
            }
          }
          this.limit(options.at + models.length);
          this.models.splice(options.at + models.length, this.models.length);
        }
      });

      return resultModels;
    },

    /**
     * S.Models.SparseCollection#reset(models[, options]) -> undefined
     * - models (Array): An array of models or attributes representing models
     *   to set the initial contents of the sparse collection to.
     * - options (Object): options.
     *
     * **Available options:**
     *  - silent (boolean): true if you don't want the 'reset' event to fire.
     *  - at (Number): Where to place the initial models at. Defaults to 0.
     **/
    reset: function(models, opts) {
      // S.slog('infinite: S.Models.SparseCollection#reset');

      // opts instead of options to distinguish from `this.options`
      opts = _.extend({
        at: 0,
        silent: false
      }, opts);

      // Don't lose meta
      if (models && models.meta) {
        this.meta = models.meta;
      }

      // We can also reset with an API formatted list, this extracts the models
      // from the envelope, or just passes the models along if its a regular
      // array.
      models = getItems(models);

      _.each(this._pendingFetches, function(xhr) {
        if (xhr) {
          xhr.abort();
        }
      });
      this._pendingFetches = [];

      this.models = [];
      if (models) {
        this.add(models, { at: opts.at, silent: true });
      }

      if (!this.options.fetch) {
        this._limit = this.models.length;
      }

      if (!opts.silent) {
        this.trigger('reset');
      }
      return true;
    },

    /**
     * S.Models.SparseCollection#limit([limit][, options]) -> Number
     * - limit (Number): If provided, sets the limit of the collection.
     * - options (Object): options.
     *
     * **Available options:**
     *  - silent (boolean): true if you don't want the 'limit' event to fire.
     *
     * Returns the maximum number of elements in this collection.
     **/
    limit: function(limit, opts) {
      // S.slog('infinite: S.Models.SparseCollection#limit', limit, opts);

      if (!_.isUndefined(limit) && limit !== this._limit) {
        this._limit = limit;

        // Remove potentially lingering placeholder models
        if (!_.isNull(limit) && limit < this.length()) {
          var extraModels = this.length() - limit;
          var start = limit - 1;
          for (var i = extraModels; i > 0; i--) {
            this.remove(this.models[start + i]);
          }
        }

        // opts instead of options to distinguish from `this.options`
        opts = opts || {};
        if (!opts.silent) {
          this.trigger('limit', limit);
        }
      }
      return this._limit;
    },

    getModelClass: function() {
      // S.slog('infinite: S.Models.SparseCollection#getModelClass');

      return this.model;
    },

    prepModel: function(maybeAttributes) {
      var model = this.getModelClass();
      if (model) {
        if (maybeAttributes instanceof model) {
          return maybeAttributes;
        }
        return new model(maybeAttributes);
      }
      // product 모드에서는 자꾸만 이리로 간다.
      // 원인은 this.model이 없다는 건데..
      // return S.Utils.convertToModel(maybeAttributes);
      return new Backbone.Model(maybeAttributes);
    },

    content: function(config) {
      // S.slog('infinite: S.Models.SparseCollection#content', config);
      
      return config;
    },

    // Needed by the menu component to find out which item was clicked on
    // NOTE: This only returns the first result but sparse collection does allow for duplicate CIDs
    getByCid: function(cid) {
      return this.find(function(model) {
        return model.cid == cid;
      }, this);
    },

    /* Why _startManipulating and _stopManipulating exist.
     *
     * The sparse collection fires 'add' whenever something is added to it.
     * However, it is a common pattern to check to see if there is room for
     * more items on the screen when an add is called, and add more if there is.
     * Therefore, we should not fire 'add' on the model until the collection
     * is in a stable state (the length is correct). Backbone deals with this
     * by doing two loops, one to add things to the internal collection and
     * one to fire the events. Sparse collections, however, might have chunks
     * added that are supersets of chunks that have already been added. So, we
     * just mark when we're starting to do manipulations and when we've stopped.
     *
     * The end result is that all 'add' and 'remove' events are fired at one
     * time, only on models that were actually added or removed, and after any
     * ongoing manipulation is complete.
     */

    _collectionChanged: function(type, model, options) {
      // S.slog('infinite: S.Models.SparseCollection#_collectionChanged');

      this._chainManipulating(function() {
        if (type == 'add') {
          this._addsToFire.push([model, options]);
        } else if (type == 'remove') {
          this._removesToFire.push([model, options]);
        }
      });
    },

    _startManipulating: function() {
      // S.slog('infinite: S.Models.SparseCollection#_startManipulating');

      //console.time('[SparseCollection] manipulating');
      this._manipulating = true;
      this._addsToFire = [];
      this._removesToFire = [];
      this.trigger('manipulating');
    },

    _stopManipulating: function() {
      // S.slog('infinite: S.Models.SparseCollection#_stopManipulating');

      var self = this;

      //console.time('[SparseCollection] adding');
      _.each(self._addsToFire, function(args) {
        var model = args[0];
        var options = args[1];
        model.trigger('add', model, self, options);
      });
      //console.timeEnd('[SparseCollection] adding');

      //console.time('[SparseCollection] removing');
      _.each(self._removesToFire, function(args) {
        var model = args[0];
        var options = args[1];
        model.trigger('remove', model, self, options);
        model.unbind('all', self._onModelEvent, self);
      });
      //console.timeEnd('[SparseCollection] removing');

      this._addsToFire = null;
      this._removesToFire = null;

      this._manipulating = false;
      this.trigger('stopManipulating');
      //console.timeEnd('[SparseCollection] manipulating');
    },

    _chainManipulating: function(func) {
      // S.slog('infinite: S.Models.SparseCollection#_chainManipulating'. func);

      var manipulating = this._manipulating;
      if (!manipulating) {
        this._startManipulating();
      }
      func.apply(this);
      if (!manipulating) {
        this._stopManipulating();
      }
    },

    add: function(models, options) {
      // S.slog('infinite: S.Models.SparseCollection#add', models, options);
      options = _.extend({
        at: this.length()
      }, options);
      models = S.Utils.array(models);

      var index = options.at;
      var self = this;
      var limit = this.limit();

      // TODO, optimize the splicing of multiple models
      _.each(models, function(model) {
        if (!(model instanceof S.Model)) {
          model = self.prepModel(model);
        }
        if (self.length() < index) {
          self.models[index] = model;
        } else {
          self.models.splice(index, options.replace ? 1 : 0, model);
        }
        model.collection = self;
        model.bind('all', self._onModelEvent, self);
        if (!options.silent) {
          options.index = index; // For consistency; Backbone fires add/remove events with `index`
          self._collectionChanged('add', model, options);
        }
        index++;
      });

      if (limit !== null && limit < this.length()) {
        this.limit(this.length(), { silent: true });
      }
    },

    remove: function(models, options) {
      // S.slog('infinite: S.Models.SparseCollection#remove', models, options);

      models = S.Utils.array(models);
      options = options || {};

      var self = this;
      var index = options.at || _.indexOf(this.models, models[0]);
      var limit = this.limit();

      var shouldUpdateLimitAfterRemoval = limit === this.length();

      // TODO: Optimize removing multiple models
      _.each(models, function(model) {
        model.collection = null;
        self.models.splice(index, 1);
        if (!options.silent) {
          options.index = index; // For consistency; Backbone fires add/remove events with `index`
          self._collectionChanged('remove', model, options);
        }
        if (!self._manipulating) {
          model.unbind('all', self._onModelEvent, self);
        }
      });

      if (shouldUpdateLimitAfterRemoval) {
        this.limit(limit - models.length, { silent: true });
      }
    },

    /**
     * S.Models.SparseCollection#hasGaps() -> Boolean
     *
     * Returns true if a model is missing at any index between zero and this
     * collection's length.
     **/
    hasGaps: function() {
      // S.slog('infinite: S.Models.SparseCollection#hasGaps');

      for (var i = 0; i < this.models.length; i++) {
        if (!this.models[i]) {
          return true;
        }
      }
      return false;
    },

    /**
     * S.Models.SparseCollection#loadedSize() -> Number
     *
     * Returns the number of models in this collection that have attributes
     * (i.e., that are not placeholders).
     **/
    loadedSize: function() {
      // S.slog('infinite: S.Models.SparseCollection#loadedSize');

      return this.filter(function(m) {
        return m && _.size(m.attributes);
      }).length;
    },

    // Internal method called every time a model in the set fires an event.
    // Collection needs to be notified when its model is updated.
    //
    // "load" and "loaded" model collection events are ignored as we don't want to
    // propagate to its parent collection; "add" and "remove" events that originate
    // from its model collections are ignored as well.
    _onModelEvent : function(ev, model, collection, options) {
      // S.slog('infinite: S.Models.SparseCollection#_onModelEvent', ev, model, collection, options);

      if (ev == 'load' || ev == 'loaded') {
        return;
      }
      if ((ev == 'add' || ev == 'remove') && collection != this) {
        return;
      }
      if (ev == 'destroy') {
        this.remove(model, options);
      }
      this.trigger.apply(this, arguments);
    },

    /**
     * S.Models.SparseCollection#pluck(attr) -> Array
     * - attr (string): The property to pluck
     *
     * Pluck an attribute from each model in the collection.
     **/
    pluck: function(attr) {
      // S.slog('infinite: S.Models.SparseCollection#pluck', attr);

      return this.map(function(model){ return model.get(attr); });
    }
  });

  var methods = ['forEach', 'each', 'map', 'reduce', 'reduceRight', 'find', 'findWhere', 'detect',
    'filter', 'select', 'reject', 'every', 'all', 'some', 'any', 'include',
    'contains', 'invoke', 'max', 'min', 'sortBy', 'sortedIndex', 'toArray', 'size',
    'first', 'rest', 'last', 'without', 'indexOf', 'lastIndexOf', 'isEmpty', 'groupBy'];

  // Mix in each Underscore method as a proxy to `Collection#models`.
  _.each(methods, function(method) {
    S.Models.SparseCollection.prototype[method] = function() {
      return _[method].apply(_, [this.models].concat(_.toArray(arguments)));
    };
  });
})();