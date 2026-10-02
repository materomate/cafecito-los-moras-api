const User = require("../../src/models/User");
const { signToken } = require("../../src/utils/token");

async function createAdminAndToken(overrides = {}) {
  const user = await User.create({
    nombre: "Admin",
    email: "admin@test.com",
    password: "admin1234",
    rol: "admin",
    ...overrides,
  });
  return { user, token: signToken(user) };
}

async function createClienteAndToken(overrides = {}) {
  const user = await User.create({
    nombre: "Cliente",
    email: "cliente@test.com",
    password: "cliente1234",
    rol: "cliente",
    ...overrides,
  });
  return { user, token: signToken(user) };
}

module.exports = { createAdminAndToken, createClienteAndToken };
