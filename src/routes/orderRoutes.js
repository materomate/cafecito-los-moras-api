const express = require("express");
const {
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
} = require("../controllers/orderController");
const { protect, restrictTo } = require("../middleware/auth");

const router = express.Router();

router.post("/", createOrder);
router.get("/", protect, restrictTo("admin"), getOrders);
router.get("/:id", getOrder);
router.put("/:id/status", protect, restrictTo("admin"), updateOrderStatus);

module.exports = router;
