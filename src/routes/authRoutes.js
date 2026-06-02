const express = require("express");
const {
  register,
  login,
  getMe,
  getUsers,
  changePassword
} = require("../controllers/authController");
const { requireAuth, requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", requireAuth, getMe);
router.get("/users", requireAuth, requireAdmin, getUsers);
router.patch("/change-password", requireAuth, changePassword);

module.exports = router;