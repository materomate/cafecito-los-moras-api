const errorHandler = require("../../src/middleware/errorHandler");
const ApiError = require("../../src/utils/ApiError");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("errorHandler middleware", () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test("usa statusCode y message de un ApiError", () => {
    const res = mockRes();

    errorHandler(new ApiError(404, "Producto no encontrado"), {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Producto no encontrado" });
  });

  test("convierte ValidationError de Mongoose en 400 con mensajes unidos", () => {
    const err = {
      name: "ValidationError",
      errors: {
        nombre: { message: "El nombre es obligatorio" },
        precio: { message: "El precio no puede ser negativo" },
      },
    };
    const res = mockRes();

    errorHandler(err, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "El nombre es obligatorio. El precio no puede ser negativo",
    });
  });

  test("convierte CastError (id inválido) en 404", () => {
    const res = mockRes();

    errorHandler({ name: "CastError", message: "Cast to ObjectId failed" }, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Recurso no encontrado" });
  });

  test("convierte error de clave duplicada (code 11000) en 409", () => {
    const res = mockRes();

    errorHandler({ code: 11000, message: "duplicate key" }, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(409);
  });

  test("usa 500 por defecto para errores desconocidos y los loguea", () => {
    const res = mockRes();

    errorHandler(new Error("algo explotó"), {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "algo explotó" });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
