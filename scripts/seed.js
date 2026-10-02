require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
const Product = require("../src/models/Product");
const User = require("../src/models/User");

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

const ADMIN_EMAIL = "admin@cafecitolosmoras.com";
const ADMIN_PASSWORD = "admin1234";

async function seed() {
  await connectDB();
  await Product.deleteMany({});
  await Product.insertMany(products);
  console.log(`${products.length} productos insertados.`);

  const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });
  if (!existingAdmin) {
    await User.create({
      nombre: "Administrador",
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      rol: "admin",
    });
    console.log(`Usuario admin creado -> correo: ${ADMIN_EMAIL} / contraseña: ${ADMIN_PASSWORD}`);
  } else {
    console.log("El usuario admin ya existía, no se modificó.");
  }

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Error al poblar la base de datos:", err.message);
  process.exit(1);
});
