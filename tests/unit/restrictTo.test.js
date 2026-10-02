const { restrictTo } = require("../../src/middleware/auth");
const ApiError = require("../../src/utils/ApiError");

describe("restrictTo middleware", () => {
  test("permite continuar si req.user tiene uno de los roles permitidos", () => {
    const next = jest.fn();
    const req = { user: { rol: "admin" } };

    restrictTo("admin")(req, {}, next);

    expect(next).toHaveBeenCalledWith();
  });

  test("lanza ApiError 403 si el rol de req.user no está permitido", () => {
    const req = { user: { rol: "cliente" } };

    expect(() => restrictTo("admin")(req, {}, jest.fn())).toThrow(ApiError);
    try {
      restrictTo("admin")(req, {}, jest.fn());
    } catch (err) {
      expect(err.statusCode).toBe(403);
    }
  });

  test("lanza ApiError 403 si no hay req.user", () => {
    const req = {};
    expect(() => restrictTo("admin")(req, {}, jest.fn())).toThrow(ApiError);
  });
});
