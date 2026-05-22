const express = require("express");
const {
  createTransaction,
  getTransactions,
  getTransactionById
} = require("../controllers/transactionController");
const requireAuth = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", requireAuth, createTransaction);
router.get("/", requireAuth, getTransactions);
router.get("/:id", requireAuth, getTransactionById);

module.exports = router;