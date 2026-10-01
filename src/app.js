const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// En producción solo se permite el/los origen(es) configurados en
// FRONTEND_URL (separados por coma si hay varios). En desarrollo, si no
// se define, se permite el puerto por defecto de Vite.
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("No permitido por la política de CORS"));
      }
    },
  })
);

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ success: true, data: { status: "ok" } });
});

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
