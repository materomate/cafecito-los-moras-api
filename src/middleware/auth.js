const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");

// Verifica el Bearer token y adjunta el usuario autenticado a req.user.
exports.protect = catchAsync(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    throw new ApiError(401, "Debes iniciar sesión para acceder a este recurso");
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new ApiError(401, "Sesión inválida o expirada, inicia sesión de nuevo");
  }

  const user = await User.findById(payload.id);
  if (!user) {
    throw new ApiError(401, "El usuario de esta sesión ya no existe");
  }

  req.user = user;
  next();
});

// Restringe el acceso a los roles indicados. Debe usarse después de `protect`.
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.rol)) {
      throw new ApiError(403, "No tienes permiso para realizar esta acción");
    }
    next();
  };
};
