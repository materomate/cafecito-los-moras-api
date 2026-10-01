const catchAsync = require("../../src/utils/catchAsync");

describe("catchAsync", () => {
  test("llama a la función envuelta con (req, res, next)", async () => {
    const fn = jest.fn().mockResolvedValue(undefined);
    const req = {};
    const res = {};
    const next = jest.fn();

    await catchAsync(fn)(req, res, next);

    expect(fn).toHaveBeenCalledWith(req, res, next);
  });

  test("pasa el error a next() si la función envuelta rechaza", async () => {
    const error = new Error("boom");
    const fn = jest.fn().mockRejectedValue(error);
    const next = jest.fn();

    await catchAsync(fn)({}, {}, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  test("no llama a next si la función resuelve normalmente", async () => {
    const fn = jest.fn().mockResolvedValue(undefined);
    const next = jest.fn();

    await catchAsync(fn)({}, {}, next);

    expect(next).not.toHaveBeenCalled();
  });
});
