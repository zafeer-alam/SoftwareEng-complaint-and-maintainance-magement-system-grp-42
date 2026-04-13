const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();
const app = express();

// MIDDLEWARE
app.use(cors());
app.use(express.json());

// ROUTES
app.use("/api/auth", require("./src/routes/authRoutes"));
app.use("/api/complaints", require("./src/routes/complaintRoutes"));
app.use("/api/reports", require("./src/routes/reportRoutes"));

// TEST ROUTE
app.get("/", (req, res) => {
  res.send("API Running...");
});

// DATABASE
const mongoUri = process.env.MONGO_URI || "mongodb+srv://zafeeralam469_db_user:test123@MohdZafeer.vktlxej.mongodb.net/complaintDB";

mongoose.connect(mongoUri)
  .then(() => {
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