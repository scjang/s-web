(function() {
  /**
   * mixin S.CollectionUtils
   *
   * Mixable object for collection utilities.
   * Used by [[S.Models.SparseCollection]].
   **/
  S.CollectionUtils = {
    model: S.Models.ObjectModel,

    /**
     * S.CollectionUtils.addField(field) -> $.Promise
     * - field (`String`): Field to add to each model.
     *
     * Add a field to each `ObjectModel` in the collection.
     **/
    addField: function(field) {
      var modelsToUpdate = this.reject(function(model) {
        // reject models that already have
        // the field or don't support addField
        return model.has(field) || !model.addField;
      });
      var deferreds = _.map(modelsToUpdate, function(model) {
        return model.addField(field);
      });
      return $.when(deferreds);
    },

    /**
     * S.CollectionUtils.addFields(fields) -> undefined
     * - fields (`Array`): Fields to add to each model.
     *
     * Add fields to each `ObjectModel` in the collection.
     **/
    addFields: function(fields) {
      var modelsToUpdate = this.reject(function(model) {
        // reject models don't support addFields
        if (!model.addFields) {
          return true;
        }
        // reject models that already have all the fields
        return _.all(fields, function(field) {
          return model.has(field);
        });
      });
      var deferreds = _.map(modelsToUpdate, function(model) {
        return model.addFields(fields);
      });
      return $.when(deferreds);
    }
  };
})();
