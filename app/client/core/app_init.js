(function () {
	S.appInit = function () {
		S.loaderVersion = env.loaderVersion;
		S.currentUser = new S.Models.CurrentUser(env.currentUser);
		S.serverInfo = new Backbone.Model(env.serverInfo);
		S.Services.start();
		// appMode 확인, development or product
		S.Config.init();
		// logger.js 실행 
		S.con.init();

		var baseComponent = S.serverInfo.get('base_component');

		S.router = new S.Router();
		
		S.Loader.load([baseComponent], function () {
			S.app = new (S.Component.getObject(baseComponent))();
			S.app.render(function () {
				
				S.fbInit();

				if (!Backbone.history.started) { 
					Backbone.history.start({
						pushState: true, 
						root: '/'
					}); 
				}
				
				$("body").append(S.app.el);
			});
		});
	};
})();