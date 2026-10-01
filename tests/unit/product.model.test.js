const Product = require("../../src/models/Product");

// Pruebas unitarias puras: validateSync() no toca la base de datos.
describe("Product model", () => {
  function buildValidData(overrides = {}) {
    return {
      nombre: "Café americano",
      descripcion: "Café negro 12oz",
      precio: 35,
      stock: 10,
      categoria: "Cafés",
      ...overrides,
    };
  }

  test("es válido con todos los campos requeridos", () => {
    const product = new Product(buildValidData());
    expect(product.validateSync()).toBeUndefined();
  });

  test("requiere nombre", () => {
    const err = new Product(buildValidData({ nombre: "" })).validateSync();
    expect(err.errors.nombre).toBeDefined();
  });

  test("requiere descripcion", () => {
    const err = new Product(buildValidData({ descripcion: undefined })).validateSync();
    expect(err.errors.descripcion).toBeDefined();
  });

  test("requiere categoria", () => {
    const err = new Product(buildValidData({ categoria: "" })).validateSync();
    expect(err.errors.categoria).toBeDefined();
  });

  test("rechaza precio negativo", () => {
    const err = new Product(buildValidData({ precio: -5 })).validateSync();
    expect(err.errors.precio).toBeDefined();
  });

  test("acepta precio 0", () => {
    const err = new Product(buildValidData({ precio: 0 })).validateSync();
    expect(err).toBeUndefined();
  });

  test("rechaza stock negativo", () => {
    const err = new Product(buildValidData({ stock: -1 })).validateSync();
    expect(err.errors.stock).toBeDefined();
  });

  test("rechaza stock no entero", () => {
    const err = new Product(buildValidData({ stock: 2.5 })).validateSync();
    expect(err.errors.stock).toBeDefined();
  });

  test("acepta stock 0 (producto sin existencias)", () => {
    const err = new Product(buildValidData({ stock: 0 })).validateSync();
    expect(err).toBeUndefined();
  });

  test("activo es true por defecto", () => {
    const product = new Product(buildValidData());
    expect(product.activo).toBe(true);
  });

  test("imagen es cadena vacía por defecto", () => {
    const product = new Product(buildValidData());
    expect(product.imagen).toBe("");
  });

  describe("virtual disponible", () => {
    test("es false si stock es 0, sin importar activo", () => {
      const product = new Product(buildValidData({ stock: 0, activo: true }));
      expect(product.disponible).toBe(false);
    });

    test("es false si activo es false, aunque haya stock", () => {
      const product = new Product(buildValidData({ stock: 5, activo: false }));
      expect(product.disponible).toBe(false);
    });

    test("es true si activo=true y stock>0", () => {
      const product = new Product(buildValidData({ stock: 5, activo: true }));
      expect(product.disponible).toBe(true);
    });
  });
});
