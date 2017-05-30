(function () {
	var MemoryStorage = Backbone.Model.extend({
		getItem: function (key) {
			return this.get(key);
		},
		setItem: function (key, value) {
			this.set(key, value);
		},
		removeItem: function (key) {
			this.unset(key);
		}
	});

	S.Services.register('Storage', {
		isGlobal: true,
		onInitialized: function () {
			try {
				this.localStorage = window.localStorage;
			} catch (e) {
				// need fallback
			}

			// Keys essential to proper operation but relatively small
			this._whitelistedKeys = {};
		},
		isUsable: function () {
			return !S.currentUser.isAnonymous() && this.localStorage;
		},

		/**
     * S.Services.Storage#preserveIfNoSpace(key) -> undefined
     * - key (String|Object): Storage key
     *
     * Whitelist a key to persist in-memory if localStorage
     * throws QUOTA_EXCEEDED_ERR.
     **/
		preserveIfNoSpace: function (key) {
			this._whitelistedKeys[key] = true;
		},

		_handleQuotaExceeded: function(key, value) {
      // After a refresh, since the playerStateVersion is kept,
      // "/player/playerState" will be downloaded
      var memoryStorage = new MemoryStorage();
      memoryStorage.setItem(key, JSON.stringify(value));

      // Copy whitelisted keys from localStorage
      for (key in this.localStorage) {
        if (!this._whitelistedKeys[key]) {
          continue;
        }
        value = this.localStorage.getItem(key);
        memoryStorage.setItem(key, value);
      }

      // On a refresh, localStorage will be repopulated from the server
      this.localStorage.clear();

      // Keep things running smoothly by replacing localStorage
      this.localStorage = memoryStorage;
    },

    /**
     * S.Services.Storage#getItem(key) -> Object
     * - key (String): storage key
     *
     * Returns the stored object, null if it doesn't exist
     **/
    getItem: function(key) {
      return JSON.parse(this.localStorage.getItem(key) || 'null', S.Utils.modelReviver);
    },

    /**
     * S.Services.Storage#setItem(key, value) -> undefined
     * - key (String): storage key
     * - value (Object): object to store
     **/
    setItem: function(key, value) {
      if (_.isUndefined(value)) {
        this.removeItem(key);
        return;
      }

      try {
        this.localStorage.setItem(key, JSON.stringify(value));
      } catch (err) {
        if (err.name === 'QUOTA_EXCEEDED_ERR') {
        	// change this.localstorage to memoryStorage
          this._handleQuotaExceeded(key, value);
        }
      }
    },

    /**
     * S.Services.Storage#removeItem(key) -> undefined
     * - key (String): storage key
     *
     * Removes `key` from local storage
     **/
    removeItem: function(key) {
      this.localStorage.removeItem(key);
    },

    clear: function() {
      try {
        this.localStorage.clear();
      } catch (e) {
      }
    }
	});
})();