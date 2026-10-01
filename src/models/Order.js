const mongoose = require("mongoose");

const ESTADOS = ["pendiente", "confirmado", "preparando", "listo", "entregado", "cancelado"];
const TIPOS_PEDIDO = ["recoger", "domicilio"];

const orderItemSchema = new mongoose.Schema(
  {
    producto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    nombre: {
      type: String,
      required: true,
    },
    precio: {
      type: Number,
      required: true,
      min: 0,
    },
    cantidad: {
      type: Number,
      required: true,
      min: [1, "La cantidad debe ser al menos 1"],
      validate: {
        validator: Number.isInteger,
        message: "La cantidad debe ser un número entero",
      },
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    cliente: {
      nombre: { type: String, required: [true, "El nombre del cliente es obligatorio"], trim: true },
      telefono: { type: String, required: [true, "El teléfono del cliente es obligatorio"], trim: true },
    },
    productos: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "El pedido debe tener al menos un producto",
      },
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    tipoPedido: {
      type: String,
      required: [true, "El tipo de pedido es obligatorio"],
      enum: { values: TIPOS_PEDIDO, message: "Tipo de pedido inválido" },
    },
    direccion: {
      type: String,
      default: "",
      trim: true,
    },
    estado: {
      type: String,
      enum: { values: ESTADOS, message: "Estado de pedido inválido" },
      default: "pendiente",
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        // Alias para compatibilidad con el frontend (envía/lee "tipoEntrega").
        ret.tipoEntrega = ret.tipoPedido;
        return ret;
      },
    },
  }
);

orderSchema.statics.ESTADOS = ESTADOS;
orderSchema.statics.TIPOS_PEDIDO = TIPOS_PEDIDO;

module.exports = mongoose.model("Order", orderSchema);
