const express = require("express");
const {
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
} = require("../controllers/orderController");

const router = express.Router();

router.post("/", createOrder);
router.get("/", getOrders);
router.get("/:id", getOrder);
router.put("/:id/status", updateOrderStatus);

module.exports = router;
