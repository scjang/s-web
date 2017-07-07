(function ($) {
	S.Component.create("App.Grape", {
		dependencies: [
			'App',
			'App.Nav'
		],
		superClass: "App",
		hasTemplate: true,
		createChildComponents: function () {
			S.Components.App.Grape.callSuper(this, 'createChildComponents');
			this.nav = new S.Components.App.Nav();
			console.log('wow');
		}
	});
})(S.$);