const Product = require("../models/Product");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");

const ALLOWED_FIELDS = ["nombre", "descripcion", "precio", "stock", "categoria", "imagen", "activo"];

function pickAllowedFields(body) {
  const data = {};
  for (const field of ALLOWED_FIELDS) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  return data;
}

// GET /api/products
// No hay separación de roles todavía (no hay autenticación), y el panel
// administrativo reutiliza este mismo endpoint para poder ver/reactivar
// productos inactivos y editar productos sin stock. Por eso se devuelven
// todos los productos por defecto; el frontend público decide cómo
// mostrarlos ("No disponible" si activo=false o stock=0).
// Se pueden filtrar explícitamente con ?categoria= y/o ?activo=true|false.
exports.getProducts = catchAsync(async (req, res) => {
  const filter = {};

  if (req.query.categoria) {
    filter.categoria = req.query.categoria;
  }

  if (req.query.activo !== undefined) {
    filter.activo = req.query.activo === "true";
  }

  const products = await Product.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, data: products });
});

// GET /api/products/:id
exports.getProduct = catchAsync(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, "Producto no encontrado");
  res.json({ success: true, data: product });
});

// POST /api/products
exports.createProduct = catchAsync(async (req, res) => {
  const data = pickAllowedFields(req.body);
  const product = await Product.create(data);
  res.status(201).json({ success: true, data: product });
});

// PUT /api/products/:id
exports.updateProduct = catchAsync(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, "Producto no encontrado");

  const data = pickAllowedFields(req.body);
  Object.assign(product, data);
  await product.save();

  res.json({ success: true, data: product });
});

// DELETE /api/products/:id
// No se elimina físicamente: se desactiva, ya que los pedidos existentes
// conservan una copia de nombre/precio pero referencian el producto por id.
exports.deleteProduct = catchAsync(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, "Producto no encontrado");

  product.activo = false;
  await product.save();

  res.json({ success: true, data: product, message: "Producto desactivado" });
});
