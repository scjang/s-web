(function () {
	S.Models.ObjectModel = S.Model.extend({
		shouldFetch: true,
		initialize: function () {
			S.Model.prototype.initialize.apply(this, arguments);
		},
		getAllFields: function () {
			return _.union(_.keys(this.attributes), _.keys(this._extraRefs));
		},
		addFieldRefs: S.doNothing,
		removeFields: S.doNothing
	});
})();