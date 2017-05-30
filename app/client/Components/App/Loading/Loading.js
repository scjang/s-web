(function () {
	S.Component.create('App.Loading', {
		dependencies: ['Spinner'],
		hasTemplate: true,
		createChildComponents: function () {
			this.spinner = new S.Components.Spinner();
		},
		spin: function () {
			this.spinner.spin();
		},
		stop: function () {
			this.spinner.stop();
		}
	})
})();