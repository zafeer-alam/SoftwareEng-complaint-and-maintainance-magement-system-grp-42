const router = require("express").Router();
const mongoose = require("mongoose");
const Complaint = require("../models/Complaint");
const auth = require("../middleware/auth");

const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") return res.status(403).json({ msg: "Forbidden" });
  next();
};

router.get("/summary", auth, requireAdmin, async (req, res) => {
  try {
    const summary = await Complaint.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    const counts = summary.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    res.json({ summary: counts });
  } catch (error) {
    console.error("Reports summary error:", error);
    res.status(500).json({ msg: "Unable to fetch summary", error: error.message });
  }
});

router.get("/categories", auth, requireAdmin, async (req, res) => {
  try {
    const categories = await Complaint.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    res.json({ categories });
  } catch (error) {
    console.error("Reports categories error:", error);
    res.status(500).json({ msg: "Unable to fetch categories", error: error.message });
  }
});

router.get("/staff/:id", auth, requireAdmin, async (req, res) => {
  try {
    const staffId = req.params.id;
    const tasks = await Complaint.aggregate([
      { $match: { assignedTo: mongoose.Types.ObjectId(staffId) } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);
    res.json({ staffId, tasks });
  } catch (error) {
    console.error("Reports staff error:", error);
    res.status(500).json({ msg: "Unable to fetch staff report", error: error.message });
  }
});

router.get("/monthly", auth, requireAdmin, async (req, res) => {
  try {
    const monthly = await Complaint.aggregate([
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);
    res.json({ monthly });
  } catch (error) {
    console.error("Reports monthly error:", error);
    res.status(500).json({ msg: "Unable to fetch monthly report", error: error.message });
  }
});

module.exports = router;
