const jwt = require("jsonwebtoken");

const auth = (req, res, next) => {
  try {
    let token =
      req.header("Authorization") ||
      req.header("authorization") ||
      req.header("x-access-token") ||
      req.header("x-auth-token") ||
      req.header("token") ||
      req.query.token ||
      req.body?.token;

    if (!token) {
      return res.status(401).json({ message: "No token, access denied" });
    }

    token = String(token).trim();

    // Support "Bearer <token>", lowercase bearer, and raw token
    if (/^bearer\s+/i.test(token)) {
      token = token.replace(/^bearer\s+/i, "").trim();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== "Admin") {
    return res.status(403).json({
      message: "Only Admin can access",
    });
  }

  next();
};

module.exports = { auth, isAdmin };