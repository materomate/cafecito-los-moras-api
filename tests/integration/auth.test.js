const request = require("supertest");
const { connect, clearDatabase, closeDatabase } = require("../helpers/db");
const { createAdminAndToken } = require("../helpers/auth");

let app;
let User;

beforeAll(async () => {
  await connect();
  app = require("../../src/app");
  User = require("../../src/models/User");
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await closeDatabase();
});

describe("API de autenticación (integración, MongoDB real en memoria)", () => {
  function credentials(overrides = {}) {
    return {
      nombre: "Ana",
      email: "ana@test.com",
      password: "secreto123",
      ...overrides,
    };
  }

  test("POST /api/auth/register crea una cuenta como cliente y devuelve token", async () => {
    const res = await request(app).post("/api/auth/register").send(credentials());

    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe("ana@test.com");
    expect(res.body.data.user.rol).toBe("cliente");
    expect(res.body.data.user.password).toBeUndefined();
    expect(typeof res.body.data.token).toBe("string");
  });

  test("POST /api/auth/register ignora un rol enviado por el cliente (siempre crea 'cliente')", async () => {
    const res = await request(app).post("/api/auth/register").send(credentials({ rol: "admin" }));
    expect(res.status).toBe(201);
    expect(res.body.data.user.rol).toBe("cliente");
  });

  test("POST /api/auth/register rechaza correo duplicado con 409", async () => {
    await request(app).post("/api/auth/register").send(credentials());
    const res = await request(app).post("/api/auth/register").send(credentials());
    expect(res.status).toBe(409);
  });

  test("POST /api/auth/register rechaza datos incompletos con 400", async () => {
    const res = await request(app).post("/api/auth/register").send({ email: "ana@test.com" });
    expect(res.status).toBe(400);
  });

  test("POST /api/auth/login responde con token para credenciales correctas", async () => {
    await request(app).post("/api/auth/register").send(credentials());

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ana@test.com", password: "secreto123" });

    expect(res.status).toBe(200);
    expect(typeof res.body.data.token).toBe("string");
    expect(res.body.data.user.email).toBe("ana@test.com");
  });

  test("POST /api/auth/login rechaza contraseña incorrecta con 401", async () => {
    await request(app).post("/api/auth/register").send(credentials());

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ana@test.com", password: "incorrecta" });

    expect(res.status).toBe(401);
  });

  test("POST /api/auth/login rechaza correo inexistente con 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "no-existe@test.com", password: "secreto123" });

    expect(res.status).toBe(401);
  });

  test("GET /api/auth/me devuelve el usuario autenticado a partir del token", async () => {
    const register = await request(app).post("/api/auth/register").send(credentials());
    const token = register.body.data.token;

    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe("ana@test.com");
  });

  test("GET /api/auth/me sin token responde 401", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  test("GET /api/auth/me con token inválido responde 401", async () => {
    const res = await request(app).get("/api/auth/me").set("Authorization", "Bearer token-invalido");
    expect(res.status).toBe(401);
  });

  test("GET /api/auth/me con usuario eliminado responde 401", async () => {
    const { user, token } = await createAdminAndToken();
    await User.findByIdAndDelete(user._id);

    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
  });
});
