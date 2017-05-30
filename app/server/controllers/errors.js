'use strict';

var errors = {
  404: function (req, res) {
    var viewFilePath = '404';
    var statusCode = 404;
    var result = {
      status: statusCode
    };

    res.status(result.status);
    res.render(viewFilePath, function (err) {
      if (err) return res.status(statusCode).json(result);
      res.render(viewFilePath);
    });  
  }
};

module.exports = errors;