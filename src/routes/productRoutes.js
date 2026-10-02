const express = require("express");
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");
const { protect, restrictTo } = require("../middleware/auth");

const router = express.Router();

router.get("/", getProducts);
router.get("/:id", getProduct);
router.post("/", protect, restrictTo("admin"), createProduct);
router.put("/:id", protect, restrictTo("admin"), updateProduct);
router.delete("/:id", protect, restrictTo("admin"), deleteProduct);

module.exports = router;
