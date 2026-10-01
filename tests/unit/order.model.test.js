const mongoose = require("mongoose");
const Order = require("../../src/models/Order");

// Pruebas unitarias puras: validateSync() no toca la base de datos.
describe("Order model", () => {
  function buildValidData(overrides = {}) {
    return {
      cliente: { nombre: "Ana", telefono: "5551234567" },
      productos: [{ producto: new mongoose.Types.ObjectId(), nombre: "Café", precio: 35, cantidad: 2 }],
      subtotal: 70,
      total: 70,
      tipoPedido: "recoger",
      ...overrides,
    };
  }

  test("es válido con datos correctos", () => {
    expect(new Order(buildValidData()).validateSync()).toBeUndefined();
  });

  test("requiere nombre del cliente", () => {
    const err = new Order(buildValidData({ cliente: { telefono: "555" } })).validateSync();
    expect(err.errors["cliente.nombre"]).toBeDefined();
  });

  test("requiere teléfono del cliente", () => {
    const err = new Order(buildValidData({ cliente: { nombre: "Ana" } })).validateSync();
    expect(err.errors["cliente.telefono"]).toBeDefined();
  });

  test("rechaza tipoPedido inválido", () => {
    const err = new Order(buildValidData({ tipoPedido: "avion" })).validateSync();
    expect(err.errors.tipoPedido).toBeDefined();
  });

  test("acepta 'recoger' y 'domicilio' como tipoPedido", () => {
    expect(new Order(buildValidData({ tipoPedido: "recoger" })).validateSync()).toBeUndefined();
    expect(new Order(buildValidData({ tipoPedido: "domicilio" })).validateSync()).toBeUndefined();
  });

  test("rechaza productos vacío", () => {
    const err = new Order(buildValidData({ productos: [] })).validateSync();
    expect(err.errors.productos).toBeDefined();
  });

  test("rechaza cantidad menor a 1", () => {
    const err = new Order(
      buildValidData({
        productos: [{ producto: new mongoose.Types.ObjectId(), nombre: "Café", precio: 35, cantidad: 0 }],
      })
    ).validateSync();
    expect(err.errors["productos.0.cantidad"]).toBeDefined();
  });

  test("rechaza cantidad no entera", () => {
    const err = new Order(
      buildValidData({
        productos: [{ producto: new mongoose.Types.ObjectId(), nombre: "Café", precio: 35, cantidad: 1.5 }],
      })
    ).validateSync();
    expect(err.errors["productos.0.cantidad"]).toBeDefined();
  });

  test("rechaza estado inválido", () => {
    const err = new Order(buildValidData({ estado: "volando" })).validateSync();
    expect(err.errors.estado).toBeDefined();
  });

  test("estado por defecto es 'pendiente'", () => {
    expect(new Order(buildValidData()).estado).toBe("pendiente");
  });

  test("toJSON agrega el alias tipoEntrega igual a tipoPedido", () => {
    const order = new Order(buildValidData({ tipoPedido: "domicilio", direccion: "Calle 1" }));
    expect(order.toJSON().tipoEntrega).toBe("domicilio");
  });

  test("expone las listas ESTADOS y TIPOS_PEDIDO permitidos", () => {
    expect(Order.ESTADOS).toEqual([
      "pendiente",
      "confirmado",
      "preparando",
      "listo",
      "entregado",
      "cancelado",
    ]);
    expect(Order.TIPOS_PEDIDO).toEqual(["recoger", "domicilio"]);
  });
});
