const request = require("supertest");
const app = require("../../src/app");

describe("app (rutas generales)", () => {
  test("GET /api/health responde ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { status: "ok" } });
  });

  test("una ruta no definida responde 404 con el formato de error consistente", async () => {
    const res = await request(app).get("/api/no-existe");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(typeof res.body.message).toBe("string");
  });

  test("rechaza peticiones desde un origen no permitido por CORS", async () => {
    // El rechazo de CORS se propaga como error 500 genérico; se silencia el
    // console.error esperado del errorHandler para no ensuciar la salida de pruebas.
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const res = await request(app).get("/api/health").set("Origin", "http://sitio-no-permitido.com");
    expect(res.status).toBe(500);

    consoleErrorSpy.mockRestore();
  });

  test("permite peticiones desde el origen configurado en FRONTEND_URL", async () => {
    const res = await request(app).get("/api/health").set("Origin", "http://localhost:5173");
    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });
});
