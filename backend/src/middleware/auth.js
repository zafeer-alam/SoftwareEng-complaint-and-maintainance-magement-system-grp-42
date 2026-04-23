const jwt = require("jsonwebtoken");   // JWT

const JWT_SECRET = process.env.JWT_SECRET || "secret";

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  const token = authHeader && authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  console.log("Auth check - Token:", token ? "Present" : "Missing");

  if (!token) return res.status(401).json({ msg: "No token" });

  
};
