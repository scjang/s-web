(function () {
	S.Component.create('Modal', {
		onRendered: function () {
			this.$('.modal').modal('show');
		}
	});
})();