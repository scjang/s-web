(function () {
	/** 
	 * These are examples.
	 */	
	S.Models.User = S.Models.ObjectModel.extend({
		method: 'getProfile',
		content: function () {
			return {
				id: this.options.id
			};
		},
		getProfileImage: function (size) {
			size = size || 50;

			if (size === 200) {
				return this.get('pictures')[2].url;	
			} else if (size === 100) {
				return this.get('pictures')[1].url;	
			} else {
				return this.get('pictures')[0].url;	
			}
		},
		getProfileUrl: function () {
			return '/' + this.get('_id');
		},
		getSettingsUrl: function () {
			return this.getProfileUrl() + '/settings';
		}
	});

	S.Models.CurrentUser = S.Models.User.extend({
		isMe: function (id) {
			return this.get('_id') === id;
		},
		isLogin: function () {
			return this.get('_id') ? true : false;
		},
		isAnonymous: function () {
			return !this.get('_id');
		},
		logout: function () {
			S.Utils.deleteCookie(S.serverInfo.get('app_name'));
		},
		updateSettings: function (data) {
			var self = this;
			data.nickname = _.escape(data.nickname);
			S.Api.request({
				method: 'updateMyProfile',
				content: data,
				success: function (data) {
					window.location.reload();
				},
				error: function (err) {
					self.trigger('error', err);
				}
			});
		}
	});
})();