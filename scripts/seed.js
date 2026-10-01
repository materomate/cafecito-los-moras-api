require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
const Product = require("../src/models/Product");

const products = [
  {
    nombre: "Café americano",
    descripcion: "Café negro recién preparado, 12oz.",
    precio: 35,
    stock: 50,
    categoria: "Cafés",
    imagen: "",
    activo: true,
  },
  {
    nombre: "Capuchino",
    descripcion: "Espresso con leche vaporizada y espuma.",
    precio: 45,
    stock: 30,
    categoria: "Cafés",
    imagen: "",
    activo: true,
  },
  {
    nombre: "Frappé de vainilla",
    descripcion: "Bebida fría a base de café y vainilla.",
    precio: 55,
    stock: 20,
    categoria: "Bebidas frías",
    imagen: "",
    activo: true,
  },
  {
    nombre: "Chilaquiles verdes",
    descripcion: "Con pollo, crema y queso fresco.",
    precio: 85,
    stock: 15,
    categoria: "Desayunos",
    imagen: "",
    activo: true,
  },
  {
    nombre: "Pastel de chocolate",
    descripcion: "Rebanada de pastel húmedo de chocolate.",
    precio: 40,
    stock: 0,
    categoria: "Postres",
    imagen: "",
    activo: true,
  },
];

async function seed() {
  await connectDB();
  await Product.deleteMany({});
  await Product.insertMany(products);
  console.log(`${products.length} productos insertados.`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Error al poblar la base de datos:", err.message);
  process.exit(1);
});
