(function ($) {
	S.Component.create('Dropdown', {
		hasTemplate: true,
		modelFactory: function () {
			return new Backbone.Collection([{
				link: S.currentUser.getProfileUrl(),
				text: 'Profile'
			}, {
				link: '#',
				text: 'Settings'
			}, {
				divider: true
			}, {
				link: '#',
				text: 'Log out',
				target: '_top'
			}]);
		},
		initialize: function () {
			S.Components.Dropdown.callSuper(this, 'initialize');
			_.defaults(this.options, {
				useEvent: true,
				top: 'auto',
				right: 'auto',
				bottom: 'auto',
				left: 'auto'
			});
			_.bindAll(this, 'close');
			this.listen(S.app, 'contentChanged', this.close);
			this.listen(S.app, 'contentReady', this.close);
		},
		createChildComponents: function () {
			$('<div/>').addClass('sheild').appendTo('body');
			$('.sheild').css({
				'position': 'absolute',
				'top': 0,
				'bottom': 0,
				'left': 0,
				'right': 0,
				'overflow': 'hidden',
				'z-index': 900
			});
			$('.sheild').on('click', this.close);
		},
		onInserted: function () {
			var top, right, bottom, left, properties;

			if (this.options.useEvent) {
				var containerWidth = document.body.offsetWidth;
				var containerHeight = document.body.offsetHeight;
				var contentWidth = this.$('.dropdown_menu').width();
				var contentHeight = this.$('.dropdown_menu').height();
				var x = this.options.event.clientX;
				var y = this.options.event.clientY;

				right = containerWidth - x - contentWidth + 30;
				bottom = containerHeight - y - contentHeight + 20;

				if (right < 0) right = 20;
				if (bottom < 0) bottom = 20;

				properties = {
					'top': 'auto', 
					'right': right,
					'bottom': bottom,
					'left': 'auto'
				};
			} else {
				properties = {
					'top': this.options.top,
					'right': this.options.right,
					'bottom': this.options.bottom,
					'left': this.options.left
				};
			}

			this.$el.css(properties);
		},
		close: function () {
			$('.sheild').off('click');
			$('.sheild').remove();
			this.destroy();
		}
	});
})(S.$);