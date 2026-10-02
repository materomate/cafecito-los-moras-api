const User = require("../../src/models/User");

// Pruebas unitarias puras: validateSync() no toca la base de datos ni ejecuta el hook de hash.
describe("User model", () => {
  function buildValidData(overrides = {}) {
    return {
      nombre: "Ana",
      email: "ana@test.com",
      password: "secreto123",
      ...overrides,
    };
  }

  test("es válido con todos los campos requeridos", () => {
    const user = new User(buildValidData());
    expect(user.validateSync()).toBeUndefined();
  });

  test("requiere nombre", () => {
    const err = new User(buildValidData({ nombre: "" })).validateSync();
    expect(err.errors.nombre).toBeDefined();
  });

  test("requiere email", () => {
    const err = new User(buildValidData({ email: "" })).validateSync();
    expect(err.errors.email).toBeDefined();
  });

  test("rechaza un email con formato inválido", () => {
    const err = new User(buildValidData({ email: "no-es-un-correo" })).validateSync();
    expect(err.errors.email).toBeDefined();
  });

  test("requiere password", () => {
    const err = new User(buildValidData({ password: "" })).validateSync();
    expect(err.errors.password).toBeDefined();
  });

  test("rechaza password de menos de 6 caracteres", () => {
    const err = new User(buildValidData({ password: "123" })).validateSync();
    expect(err.errors.password).toBeDefined();
  });

  test("rol es 'cliente' por defecto", () => {
    const user = new User(buildValidData());
    expect(user.rol).toBe("cliente");
  });

  test("rechaza un rol fuera del enum", () => {
    const err = new User(buildValidData({ rol: "superadmin" })).validateSync();
    expect(err.errors.rol).toBeDefined();
  });

  test("acepta rol 'admin'", () => {
    const err = new User(buildValidData({ rol: "admin" })).validateSync();
    expect(err).toBeUndefined();
  });

  test("toJSON nunca expone el password", () => {
    const user = new User(buildValidData());
    user.password = "hash-simulado";
    expect(user.toJSON().password).toBeUndefined();
  });
});
