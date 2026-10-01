// Middleware centralizado de errores. Siempre responde con { success: false, message }.
module.exports = function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  let statusCode = err.statusCode || 500;
  let message = err.message || "Error interno del servidor";

  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(". ");
  } else if (err.name === "CastError") {
    statusCode = 404;
    message = "Recurso no encontrado";
  } else if (err.code === 11000) {
    statusCode = 409;
    message = "Ya existe un recurso con esos datos";
  }

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
};
