const express = require("express");
const {
  register,
  login,
  getMe,
  changePassword
} = require("../controllers/authController");
const requireAuth = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", requireAuth, getMe);
router.patch("/change-password", requireAuth, changePassword);

module.exports = router;