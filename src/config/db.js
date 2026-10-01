const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI no está definido en las variables de entorno");
  }

  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);

  console.log(`MongoDB conectado: ${mongoose.connection.host}/${mongoose.connection.name}`);
}

module.exports = connectDB;
