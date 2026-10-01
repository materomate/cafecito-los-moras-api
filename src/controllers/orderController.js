const mongoose = require("mongoose");
const Product = require("../models/Product");
const Order = require("../models/Order");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");

const TIPOS_PEDIDO = Order.TIPOS_PEDIDO;
const ESTADOS = Order.ESTADOS;

function validateAndNormalizeInput(body) {
  const cliente = body.cliente || {};
  const nombreCliente = typeof cliente.nombre === "string" ? cliente.nombre.trim() : "";
  const telefonoCliente = typeof cliente.telefono === "string" ? cliente.telefono.trim() : "";

  if (!nombreCliente || !telefonoCliente) {
    throw new ApiError(400, "El nombre y el teléfono del cliente son obligatorios");
  }

  // El frontend envía "tipoEntrega"; el modelo lo guarda como "tipoPedido".
  const tipoPedido = body.tipoPedido ?? body.tipoEntrega;
  if (!TIPOS_PEDIDO.includes(tipoPedido)) {
    throw new ApiError(400, `Tipo de pedido inválido. Debe ser: ${TIPOS_PEDIDO.join(" o ")}`);
  }

  const direccion = typeof body.direccion === "string" ? body.direccion.trim() : "";
  if (tipoPedido === "domicilio" && !direccion) {
    throw new ApiError(400, "La dirección es obligatoria para pedidos a domicilio");
  }

  // El frontend envía "items"; se admite también "productos" (nombre del modelo).
  const rawItems = body.items ?? body.productos;
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new ApiError(400, "El pedido debe incluir al menos un producto");
  }

  const parsedItems = rawItems.map((item) => {
    const productoId = item.productoId ?? item.producto;
    const cantidad = Number(item.cantidad);

    if (!productoId || !mongoose.isValidObjectId(productoId)) {
      throw new ApiError(400, "Uno de los productos del pedido es inválido");
    }
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      throw new ApiError(400, "La cantidad de cada producto debe ser un entero mayor a 0");
    }

    return { productoId: String(productoId), cantidad };
  });

  // Si el mismo producto aparece más de una vez, se suman las cantidades.
  const cantidadPorProducto = new Map();
  for (const item of parsedItems) {
    cantidadPorProducto.set(
      item.productoId,
      (cantidadPorProducto.get(item.productoId) || 0) + item.cantidad
    );
  }

  return {
    cliente: { nombre: nombreCliente, telefono: telefonoCliente },
    tipoPedido,
    direccion: tipoPedido === "domicilio" ? direccion : "",
    cantidadPorProducto,
  };
}

// Exportada para poder probarla de forma aislada (no toca la base de datos).
exports.validateAndNormalizeInput = validateAndNormalizeInput;

// POST /api/orders
// Nunca confía en precios/nombres enviados por el cliente: siempre se
// resuelven contra MongoDB. El stock se descuenta de forma atómica por
// producto (findOneAndUpdate con condición de stock suficiente) para evitar
// condiciones de carrera sin depender de transacciones multi-documento
// (que requieren un replica set). Si algo falla a mitad de camino, se
// revierte el stock ya descontado para no dejar una operación parcial.
exports.createOrder = catchAsync(async (req, res) => {
  const { cliente, tipoPedido, direccion, cantidadPorProducto } = validateAndNormalizeInput(req.body);

  const decremented = [];
  const orderItems = [];

  try {
    for (const [productoId, cantidad] of cantidadPorProducto) {
      const product = await Product.findById(productoId);
      if (!product || !product.activo) {
        throw new ApiError(404, `Producto no disponible: ${product ? product.nombre : productoId}`);
      }

      const updatedProduct = await Product.findOneAndUpdate(
        { _id: productoId, activo: true, stock: { $gte: cantidad } },
        { $inc: { stock: -cantidad } },
        { new: true }
      );

      if (!updatedProduct) {
        throw new ApiError(409, `Stock insuficiente para "${product.nombre}"`);
      }

      decremented.push({ productoId, cantidad });
      orderItems.push({
        producto: product._id,
        nombre: product.nombre,
        precio: product.precio,
        cantidad,
      });
    }

    const subtotal = orderItems.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
    const total = subtotal;

    const order = await Order.create({
      cliente,
      productos: orderItems,
      subtotal,
      total,
      tipoPedido,
      direccion,
      estado: "pendiente",
    });

    res.status(201).json({ success: true, data: order });
  } catch (err) {
    for (const item of decremented) {
      await Product.updateOne({ _id: item.productoId }, { $inc: { stock: item.cantidad } });
    }
    throw err;
  }
});

// GET /api/orders
exports.getOrders = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.estado) filter.estado = req.query.estado;

  const orders = await Order.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, data: orders });
});

// GET /api/orders/:id
exports.getOrder = catchAsync(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, "Pedido no encontrado");
  res.json({ success: true, data: order });
});

// PUT /api/orders/:id/status
exports.updateOrderStatus = catchAsync(async (req, res) => {
  const { estado } = req.body;

  if (!ESTADOS.includes(estado)) {
    throw new ApiError(400, `Estado inválido. Debe ser uno de: ${ESTADOS.join(", ")}`);
  }

  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, "Pedido no encontrado");

  order.estado = estado;
  await order.save();

  res.json({ success: true, data: order });
});
