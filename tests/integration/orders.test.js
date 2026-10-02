const request = require("supertest");
const { connect, clearDatabase, closeDatabase } = require("../helpers/db");
const { createAdminAndToken } = require("../helpers/auth");

let app;
let Product;
let Order;
let adminToken;

beforeAll(async () => {
  await connect();
  app = require("../../src/app");
  Product = require("../../src/models/Product");
  Order = require("../../src/models/Order");
});

beforeEach(async () => {
  const { token } = await createAdminAndToken();
  adminToken = token;
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await closeDatabase();
});

describe("API de pedidos (integración, MongoDB real en memoria)", () => {
  function asAdmin(req) {
    return req.set("Authorization", `Bearer ${adminToken}`);
  }

  async function createProduct(overrides = {}) {
    return Product.create({
      nombre: "Café americano",
      descripcion: "Café negro 12oz",
      precio: 35,
      stock: 5,
      categoria: "Cafés",
      activo: true,
      ...overrides,
    });
  }

  function pedidoBase(overrides = {}) {
    return {
      cliente: { nombre: "Ana", telefono: "5551234567" },
      tipoEntrega: "recoger",
      ...overrides,
    };
  }

  test("crea un pedido calculando el total en el backend e ignorando el precio del cliente", async () => {
    const cafe = await createProduct({ precio: 40, stock: 5 });
    const pastel = await createProduct({ nombre: "Pastel", precio: 50, stock: 1 });

    const res = await request(app)
      .post("/api/orders")
      .send(
        pedidoBase({
          items: [
            { productoId: cafe._id.toString(), nombre: "precio falso", cantidad: 2, precioUnitario: 9999 },
            { productoId: pastel._id.toString(), cantidad: 1, precioUnitario: 1 },
          ],
          subtotal: 99999,
          total: 99999,
        })
      );

    expect(res.status).toBe(201);
    expect(res.body.data.total).toBe(40 * 2 + 50);
    expect(res.body.data.subtotal).toBe(40 * 2 + 50);
    expect(res.body.data.tipoEntrega).toBe("recoger");
    expect(res.body.data.productos.find((p) => p.nombre === "Café americano").precio).toBe(40);
  });

  test("descuenta el stock real en MongoDB al crear el pedido", async () => {
    const cafe = await createProduct({ precio: 40, stock: 5 });

    await request(app)
      .post("/api/orders")
      .send(pedidoBase({ items: [{ productoId: cafe._id.toString(), cantidad: 2 }] }))
      .expect(201);

    const updated = await Product.findById(cafe._id);
    expect(updated.stock).toBe(3);
  });

  test("suma cantidades si el mismo producto se envía repetido en items", async () => {
    const cafe = await createProduct({ stock: 5 });

    const res = await request(app)
      .post("/api/orders")
      .send(
        pedidoBase({
          items: [
            { productoId: cafe._id.toString(), cantidad: 1 },
            { productoId: cafe._id.toString(), cantidad: 2 },
          ],
        })
      );

    expect(res.status).toBe(201);
    expect(res.body.data.productos).toHaveLength(1);
    expect(res.body.data.productos[0].cantidad).toBe(3);

    const updated = await Product.findById(cafe._id);
    expect(updated.stock).toBe(2);
  });

  test("rechaza el pedido con 409 si no hay stock suficiente, sin dejar cambios parciales", async () => {
    const cafe = await createProduct({ precio: 40, stock: 5 });
    const pastel = await createProduct({ nombre: "Pastel", precio: 50, stock: 0 });

    const res = await request(app)
      .post("/api/orders")
      .send(
        pedidoBase({
          items: [
            { productoId: cafe._id.toString(), cantidad: 1 },
            { productoId: pastel._id.toString(), cantidad: 1 },
          ],
        })
      );

    expect(res.status).toBe(409);

    const cafeAfter = await Product.findById(cafe._id);
    expect(cafeAfter.stock).toBe(5);
    expect(await Order.countDocuments()).toBe(0);
  });

  test("rechaza pedir un producto inactivo con 404 y no descuenta stock de otros productos", async () => {
    const cafe = await createProduct({ stock: 5 });
    const inactivo = await createProduct({ nombre: "Descontinuado", activo: false, stock: 5 });

    const res = await request(app)
      .post("/api/orders")
      .send(
        pedidoBase({
          items: [
            { productoId: cafe._id.toString(), cantidad: 1 },
            { productoId: inactivo._id.toString(), cantidad: 1 },
          ],
        })
      );

    expect(res.status).toBe(404);
    const cafeAfter = await Product.findById(cafe._id);
    expect(cafeAfter.stock).toBe(5);
  });

  test("rechaza pedido a domicilio sin dirección con 400", async () => {
    const cafe = await createProduct();
    const res = await request(app)
      .post("/api/orders")
      .send(pedidoBase({ tipoEntrega: "domicilio", items: [{ productoId: cafe._id.toString(), cantidad: 1 }] }));

    expect(res.status).toBe(400);
  });

  test("acepta pedido a domicilio con dirección", async () => {
    const cafe = await createProduct({ stock: 5 });
    const res = await request(app)
      .post("/api/orders")
      .send(
        pedidoBase({
          tipoEntrega: "domicilio",
          direccion: "Av. Siempre Viva 123",
          items: [{ productoId: cafe._id.toString(), cantidad: 1 }],
        })
      );

    expect(res.status).toBe(201);
    expect(res.body.data.direccion).toBe("Av. Siempre Viva 123");
    expect(res.body.data.tipoEntrega).toBe("domicilio");
  });

  test("rechaza body sin cliente con 400", async () => {
    const cafe = await createProduct();
    const res = await request(app)
      .post("/api/orders")
      .send({ tipoEntrega: "recoger", items: [{ productoId: cafe._id.toString(), cantidad: 1 }] });

    expect(res.status).toBe(400);
  });

  test("rechaza producto inexistente con 404", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send(pedidoBase({ items: [{ productoId: "000000000000000000000000", cantidad: 1 }] }));

    expect(res.status).toBe(404);
  });

  test("GET /api/orders lista pedidos y admite filtro ?estado=", async () => {
    const cafe = await createProduct({ stock: 10 });
    await request(app)
      .post("/api/orders")
      .send(pedidoBase({ items: [{ productoId: cafe._id.toString(), cantidad: 1 }] }));

    const res = await asAdmin(request(app).get("/api/orders"));
    expect(res.body.data).toHaveLength(1);

    const filtered = await asAdmin(request(app).get("/api/orders?estado=cancelado"));
    expect(filtered.body.data).toHaveLength(0);
  });

  test("GET /api/orders sin token responde 401", async () => {
    const res = await request(app).get("/api/orders");
    expect(res.status).toBe(401);
  });

  test("GET /api/orders/:id devuelve el pedido creado", async () => {
    const cafe = await createProduct({ stock: 10 });
    const created = await request(app)
      .post("/api/orders")
      .send(pedidoBase({ items: [{ productoId: cafe._id.toString(), cantidad: 1 }] }));

    const res = await request(app).get(`/api/orders/${created.body.data._id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.cliente.nombre).toBe("Ana");
  });

  test("GET /api/orders/:id con id inexistente responde 404", async () => {
    const res = await request(app).get("/api/orders/000000000000000000000000");
    expect(res.status).toBe(404);
  });

  test("PUT /api/orders/:id/status actualiza el estado y lo persiste en MongoDB", async () => {
    const cafe = await createProduct({ stock: 10 });
    const created = await request(app)
      .post("/api/orders")
      .send(pedidoBase({ items: [{ productoId: cafe._id.toString(), cantidad: 1 }] }));

    const res = await asAdmin(request(app).put(`/api/orders/${created.body.data._id}/status`)).send({
      estado: "confirmado",
    });

    expect(res.status).toBe(200);
    expect(res.body.data.estado).toBe("confirmado");

    const stored = await Order.findById(created.body.data._id);
    expect(stored.estado).toBe("confirmado");
  });

  test("PUT /api/orders/:id/status sin token responde 401", async () => {
    const cafe = await createProduct({ stock: 10 });
    const created = await request(app)
      .post("/api/orders")
      .send(pedidoBase({ items: [{ productoId: cafe._id.toString(), cantidad: 1 }] }));

    const res = await request(app)
      .put(`/api/orders/${created.body.data._id}/status`)
      .send({ estado: "confirmado" });

    expect(res.status).toBe(401);
  });

  test("PUT /api/orders/:id/status con id inexistente responde 404", async () => {
    const res = await asAdmin(request(app).put("/api/orders/000000000000000000000000/status")).send({
      estado: "confirmado",
    });

    expect(res.status).toBe(404);
  });

  test("PUT /api/orders/:id/status rechaza un estado inválido con 400", async () => {
    const cafe = await createProduct({ stock: 10 });
    const created = await request(app)
      .post("/api/orders")
      .send(pedidoBase({ items: [{ productoId: cafe._id.toString(), cantidad: 1 }] }));

    const res = await asAdmin(request(app).put(`/api/orders/${created.body.data._id}/status`)).send({
      estado: "en-la-luna",
    });

    expect(res.status).toBe(400);
  });
});
