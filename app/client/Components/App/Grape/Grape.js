(function ($) {
	S.Component.create("App.Grape", {
		dependencies: [
			'App',
			'App.Nav',
      'App.Footer'
		],
		superClass: "App",
		hasTemplate: true,
		createChildComponents: function () {
		  /*
		  * three way add child component
		  * */
			S.Components.App.Grape.callSuper(this, 'createChildComponents');
			this.nav = new S.Components.App.Nav();
			this.footer = this.addChild(new S.Components.App.Footer());
      // console.log(this.children[0].parent());
		}
	});
})(S.$);