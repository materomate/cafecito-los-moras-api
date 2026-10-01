const ApiError = require("../utils/ApiError");

module.exports = function notFound(req, res, next) {
  next(new ApiError(404, `Ruta no encontrada: ${req.method} ${req.originalUrl}`));
};
