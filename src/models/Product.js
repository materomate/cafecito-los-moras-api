const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "El nombre es obligatorio"],
      trim: true,
    },
    descripcion: {
      type: String,
      required: [true, "La descripción es obligatoria"],
      trim: true,
    },
    precio: {
      type: Number,
      required: [true, "El precio es obligatorio"],
      min: [0, "El precio no puede ser negativo"],
    },
    stock: {
      type: Number,
      required: [true, "El stock es obligatorio"],
      min: [0, "El stock no puede ser negativo"],
      validate: {
        validator: Number.isInteger,
        message: "El stock debe ser un número entero",
      },
      default: 0,
    },
    categoria: {
      type: String,
      required: [true, "La categoría es obligatoria"],
      trim: true,
    },
    imagen: {
      type: String,
      default: "",
      trim: true,
    },
    activo: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Un producto sin stock nunca se considera disponible, sin importar `activo`.
productSchema.virtual("disponible").get(function disponible() {
  return this.activo && this.stock > 0;
});

module.exports = mongoose.model("Product", productSchema);
