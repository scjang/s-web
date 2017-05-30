(function($) {
  var isPositiveNumber = S.Utils.isPositiveNumber;

  /**
   * class S.Components.InfiniteScroll < S.Component
   *
   * Component to drive infinite scrolling.
   **/
  S.Component.create('InfiniteScroll', {
    dependencies: ['Spinner'],

    options: {
      disableInfiniteScroll: false,
      hideSpinner: false,
      horizontal: false
    },

    /**
     * new S.Components.InfiniteScroll(options)
     * - options (Object): options for component
     *
     * Available options:
     *
     *    * disableInfiniteScroll (`Boolean`): Set to `true` to turn off infinite scroll.
     *      If set to `true`, the component will call fetch on its model until it receives
     *      none back (chunked rendering). Default: `false`
     *    * disableFreeScroll (`Boolean`): Set to `true` to disable free scrolling even
     *      when the item total (limit) is known. Default: `false`.
     *    * hideSpinner (`Boolean`): Never show the spinner. Default: `false`
     *    * containerEl (`Element`): An element or object that has height(), scrollTop(),
     *      bind() and unbind() methods. The InfiniteScroll class will bind a scroll event to
     *      and obtain important measurement information from it.
     *    * horizontal (`Boolean`): `true` if this infinitely scrolls horizonzontally
     *      instead of vertically. Default: `false`
     *    * botLinkId (`String`): If present, paging links generated for bots will contain this
     *      identifier.  When these links are visited, this component will only auto-scroll if the
     *      identifier in the url is the same as this option.  This is used to implement the correct
     *      behavior for pages that have multiple InfiniteScroll components (each one will generate
     *      paging links for its unique ID, and when those links are crawled, only the one that
     *      generated the link will be auto-scrolled).
     **/
    initialize: function() {
      S.Component.prototype.initialize.apply(this, arguments);
      _.bindAll(this, 'onScrolled', 'onResized');
      this.loading = false;
      this.ensureItemsLoaded = _.debounce(this.ensureItemsLoaded, 30);

      _.defaults(this.options, {
        pagingMode: S.isPhantom
      });
    },

    _verticalProps: {
      edge: 'top',
      containerSize: 'containerHeight',
      contentSize: 'outerHeight'
    },

    _horizontalProps: {
      edge: 'left',
      containerSize: 'containerWidth',
      contentSize: 'outerWidth'
    },

    createChildComponents: function() {
      this.spinner = new S.Components.Spinner();
    },

    onModelCreated: function() {
      this.listen(this.model, 'load', this.startLoading);
      this.listen(this.model, 'loaded', this.stopLoading);

      this.listen(this.model, 'add', this._maybeAddModel);
      this.listen(this.model, 'remove', this.onModelRemoved);

      this.listen(this.model, 'limit', this.onResized);

      this.listen(this.model, 'reset', function() {
        var self = this;
        this.render(function() {
          self.onResized();
        });
      });

      this.listen(this.model, 'error', this.onModelError);
    },

    _setBotParams: function() {
      var qsParams = S.Utils.getQueryStringParams();
      var start = parseInt(qsParams.start, 10);
      if (isPositiveNumber(start)) {
        this._startIndex = start;
      }
      if (_.has(qsParams, 'botLinkId')) {
        this._botLinkId = qsParams.botLinkId;
      }
    },

    onInserted: function() {
      S.Component.prototype.onInserted.apply(this, arguments);

      if (!this.options.disableInfiniteScroll) {
        this._setBotParams();
        if (this.options.pagingMode || isPositiveNumber(this._startIndex)) {
          // Tell phantom to wait for bot content
          this._alertIfPhantom('waitForExtraContent');
          this.listen(this, 'ensureItemsLoaded', this._handlePagingMode);
        } else if (_.isNumber(this._scrollTop)) {
          this.container().scrollTop(this._scrollTop);
        }
      }

      var container = this.container();

      if (container === S.app.content) {
        this.listen(container, 'resize', this.onResized);
      } else {
        container.bind('resize', this.onResized);
      }

      if (!this.options.disableInfiniteScroll) {
        container.bind('scroll', this.onScrolled);
      }

      this.ensureItemsLoaded();
    },

    _alertIfPhantom: function(message) {
      if (S.isPhantom) {
        alert(message);
      }
    },

    _handlePagingMode: function() {
      this.stopListening(this, 'ensureItemsLoaded', this._handlePagingMode);
      if (this.model.loading) {
        this.listen(this.model, 'loaded', this._onBotPagingInfoReady);
      } else {
        this._onBotPagingInfoReady();
      }
    },

    _onBotPagingInfoReady: function() {
      this.stopListening(this.model, 'loaded', this._onBotPagingInfoReady);
      this._runLaterUnlessDestroyed(function() {
        if (isPositiveNumber(this.model.limit())) {
          this._handleLimitedCollection();
        } else {
          this._handleUnlimitedCollection();
        }
      });
    },

    _handleUnlimitedCollection: function() {
      if (this.options.pagingMode) {
        var startIndex = this._startIndex || 0;
        var loadedSize = this.model.loadedSize();
        var nextIndex = startIndex + loadedSize;
        var baseURL = this._makeBaseUrlForBotLinks();
        var $nav =$('<nav />')
          .append('<a class="botlink" href="' + baseURL + 'start=' + nextIndex + '">' + t('Next') + '</a>');
        if (startIndex > 0) {
          var prevIndex = Math.max(0, startIndex - loadedSize);
          $nav.append('<a class="botlink" href="' + baseURL + 'start=' + prevIndex + '">' + t('Prev') + '</a>');
        }
        $nav.prependTo(this.$el);
      }
      var modelParams = this.getModelParams();
      if (modelParams && _.isNumber(modelParams.start)) {
        this._scrollAndWaitForContent(modelParams.start + this._startIndex);
      } else {
        // Can't scroll without model params.  Just wait for any in-flight
        // content.
        this._waitForContentInserted();
      }
    },

    _handleLimitedCollection: function() {
      // In order to insert links to all points in the collection, and to be
      // able to scroll to an arbitrary point:
      //  - ensureSize must be able to expand the container for scrolling
      //  - itemHeight must be present to calculate the scroll point
      var elementHeight = this.ensureSize();
      if (elementHeight && this.itemHeight) {
        if (this.options.pagingMode) {
          var totalModels = this.model.limit();
          var windowSize = this.model.loadedSize();
          var currentStart = windowSize;
          var baseUrl = this._makeBaseUrlForBotLinks();
          var pageNumber = 1;
          var $list = $('<ol />');
          while (currentStart < totalModels) {
            $('<li><a class="botlink" href="' + baseUrl + 'start=' + currentStart + '">' + pageNumber + '</a></li>')
              .appendTo($list);
            currentStart += windowSize;
            pageNumber++;
          }
          $('<nav class="botlinks" />').append($list).prependTo(this.$el);
        }

        this._scrollAndWaitForContent();
      } else {
        // TODO: item height is not available for waitToRender-style
        // components.  Must handle this later.
        this._alertIfPhantom('extraContentDone');
      }
    },

    _scrollAndWaitForContent: function(total) {
      if (this._canScrollToStartIndex()) {
        this.ensureSize(total);
        this.scrollToStartIndex(this._startIndex);
        this.listen(this, 'ensureItemsLoaded', this._waitForContentInserted);
      } else {
        this._waitForContentInserted();
      }
    },

    // In several places below, we have to defer to allow sparse collection to
    // finish internal updates.
    _runLaterUnlessDestroyed: function(k) {
      var self = this;
      _.defer(function() {
        // This component might have been destroyed in the meantime.
        if (!self.model) {
          self._alertIfPhantom('extraContentDone');
        } else {
          k.call(self);
        }
      });
    },

    _waitForContentInserted: function() {
      this.stopListening(this, 'ensureItemsLoaded', this._waitForContentInserted);
      this._runLaterUnlessDestroyed(function() {
        if (!this.model.loading) {
          this._alertIfPhantom('extraContentDone');
        } else {
          this.listen(this.model, 'loaded', this._extraContentListener);
        }
      });
    },

    _extraContentListener: function() {
      this._runLaterUnlessDestroyed(function() {
        if (!this.model.loading) {
          this.stopListening(this.model, 'loaded', this._extraContentListener);
          this._alertIfPhantom('extraContentDone');
        }
      });
    },

    _canScrollToStartIndex: function() {
      if ((_.isString(this._botLinkId) || _.isString(this.options.botLinkId)) &&
          this._botLinkId !== this.options.botLinkId) {
        // Link was generated by another InfiniteScroll
        return false;
      }
      var limit = this.model.limit();
      if (!isPositiveNumber(this._startIndex) || (isPositiveNumber(limit) && this._startIndex > limit)) {
        return false;
      }
      return true;
    },

    /**
     * S.Components.InfiniteScroll#scrollToStartIndex(startIndex) -> undefined
     * - startIndex (`Number`)
     *
     * Subclasses must override this to enable auto-scrolling for bot
     * pagination.
     **/
    scrollToStartIndex: S.doNothing,

    // The base url contains the page url and any query string params other
    // than 'start'.
    _makeBaseUrlForBotLinks: function() {
      var fragment = Backbone.history.getFragment();
      var withoutQs = fragment.replace(/\?.*$/, '');
      var otherQsParams;
      if (fragment !== withoutQs) {
        otherQsParams = S.Utils.getQueryStringParams(fragment);
        delete otherQsParams.start;
      } else {
        otherQsParams = {};
      }
      if (_.isString(this.options.botLinkId)) {
        otherQsParams.botLinkId = this.options.botLinkId;
      }
      var baseUrl = withoutQs + S.Utils.makeQueryString(otherQsParams);
      if (baseUrl[0] !== '/') {
        baseUrl = '/' + baseUrl;
      }
      if (baseUrl[baseUrl.length - 1] !== '?') {
        baseUrl += '&';
      }
      return baseUrl;
    },

    onDetached: function() {
      S.Component.prototype.onDetached.apply(this, arguments);

      var container = this.container();

      if (container) {
        container.unbind('scroll', this.onScrolled);
        container.unbind('resize', this.onResized);
      }
      if (S.app && S.app.content) {
        this.stopListening(S.app.content);
      }
    },

    onResized: function() {
      this.ensureItemsLoaded();
      this.trigger('resize');
    },

    onScrolled: function() {
      this._scrollTop = this.container().scrollTop();
      this.ensureItemsLoaded();
    },

    getContentEl: function() {
      // Element used for content bottom calculations to determine when to load
      // more items.
      return this.$el;
    },

    /**
     * S.Components.InfiniteScroll#ensureItemsLoaded() -> Array
     *
     * Makes sure that we are loading models if we need to be. Returns
     * the section of models currently loading.
     **/
    ensureItemsLoaded: function() {
      var result;

      // Since this function is throttled (debounced), we could have been destroyed by the
      // time we're called. If that's happened, just return and allow ourselves
      // to die a quiet death.
      if (this.isDestroyed() || !this.container() || !this.isInserted()) {
        return [];
      }

      // We can't load things from non-sparse collections
      var nonSparseCollection = !this.model.limit;

      // if we're already loading, don't load any more if this is an infinite list
      var infinite = !nonSparseCollection && (this.options.disableFreeScroll || _.isNull(this.model.limit()) || this.waitToRender);
      var alreadyLoading = this.model.loading && infinite;

      if (nonSparseCollection || alreadyLoading) {
        result = [];
      } else {
        var modelParams = this.getModelParams() || {};
        var disabledInfiniteScrollContent = (this.options.disableInfiniteScroll && modelParams.start <= 0);

        if (disabledInfiniteScrollContent) {
          result = this.model.get(modelParams);
        } else if (this.model.hasGaps() || !(infinite && this._isContentOffscreen())) {
          result = this.model.get(modelParams);
        } else {
          result = [];
        }
      }

      this.trigger('ensureItemsLoaded');
      return result;
    },

    _isContentOffscreen: function() {
      /*_verticalProps: {
        edge: 'top',
        containerSize: 'containerHeight',
        contentSize: 'outerHeight'
      },*/
      var props = this.options.horizontal ? this._horizontalProps : this._verticalProps;
      var containerEdge = (this.container().offset()[props.edge] + this[props.containerSize]());
      var contentEl = this.getContentEl();
      var contentEdge = (contentEl.offset()[props.edge] + contentEl[props.contentSize]());
      var distanceFromEdge = contentEdge - containerEdge;
      
      return (distanceFromEdge > this.loadMoreOffset());
    },

    _maybeAddModel: function() {
      if (!this.waitToRender) {
        this.onModelAdded.apply(this, arguments);
      }
    },

    _ensureChildrenRendered: function() {
      var self = this;
      self.model.each(function(model) {
        var child = self.findChildWithModel(model);
        if (!child) {
          // We pass triggerResize so the onModelAdded handler will render
          // the child and trigger a resize of the container
          self.onModelAdded(model, self.model, {
            triggerResize: true
          });
        }
      });
    },

    /**
     * S.Components.InfiniteScroll#setContainerEl(el) -> undefined
     *
     * - el (`Element` | `Object`): An element or object that has height(),
     *     scrollTop(), bind() and unbind() methods. The InfiniteScroll
     *     class will bind a scroll event to and obtain important
     *     measurement information from it.
     *
     * The method should be called if there was no `containerEl`
     * option passed in. It will handle removing old listeners,
     * setting the containerEl and adding new listeners.
     *
     **/
    setContainerEl: function(el) {
      // Remove current scroll listener
      this.container().unbind('scroll', this.onScrolled);
      // Set the element
      this.options.containerEl = el;
      // Add a new listener for the scroll event
      this.container().bind('scroll', this.onScrolled);
    },

    container: function() {
      // A helper function that will return the containerEl
      // if it's available, otherwise it will return S.app.
      if (this.options.containerEl) {
        return this.options.containerEl;
      } else if (S.app) {
        return S.app.content;
      }
    },

    containerHeight: function() {
      // Get the height
      return this.container().height();
    },

    containerWidth: function() {
      return this.container().width();
    },

    containerScrollTop: function() {
      // Get the scrollTop
      return this.container().scrollTop();
    },

    /**
     * S.Components.InfiniteScroll#startLoading() -> undefined
     *
     * Show default loading indicator. Override this if you want to customize
     * the loading behavior.
     **/
    startLoading: function() {
      if (this.spinner && !this.options.hideSpinner) {
        this.spinner.spin();
      }
      this.trigger('resize');
    },

    /**
     * S.Components.InfiniteScroll#stopLoading() -> undefined
     *
     * Stop loading indicator. If you override [[S.Components.InfiniteScroll#startLoading]],
     * you probably want to override this too.
     **/
    stopLoading: function() {
      this._stopSpinner();
      this.ensureItemsLoaded();
      this._tryRenderChildren();
      if (!_.isNull(this.model.limit())) {
        this.trigger('noMoreChildren');
      }
    },

    onModelError: function() {
      this._stopSpinner();
      this._tryRenderChildren();
    },

    _stopSpinner: function() {
      if (this.spinner && !this.options.hideSpinner) {
        this.spinner.stop();
      }
    },

    _tryRenderChildren: function() {
      if (this.waitToRender) {
        this._ensureChildrenRendered();
      }
    },

    /**
     * S.Components.InfiniteScroll#disableInfiniteScroll() -> undefined
     *
     * Disable infinite scroll for this component.
     **/
    disableInfiniteScroll: function() {
      this.options.disableInfiniteScroll = true;
      this.stopListening(S.app, 'scroll', this.onScrolled);
      if (this.spinner) {
        this.spinner.disable();
      }
    },

    /* The default behavior is 'append 10 more children when you reach the bottom'.
     * If you want something other than that, you should override these functions.
     */

    /**
     * S.Components.InfiniteScroll#loadMoreOffset() -> int
     *
     * By default, returns 150. Override to change when more items should be loaded.
     **/
    loadMoreOffset: function() {
      return 150;
    },

    /**
     * S.Components.InfiniteScroll#getModelParams() -> Object
     *
     * By default returns { start: num_children, count: 10 }, override to change the params sent to the components Model
     **/
    getModelParams: function() {
      if (this.options.modelParams) {
        return this.options.modelParams();
      } else {
        return {
          start: this.model.length(),
          count: 10
        };
      }
    },

    /**
     * S.Components.InfiniteScroll#getChildComponent(model) -> S.Component
     *
     * Component to use for rendering new models in the collection. For homogoneous collections, just set childClass.
     **/
    getChildComponent: function(model) {
      return new (S.Component.getObject(this.childClass))({
          model: model
      });
    },

    /**
     * S.Components.InfiniteScroll#getInsertionPoint() -> Object
     *
     * Used to specify where new child components end up. By default returns
     * the scrollable content div (assumes you extend the InfiniteScroll template)
     **/
    getInsertionPoint: function() {
      return this.$('> .scrollable_content');
    },

    /**
     * S.Components.InfiniteScroll#ensureSize(total) -> Number
     * - total (`Number`): The container should be large enough for this many
     * items.  Optional - if not present, will use model's limit.
     *
     * Function to set the height of the container so that we can scroll
     * anywhere in the view and load what we're looking at.
     *
     * If there is no limit on the model, the height will not be set and
     * `undefined` will be returned.
     *
     * Returns the total height that was set.
     **/
    ensureSize: function(total) {
      if (!isPositiveNumber(total)) {
        total = this.model.limit();
      }
      if (this.options.disableFreeScroll || total == this.model.length()) {
        return;
      }
      var totalHeight;
      var child;
      if (total && !this.waitToRender) {
        child = this.findChildWithModel(this.model.at(0));
        if (child) {
          this.itemHeight = child.$el.outerHeight();
          totalHeight = this.itemHeight * total;
          this.$el.height(totalHeight);
        }
      }
      return totalHeight;
    },

    /**
     * S.Components.InfiniteScroll#onModelAdded(model) -> undefined
     * - model (Backbone.Model): The model that was added to the collection
     * - collection (Backbone.Collection): The collection the add was fired from
     * - opts (Object): The options originally passed to the add method,
     *   such as `{ at: 5 }`. If `at` is specified, will render the child component
     *   at this index.
     *
     * This function is called when a new model is added to the sparse
     * collection. Override this if you want to do something different than
     * the default, which is to call [[S.Components.InfiniteScroll#getChildComponent]]
     * and render the result as a child.
     **/
    onModelAdded: function(model, collection, opts) {
      opts = opts || {};
      var at = this.model.indexOf(model);
      if (at < 0) {
        console.error('could not get index of model', model);
        return;
      }

      var component = this.getChildComponent(model, at);

      if (component) {
        // We use the option passed in by `_ensureChildrenRendered` to render
        // the child, then resize
        if (opts.triggerResize) {
          this.renderNewChild(component, this.getInsertionPoint(), this.onResized);
        } else {
          S.Utils.renderChildAtIndex(this, component, at, this.getInsertionPoint());
        }
      } else {
        console.error("Failed to create child component for added model");
      }
    },
    /**
     * S.Components.InfiniteScroll#onModelRemoved(model) -> undefined
     * - model (Backbone.Model): The model that was removed from the collection
     *
     * By default, this function finds the child represented by the `model` and
     * destroys it.
     **/
    onModelRemoved: function(model) {
      var component = this.findChildWithModel(model);
      if (component) {
        component.$el.fadeOut('fast', function () {
          component.destroy();  
        });
      }
    }
  });
})(S.$);
