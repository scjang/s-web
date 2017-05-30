(function ($) {
  S.Component.create('App', {
    dependencies: ['App.Loading'],

    /**
     * S.Components.App#content -> jQuery element
     * 
     * ** Actually S.Components.App.$content! **
     * 
     * The main content element that should be replaced when navigating.
     * This should be overridden by subclasses or it will default to a
     * div in body.
     */
    $content: null,

    initialize: function (){
      S.Components.App.callSuper(this, 'initialize');

      this.history = [];
      this.listen(S.router, 'contentChanged', this.onContentChanged);
      _.bindAll(this, 'onResized');
    },
    createChildComponents: function () {
      this.spinner = this.addChild(new S.Components.App.Loading());
    },
    onRendered: function () {
      if (!this.$content) {
        this.$content = $('<div class="app_content" />');
        this.$el.append(this.$content);
      }
      this.content = this.$content;
    },
    onInserted: function () {
      $(window).on('resize', this.onResized);
    },
    onDetached: function () {
      $(window).off('resize', this.onResized);
    },
    onResized: function () {
      this.trigger('resize');
    },
    showLoading: function () {
      this.spinner.spin();
    },
    hideLoading: function () {
      this.spinner.stop();
    },
    onContentChanged: function (newComponent, componentOptions) {
      var self = this;
      var loadingUrl;

      componentOptions = componentOptions || {};

      if (this._willBeDestroyed) {
        S.slog("destroy가 실행된 컴포넌트 입니다.");
        return;
      }

      if (this._isContentInHistory()){
        this._insertContentFromHistory();
        return;
      }

      this.trigger('contentChanged');

      if (this.currentContent) {
        this.saveHistory(this.currentContent);
        if (!componentOptions.layered) {
          this.currentContent.$el.hide();
        }
        this._deactivateCurrentContent(this.currentContent);
      }

      loadingUrl = S.Utils.getRouteURL();

      this.showLoading();
      
      S.Loader.load([newComponent], function () {
        var constructor = S.Component.getObject(newComponent);
        
        self.currentContent = new constructor(componentOptions);

        if (!self.currentContent.handleFetchError) {
          self.listen(self.currentContent, 'fetchError', self.onContentFetchError);
        }

        self.currentContent.ensureModel(function () {
          
          // 모델이 fetch 되는 동안 url이 변경되는 경우 
          // 결국 render가 두번 실행되기도 해서 화면에 컴포넌트가 두개가 붙는 증상이 발생함
          // 그것을 막기 위한 처리임
          if (S.Utils.getRouteURL() === loadingUrl) {
            
            self.currentContent.render(function () {

              self.currentContent.url = S.Utils.getRouteURL();
              
              if (componentOptions.layered) {
                self.currentContent.layered = true;
              }
              
              self.currentContent = self.addChild(self.currentContent);
              
              self.hideLoading();

              self._insertNewContent();

            });
          } else {
            // 간혹 fetch 전에 화면 이동 시 스피너가 사라지지 않는 증상이 있음
            self.hideLoading();
          }
        });
      });

    },
    updatePageInfo: function () {
      this._setTitle();
      this._applyAdditionalHeadTags();
    },

    extraHeadTags: null,

    title: function () {
      var newTitle = S.serverInfo.get('app_name');
      if (this.currentContent && this.currentContent.pageTitle) {
        newTitle = newTitle + ' ' + this.currentContent.pageTitle;
      }
      return newTitle;
    },
    _setTitle: function () {
      document.title = this.title();
    },
    _getCurrentUrl: function () {
      var loc = window.location;
      return loc.protocol + '//' + loc.host + loc.pathname;
    },
    _applyAdditionalHeadTags: function () {
      // Apply Twitter/Facebook/Open Graph meta tags and canonical links to HTML <head>.
      // Documentation: https://developers.facebook.com/docs/opengraph/music/
      //                https://dev.twitter.com/docs/cards
      //                http://support.google.com/webmasters/bin/answer.py?hl=en&answer=139394
      // We have special tag sets for the following pages:
      // - Artist
      // - Album (with and without a track selected)
      // - Playlist
      // - Profile

      // Clear existing Open Graph meta tags
      $('head meta[property]').remove();
      // Clear existing canonical link
      // $('head link[rel=canonical]').remove();
      // Clear msapplication meta tags
      // $('head meta[name^=msapplication]').remove();
      // Clear JSON-LD script tags
      // $('head script[type="application/ld+json"]').remove();

      // Common tags
      // Tags can be duplicated. There is a `music:song` tag for each track on an album.
      var metaTags = [
        { 'twitter:site': S.serverInfo.get('twitter_name') },
        { 'fb:app_id': S.serverInfo.get('facebook_app_id') },
        { 'og:site_name': S.serverInfo.get('app_name') }
      ];

      // Combine with page-specific meta tags
      if (this.currentContent.getMetaTags) {
        metaTags = metaTags.concat(this.currentContent.getMetaTags());
      }

      // Convert meta tags to HTML
      var tagsHtml = [];
      _.each(metaTags, function(tag) {
        _.each(tag, function(value, key) {
          value = String(value);
          if (/twitter/.test(key)) {
            tagsHtml.push('<meta name="' + key + '" content="' + value + '" />'); 
          } else {
            tagsHtml.push('<meta property="' + key + '" content="' + value + '" />'); 
          }
        });
      });

      // Add canonical URL link
      var escapedCurrentUrl = this._getCurrentUrl();
      tagsHtml.push('<link rel="canonical" href="' +  escapedCurrentUrl + '" />');

      // Add Google Organic Search JSON-LD
      // if (this.currentContent.getGoogleMetaJSON) {
      //   var googleJson = this.currentContent.getGoogleMetaJSON();
      //   if (googleJson) {
      //     tagsHtml.push('<script type="application/ld+json">' + JSON.stringify(googleJson) + "</script>");
      //   }
      // }

      // Add any other app-requested head tags
      var extraHeadTags = S.Utils.value(this.extraHeadTags);
      if (extraHeadTags) {
        tagsHtml = tagsHtml.concat(extraHeadTags);
      }

      // Append to <head>
      var metadata = tagsHtml.join('\n');
      $('head').prepend(metadata);
    },
    saveHistory: function (view) {
      if (!view || !view.cache || view.invalidated) {
        this._pruneHistory();
        return;
      }
      /**
       * history 배열에 추가하는 부분.
       * 스크롤 포지션, view, url을 함께 넣어둬~.
       */
      var scrollPosition = this.content.scrollTop(),
        historyObj = {
          url: view.url,
          view: view,
          layered: view.layered,
          scrollPosition: scrollPosition,
          date: new Date()
        };
      this.history.unshift(historyObj);
      this._pruneHistory();
      
      S.slog('S.app.history: ', this.history);
      S.slog('S.app.children: ', this.children);
    },
    _isContentInHistory: function () {
      return _.isObject(this.getHistoryObject(S.Utils.getRouteURL()));
    },
    getHistoryObject: function (url) {
      return _.find(this.history, function (h) {
        if (h.url === url) {
          return true;
        }
      });
    },
    _insertContentFromHistory: function () {
      /**
       * history 배열에 view가 있는 경우 실행하는 놈
       * 코드가 조금 길어진 것은 history에 다시 집어넣어야 하기 때문임
       */
      var historyObj = this.getHistoryObject(S.Utils.getRouteURL());
      
      this.history = _.without(this.history, historyObj);

      if (this.currentContent) {
        this.saveHistory(this.currentContent);
        if (!historyObj.view.layered) {
          this.currentContent.$el.hide();
        }
        this._deactivateCurrentContent(this.currentContent);
      }
      
      this.currentContent = historyObj.view;
      this.updatePageInfo();
      this.currentContent.$el.show();
      this.currentContent.insert();
      this.currentContent.delegateEvents();
      this.content.scrollTop(historyObj.scrollPosition);
      
      this.trigger('contentReady', this.currentContent);
    },

    /**
     * this.contentChange의 마지막 부분에서 실행하는 놈
     * history에 없는 뷰를 .centerContents에 append 하고,
     * 스크롤를 0으로 지정함.
     */
    _insertNewContent: function () {
      this.insertCurrentContentIntoDom();
      this.content.scrollTop(0);
      
      this.trigger('newContent');
      this.updatePageInfo();
    },
    insertCurrentContentIntoDom: function () {
      this.$content.append(this.currentContent.el);
    },
    _deactivateCurrentContent: function(currentContent) {
      if (currentContent.cache) {
        currentContent.detach();
      } else {
        currentContent.destroy();
      }
    },
    _pruneHistory: function () {
      /**
       * expired는 삭제될 놈일 경우 true 반환
       * 만료된 놈은 삭제하고 splice로 빼니까 i-- 로 거기서부터 다시 체크
       */
      for (var i = 0; i < this.history.length; i++) {
        if (this.expired(this.history[i])) {
          this.history[i].view.destroy();
          this.history.splice(i, 1);
          i--;
        }
      }
      /**
       * history 배열을 5개만 유지하도록 하는 놈.
       * hisotry 배열이 5개가 넘을 경우 배열의 마지막 놈을 pop!.
       */
      if (this.history.length > 5) {
        var deadHistory = this.history.pop();
        deadHistory.view.destroy();
      }
    },
    onContentFetchError: function (model, response) {
      var onFetchError = this.currentContent.onFetchError;
      if (response && response.status !== 404) {
        if (response.statusText === 'abort') {
          return;
        }
        // 404가 아닐 경우에 대한 Component 필요
        // 이런 케이스가 있는지 보기위해 없는 컴포넌트 할당
        onFetchError = 'NotFound';
      }
      S.router.routeNotFound(onFetchError);
    },
    expired: function (entry) {
      var timeSince = (new Date()).getTime() - entry.date.getTime();
      return timeSince >= 1e3 * 60 * 10;
    }
  });
})(S.$);