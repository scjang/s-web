(function ($) {
	S.Component.create("App.Grape", {
		dependencies: [
			'App',
			'App.Nav',
      'App.Footer'
		],
		superClass: "App",
		hasTemplate: true,
    initialize: function () {
		  S.Components.App.Grape.callSuper(this, 'initialize');
    },
		createChildComponents: function () {
			S.Components.App.Grape.callSuper(this, 'createChildComponents');
			this.nav = new S.Components.App.Nav();
		},
    onInserted: function () {
      this.renderNewChild(new S.Components.App.Footer());
    }
	});
})(S.$);