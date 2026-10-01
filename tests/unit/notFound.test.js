const notFound = require("../../src/middleware/notFound");
const ApiError = require("../../src/utils/ApiError");

describe("notFound middleware", () => {
  test("llama a next() con un ApiError 404 describiendo la ruta", () => {
    const next = jest.fn();
    const req = { method: "GET", originalUrl: "/api/algo-que-no-existe" };

    notFound(req, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(ApiError);
    expect(err.statusCode).toBe(404);
    expect(err.message).toContain("GET /api/algo-que-no-existe");
  });
});
