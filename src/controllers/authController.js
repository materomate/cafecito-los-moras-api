const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");
const { signToken } = require("../utils/token");

// POST /api/auth/register
// Siempre crea cuentas con rol "cliente": el rol "admin" no puede
// auto-asignarse desde el registro público (se otorga aparte, ver README).
exports.register = catchAsync(async (req, res) => {
  const { nombre, email, password } = req.body;

  if (!nombre || !email || !password) {
    throw new ApiError(400, "Nombre, correo y contraseña son obligatorios");
  }

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    throw new ApiError(409, "Ya existe una cuenta con ese correo");
  }

  const user = await User.create({ nombre, email, password, rol: "cliente" });
  const token = signToken(user);

  res.status(201).json({ success: true, data: { user, token } });
});

// POST /api/auth/login
exports.login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Correo y contraseña son obligatorios");
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, "Correo o contraseña incorrectos");
  }

  const token = signToken(user);
  const safeUser = user.toJSON();

  res.json({ success: true, data: { user: safeUser, token } });
});

// GET /api/auth/me
exports.getMe = catchAsync(async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});
