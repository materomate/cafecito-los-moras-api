# Cafecito Los Moras — Backend

API REST en Node.js + Express + MongoDB (Mongoose) para Cafecito Los Moras: productos, categorías, stock y pedidos.

## Estructura

```text
cafeteria-api/
├── src/
│   ├── config/db.js              # Conexión a MongoDB
│   ├── controllers/              # Lógica de productos y pedidos
│   ├── middleware/                # notFound + errorHandler centralizado
│   ├── models/                   # Schemas de Mongoose (Product, Order)
│   ├── routes/                   # Definición de endpoints REST
│   ├── utils/                    # ApiError, catchAsync
│   └── app.js / server.js
├── scripts/
│   └── seed.js                   # Carga productos de ejemplo
├── tests/
│   ├── unit/                     # Modelos, middleware y validación (sin DB)
│   ├── integration/               # Endpoints HTTP contra MongoDB real en memoria
│   └── helpers/db.js             # Arranca/limpia/detiene mongodb-memory-server
├── jest.config.js
├── .env / .env.example
└── package.json
```

## Instalación

```bash
cd cafeteria-api
npm install
```

## Variables de entorno

Copia `.env.example` a `.env` y ajusta según tu entorno (nunca subas `.env` a git; ya está en `.gitignore`):

```env
MONGODB_URI=mongodb://127.0.0.1:27017/cafecito-los-moras
PORT=5000
FRONTEND_URL=http://localhost:5173
```

- `MONGODB_URI`: cadena de conexión a MongoDB (local o Atlas).
- `PORT`: puerto del servidor Express.
- `FRONTEND_URL`: origen(es) permitidos por CORS (separados por coma si hay más de uno). En producción, configúralo con el dominio real del frontend.

## Levantar el servidor

Requiere una instancia de MongoDB accesible (local, Docker o Atlas):

```bash
npm run dev     # con nodemon
npm start       # producción
```

Si quieres datos de ejemplo:

```bash
npm run seed
```

Verificación rápida: `GET http://localhost:5000/api/health` debe responder `{ "success": true, "data": { "status": "ok" } }`.

## Modelos

### Product
`nombre`, `descripcion`, `precio` (≥0), `stock` (entero ≥0), `categoria`, `imagen`, `activo`, timestamps. Virtual `disponible` = `activo && stock > 0`.

### Order
`cliente {nombre, telefono}`, `productos [{producto, nombre, precio, cantidad}]`, `subtotal`, `total`, `tipoPedido` (`recoger`|`domicilio`), `direccion`, `estado` (`pendiente`|`confirmado`|`preparando`|`listo`|`entregado`|`cancelado`), timestamps.

> El frontend ya construido en `cafeteria-app/` envía/lee el campo como `tipoEntrega` en vez de `tipoPedido`, y usa `items` en vez de `productos`. El backend acepta ambos nombres en el body de `POST /api/orders`, y en las respuestas incluye ambos (`tipoPedido` y un alias `tipoEntrega`, y `productos` que el normalizador del frontend también reconoce) para no requerir cambios en el frontend ya existente.

## Endpoints

### Productos
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/products` | Lista productos. Filtros opcionales `?categoria=` y `?activo=true\|false`. |
| GET | `/api/products/:id` | Detalle de un producto. |
| POST | `/api/products` | Crea un producto (valida en el schema de Mongoose). |
| PUT | `/api/products/:id` | Actualiza campos de un producto existente. |
| DELETE | `/api/products/:id` | **Soft delete**: pone `activo: false` (no borra el documento). |

**Nota de diseño:** `GET /api/products` devuelve *todos* los productos (activos, inactivos, con o sin stock) por defecto. Esto es intencional: el panel administrativo (`cafeteria-app/src/pages/admin/AdminProductsPage.jsx`) reutiliza este mismo endpoint para poder ver y reactivar productos inactivos, y el frontend público ya maneja mostrar "No disponible" cuando `activo=false` o `stock=0`. Como todavía no hay autenticación que distinga admin de público, filtrar en el backend habría roto la función de reactivar productos desde el panel. Usa `?activo=true` si en el futuro necesitas una vista pública restringida antes de tener autenticación real con roles.

### Pedidos
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/orders` | Crea un pedido. Ver flujo abajo. |
| GET | `/api/orders` | Lista pedidos. Filtro opcional `?estado=`. |
| GET | `/api/orders/:id` | Detalle de un pedido. |
| PUT | `/api/orders/:id/status` | Actualiza `estado` (valida contra la lista de estados permitidos). |

### Flujo de `POST /api/orders`
1. Valida `cliente.nombre`/`cliente.telefono`, `tipoPedido`/`tipoEntrega` (`recoger`|`domicilio`), `direccion` obligatoria si es `domicilio`, y que `items`/`productos` sea un arreglo no vacío con cantidades enteras positivas.
2. Para cada producto: lo busca en MongoDB, verifica que exista y esté `activo`.
3. Descuenta el stock de forma **atómica** por producto con `findOneAndUpdate({ _id, activo: true, stock: { $gte: cantidad } }, { $inc: { stock: -cantidad } })`, evitando condiciones de carrera entre pedidos simultáneos sin depender de transacciones multi-documento (que requieren un replica set).
4. Si falta stock, responde `409` y **revierte** cualquier descuento de stock ya aplicado a otros productos del mismo pedido (no se crea una operación parcial).
5. Los precios y nombres se toman siempre de MongoDB — el frontend nunca decide el precio final. `subtotal`/`total` se calculan en el backend.
6. Crea el pedido con `estado: "pendiente"` y responde `201`.

## Formato de respuestas

Éxito:
```json
{ "success": true, "data": { } }
```

Error:
```json
{ "success": false, "message": "Stock insuficiente para \"Pastel de chocolate\"" }
```

Códigos usados: `400` datos inválidos, `404` recurso no encontrado, `409` stock insuficiente / conflicto, `500` error interno. Manejados centralmente en `src/middleware/errorHandler.js` (incluye errores de validación de Mongoose y `CastError` por ids inválidos).

## Seguridad

- No hay credenciales en el código; todo viene de `.env` (no versionado).
- CORS restringido al/los origen(es) de `FRONTEND_URL`.
- No hay autenticación todavía. La estructura (controllers separados, rutas administrativas ya agrupadas en `productController`/`orderController`) está lista para añadir un middleware de auth (p. ej. JWT) sin reestructurar: bastaría con añadir `authMiddleware` a las rutas de creación/edición/borrado y a `PUT /orders/:id/status` en `src/routes/`.
- **Pendiente antes de producción real:** el panel admin (`/admin` en el frontend) no tiene ningún control de acceso — cualquiera que conozca la URL puede crear/editar/desactivar productos y cambiar estados de pedidos.

## Pruebas automatizadas

```bash
npm test              # corre toda la suite (unitarias + integración)
npm run test:watch    # modo watch
npm run test:coverage # con reporte de cobertura
```

La suite usa **Jest**. Las pruebas de integración levantan un `mongod` real en memoria con `mongodb-memory-server` (no un mock) y hacen peticiones HTTP reales con `supertest` contra `src/app.js`; la primera ejecución descarga el binario de `mongod` y requiere conexión a internet.

- **`tests/unit/`** — lógica pura, sin base de datos (`validateSync()` de Mongoose y la función `validateAndNormalizeInput` de pedidos no llegan a tocar Mongo):
  - `product.model.test.js` / `order.model.test.js`: validaciones de schema (campos obligatorios, precio/stock ≥0, stock entero, enums de `tipoPedido`/`estado`, virtual `disponible`, alias `tipoEntrega` en `toJSON`).
  - `orderValidation.test.js`: la validación de `POST /api/orders` (cliente, tipo de pedido, dirección requerida en domicilio, items no vacíos, cantidades enteras positivas, ids válidos, suma de cantidades duplicadas, que el precio/nombre enviados por el cliente se descarten).
  - `errorHandler.test.js` / `notFound.test.js` / `catchAsync.test.js`: middleware de errores centralizado y el wrapper async.
- **`tests/integration/`** — HTTP end-to-end contra MongoDB real:
  - `products.test.js`: CRUD completo, filtros `?categoria=`/`?activo=`, soft-delete, 404 por id inexistente/malformado, que los campos no permitidos (p. ej. `_id`) se ignoren.
  - `orders.test.js`: cálculo de precio/total en el backend ignorando lo enviado por el cliente, descuento **real** de stock en MongoDB, rechazo con `409` y rollback sin cambios parciales cuando falta stock, rechazo de productos inactivos/inexistentes, domicilio sin dirección, filtros y actualización de estado.
  - `app.test.js`: `GET /api/health`, ruta no definida (404), CORS (origen permitido vs. rechazado).

Estado actual: **83 pruebas, 9 suites, 100% de cobertura de statements/branches/functions/lines** en todo `src/`.

## Configuración manual pendiente

1. Definir `MONGODB_URI` apuntando a tu MongoDB real (local, Docker o Atlas) en `.env`.
2. Ajustar `FRONTEND_URL` al dominio real del frontend en producción.
3. Si se despliega públicamente, agregar autenticación al panel administrativo antes de exponerlo (ver sección Seguridad).
4. Opcional: correr `npm run seed` para tener productos de ejemplo al conectar el frontend.
