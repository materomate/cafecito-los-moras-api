const request = require("supertest");
const mongoose = require("mongoose");
const { connect, clearDatabase, closeDatabase } = require("../helpers/db");

let app;
let Product;

beforeAll(async () => {
  await connect();
  app = require("../../src/app");
  Product = require("../../src/models/Product");
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await closeDatabase();
});

describe("API de productos (integración, MongoDB real en memoria)", () => {
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

  test("POST /api/products crea un producto válido y lo persiste en MongoDB", async () => {
    const res = await request(app).post("/api/products").send({
      nombre: "Capuchino",
      descripcion: "Espresso con leche",
      precio: 45,
      stock: 10,
      categoria: "Cafés",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.nombre).toBe("Capuchino");

    const stored = await Product.findById(res.body.data._id);
    expect(stored).not.toBeNull();
    expect(stored.stock).toBe(10);
  });

  test("POST /api/products rechaza datos inválidos con 400 y no crea nada", async () => {
    const res = await request(app).post("/api/products").send({ nombre: "Sin nada más" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(await Product.countDocuments()).toBe(0);
  });

  test("POST /api/products ignora campos no permitidos (p. ej. _id)", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .post("/api/products")
      .send({
        _id: fakeId,
        nombre: "Té",
        descripcion: "Té negro",
        precio: 20,
        stock: 5,
        categoria: "Bebidas frías",
      });

    expect(res.status).toBe(201);
    expect(res.body.data._id).not.toBe(fakeId);
  });

  test("GET /api/products lista todos los productos (activos e inactivos)", async () => {
    await createProduct({ nombre: "A" });
    await createProduct({ nombre: "B", activo: false });

    const res = await request(app).get("/api/products");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  test("GET /api/products?categoria= filtra por categoría", async () => {
    await createProduct({ nombre: "Café", categoria: "Cafés" });
    await createProduct({ nombre: "Pastel", categoria: "Postres" });

    const res = await request(app).get("/api/products?categoria=Postres");
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].nombre).toBe("Pastel");
  });

  test("GET /api/products?activo=false filtra solo inactivos", async () => {
    await createProduct({ nombre: "A", activo: true });
    await createProduct({ nombre: "B", activo: false });

    const res = await request(app).get("/api/products?activo=false");
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].nombre).toBe("B");
  });

  test("GET /api/products/:id devuelve el producto correcto", async () => {
    const product = await createProduct();
    const res = await request(app).get(`/api/products/${product._id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.nombre).toBe("Café americano");
  });

  test("GET /api/products/:id con id inexistente responde 404", async () => {
    const res = await request(app).get(`/api/products/${new mongoose.Types.ObjectId()}`);
    expect(res.status).toBe(404);
  });

  test("GET /api/products/:id con id malformado responde 404 (no 500)", async () => {
    const res = await request(app).get("/api/products/no-es-un-id-valido");
    expect(res.status).toBe(404);
  });

  test("PUT /api/products/:id actualiza solo los campos enviados", async () => {
    const product = await createProduct();
    const res = await request(app).put(`/api/products/${product._id}`).send({ precio: 50 });

    expect(res.status).toBe(200);
    expect(res.body.data.precio).toBe(50);
    expect(res.body.data.nombre).toBe("Café americano");

    const stored = await Product.findById(product._id);
    expect(stored.precio).toBe(50);
  });

  test("PUT /api/products/:id con id inexistente responde 404", async () => {
    const res = await request(app)
      .put(`/api/products/${new mongoose.Types.ObjectId()}`)
      .send({ precio: 10 });
    expect(res.status).toBe(404);
  });

  test("DELETE /api/products/:id desactiva en vez de borrar el documento", async () => {
    const product = await createProduct();
    const res = await request(app).delete(`/api/products/${product._id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.activo).toBe(false);

    const stillExists = await Product.findById(product._id);
    expect(stillExists).not.toBeNull();
    expect(stillExists.activo).toBe(false);
  });

  test("DELETE /api/products/:id con id inexistente responde 404", async () => {
    const res = await request(app).delete(`/api/products/${new mongoose.Types.ObjectId()}`);
    expect(res.status).toBe(404);
  });
});
