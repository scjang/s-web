(function () {
	S.Component.create('SourceList', {
		dependencies: [
			'InfiniteScroll'
		],
		superClass: 'InfiniteScroll',
		waitToRender: true,
		hasTemplate: true,
		initialize: function () {
			S.Components.SourceList.callSuper(this, 'initialize');
		},
		onModelCreated: function () {
			S.Components.SourceList.callSuper(this, 'onModelCreated');
			this.listen(this.model, 'addModel', this.onModelAdded);
		},
		getChildComponent: function (item, i) {
			var component;

			if (!this.options.componentFactory) {
				return null;
			}

			component = this.options.componentFactory(item);

			return component;
		},
		getModelParams: function () {
			return {
				start: this.model.length(),
				count: this.options.count
			};
		}
	});
})();