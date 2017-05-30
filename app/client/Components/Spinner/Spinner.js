(function ($) {

	S.Component.create('Spinner', {
		containerId: 'Spinner',
		initialize: function () {
			S.Components.Spinner.callSuper(this, "initialize");

			var opts = {
				lines: 12,
				length: 4,
				width: 2,
				radius: 5,
				color: '#4b5c66',
				speed: 1,
				trail: 60,
				shadow: false
			};
			this.spinner = new Spinner(opts);
		},
		spin: function () {
			this.$el.removeClass('loaded');
      this.$el.addClass('loading');
			this.spinner.spin(this.$el[0]);
			$(this.spinner.el).css({
				left: '50%',
				top: '50%'
			});
		},
		stop: function () {
			this.spinner.stop();
			this.$el.addClass('loaded');
      this.$el.removeClass('loading');
		},
		disable: function () {
			this.spinner.stop();
			this.$el.removeClass('loaded loading');
		}
	});

})(S.$);