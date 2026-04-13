const router = require("express").Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// register
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ msg: "Name, email and password are required" });
  }

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ msg: "Email already registered" });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hash });

    // Generate token for auto-login
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || "secret", {
      expiresIn: "7d"
    });

    return res.status(201).json({
      token,
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      _id: user._id
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ msg: "Server error", error: error.message });
  }
});

// login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ msg: "Email and password are required" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ msg: "Wrong password" });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || "secret", {
      expiresIn: "7d"
    });

    return res.json({
      token,
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      _id: user._id
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ msg: "Server error", error: error.message });
  }
});

module.exports = router;