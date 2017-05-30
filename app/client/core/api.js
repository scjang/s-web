(function () {

	S.Api = {
		request: function (config) {
			if (!config.method) {
				S.slog("API ERROR: method가 없습니다.");
				return;
			}
			
			config.content = config.content || {};

			_.extend(config.content, {
				method: config.method
			});
			
			config.version = config.version || "do";

			var async = (typeof config.async === "boolean") ? config.async : true;

			var baseUrl = "/api/" + config.version + "/";

			var options = {
				type: "POST",
				url: baseUrl + config.method,
				data: config.content,
				dataType: config.dataType || "json",
				async: async,
				success: function (data) {
					if (config.hasOwnProperty("success")) {
						config.success(data);
					}
				},
				error: function (request, status, error) {
					if (status === 'error' && error === 'Unauthorized') {
						console.log(status, error);
						// S.currentUser.logout();
						// return;
					}
					
					if (config.hasOwnProperty("error")) {
						config.error(request.responseJSON, status, error);
					}
					console.log("API ERROR: ", request.responseJSON, status, error);
				},
				cache: config.cache || false,
				silent: config.silent || false
			};
			
			return $.ajax(options);
		}		
	};
	
})();
