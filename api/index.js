const app = require("../src/app");
const connectDB = require("../src/config/db");

connectDB().catch((err) => {
  console.error("No se pudo conectar a MongoDB:", err.message);
});

module.exports = app;
