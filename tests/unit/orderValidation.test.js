const mongoose = require("mongoose");
const { validateAndNormalizeInput } = require("../../src/controllers/orderController");

// Prueba unitaria de la lógica de validación pura de pedidos: no toca la
// base de datos (la resolución de precios/stock contra Mongo se prueba en
// tests/integration/orders.test.js).
describe("validateAndNormalizeInput", () => {
  const productoId = new mongoose.Types.ObjectId().toString();

  function buildValidBody(overrides = {}) {
    return {
      cliente: { nombre: "Ana", telefono: "5551234567" },
      tipoEntrega: "recoger",
      items: [{ productoId, cantidad: 2 }],
      ...overrides,
    };
  }

  test("acepta un body válido y normaliza tipoEntrega -> tipoPedido", () => {
    const result = validateAndNormalizeInput(buildValidBody());
    expect(result.tipoPedido).toBe("recoger");
    expect(result.cliente).toEqual({ nombre: "Ana", telefono: "5551234567" });
    expect(result.cantidadPorProducto.get(productoId)).toBe(2);
  });

  test("acepta también los nombres de campo del spec (tipoPedido/productos/producto)", () => {
    const result = validateAndNormalizeInput({
      cliente: { nombre: "Ana", telefono: "555" },
      tipoPedido: "domicilio",
      direccion: "Calle 1",
      productos: [{ producto: productoId, cantidad: 1 }],
    });
    expect(result.tipoPedido).toBe("domicilio");
    expect(result.direccion).toBe("Calle 1");
    expect(result.cantidadPorProducto.get(productoId)).toBe(1);
  });

  test("recorta espacios en nombre y teléfono del cliente", () => {
    const result = validateAndNormalizeInput(
      buildValidBody({ cliente: { nombre: "  Ana  ", telefono: " 555 " } })
    );
    expect(result.cliente).toEqual({ nombre: "Ana", telefono: "555" });
  });

  test("rechaza si falta el nombre del cliente", () => {
    expect(() => validateAndNormalizeInput(buildValidBody({ cliente: { telefono: "555" } }))).toThrow(
      /nombre y el teléfono/
    );
  });

  test("rechaza si falta el teléfono del cliente", () => {
    expect(() => validateAndNormalizeInput(buildValidBody({ cliente: { nombre: "Ana" } }))).toThrow(
      /nombre y el teléfono/
    );
  });

  test("rechaza tipoEntrega inválido", () => {
    expect(() => validateAndNormalizeInput(buildValidBody({ tipoEntrega: "teletransporte" }))).toThrow(
      /Tipo de pedido inválido/
    );
  });

  test("rechaza domicilio sin dirección", () => {
    expect(() =>
      validateAndNormalizeInput(buildValidBody({ tipoEntrega: "domicilio", direccion: "" }))
    ).toThrow(/dirección es obligatoria/);
  });

  test("acepta domicilio con dirección y la recorta", () => {
    const result = validateAndNormalizeInput(
      buildValidBody({ tipoEntrega: "domicilio", direccion: "  Av. Siempre Viva 123  " })
    );
    expect(result.direccion).toBe("Av. Siempre Viva 123");
  });

  test("ignora la dirección si el pedido es para recoger", () => {
    const result = validateAndNormalizeInput(buildValidBody({ direccion: "Calle que no aplica" }));
    expect(result.direccion).toBe("");
  });

  test("rechaza items vacío", () => {
    expect(() => validateAndNormalizeInput(buildValidBody({ items: [] }))).toThrow(
      /al menos un producto/
    );
  });

  test("rechaza si no se envía items ni productos", () => {
    const body = buildValidBody();
    delete body.items;
    expect(() => validateAndNormalizeInput(body)).toThrow(/al menos un producto/);
  });

  test("rechaza id de producto inválido", () => {
    expect(() =>
      validateAndNormalizeInput(buildValidBody({ items: [{ productoId: "no-es-un-id", cantidad: 1 }] }))
    ).toThrow(/inválido/);
  });

  test("rechaza cantidad <= 0", () => {
    expect(() =>
      validateAndNormalizeInput(buildValidBody({ items: [{ productoId, cantidad: 0 }] }))
    ).toThrow(/cantidad/);
  });

  test("rechaza cantidad no entera", () => {
    expect(() =>
      validateAndNormalizeInput(buildValidBody({ items: [{ productoId, cantidad: 1.5 }] }))
    ).toThrow(/cantidad/);
  });

  test("suma las cantidades si el mismo producto aparece repetido", () => {
    const result = validateAndNormalizeInput(
      buildValidBody({
        items: [
          { productoId, cantidad: 2 },
          { productoId, cantidad: 3 },
        ],
      })
    );
    expect(result.cantidadPorProducto.get(productoId)).toBe(5);
  });

  test("no propaga precio/nombre enviados por el cliente (se resuelven después contra la DB)", () => {
    const result = validateAndNormalizeInput(
      buildValidBody({ items: [{ productoId, cantidad: 1, nombre: "otro", precioUnitario: 99999 }] })
    );
    expect([...result.cantidadPorProducto.entries()]).toEqual([[productoId, 1]]);
  });
});
