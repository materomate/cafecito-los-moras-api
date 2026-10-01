require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Servidor de Cafecito Los Moras escuchando en el puerto ${PORT}`);
    });
  } catch (err) {
    console.error("No se pudo iniciar el servidor:", err.message);
    process.exit(1);
  }
}

start();
