const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "authorization token required" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select("-passwordHash");

    if (!user) {
      return res.status(401).json({ message: "user no longer exists" });
    }

    req.user = user;

    return next();
  } catch (error) {
    return res.status(401).json({ message: "invalid or expired token" });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(500).json({ message: "authentication middleware must run first" });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "access denied" });
  }

  return next();
}

module.exports = {
  requireAuth,
  requireAdmin
};