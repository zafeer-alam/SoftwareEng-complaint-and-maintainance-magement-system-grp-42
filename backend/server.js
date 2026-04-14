const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const User = require("./src/models/User");

dotenv.config();
const app = express();

// MIDDLEWARE
app.use(cors());
app.use(express.json());

// ROUTES
app.use("/api/auth", require("./src/routes/authRoutes"));
app.use("/api/complaints", require("./src/routes/complaintRoutes"));
app.use("/api/staff", require("./src/routes/staffRoutes"));
app.use("/api/reports", require("./src/routes/reportRoutes"));

// TEST ROUTE
app.get("/", (req, res) => {
  res.send("API Running...");
});

// DATABASE
const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
  console.error("Error: MONGO_URI environment variable is not set. Please check your .env file.");
  process.exit(1);
}

mongoose.connect(mongoUri)
  .then(async () => {
    console.log("MongoDB Connected");
    app.listen(5000, () => console.log("Server running on port 5000"));
  })
  .catch(err => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ msg: "Server error", error: err.message });
});