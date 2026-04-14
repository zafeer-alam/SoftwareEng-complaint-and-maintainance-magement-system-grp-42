const router = require("express").Router();
const mongoose = require("mongoose");
const Complaint = require("../models/Complaint");
const User = require("../models/User");
const auth = require("../middleware/auth");

const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") return res.status(403).json({ msg: "Forbidden" });
  next();
};

router.get("/stats", auth, requireAdmin, async (req, res) => {
  try {
    const totalComplaints = await Complaint.countDocuments();
    const resolvedCount = await Complaint.countDocuments({ status: "Resolved" });
    const resolutionRate = totalComplaints > 0 ? ((resolvedCount / totalComplaints) * 100).toFixed(0) : 0;
    
    const resolved = await Complaint.find({ status: "Resolved" }).select("createdAt updatedAt");
    const avgTime = resolved.length > 0 
      ? (resolved.reduce((sum, c) => sum + (new Date(c.updatedAt) - new Date(c.createdAt)), 0) / resolved.length / (1000 * 60 * 60 * 24)).toFixed(1)
      : 0;
    
    const activeStaff = await User.countDocuments({ role: "staff" });
    
    res.json({
      totalComplaints,
      resolutionRate,
      avgResolutionTime: avgTime,
      activeStaff
    });
  } catch (error) {
    console.error("Reports stats error:", error);
    res.status(500).json({ msg: "Unable to fetch stats", error: error.message });
  }
});

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

router.get("/staffPerformance", auth, requireAdmin, async (req, res) => {
  try {
    const staff = await User.find({ role: "staff" }).select("_id name email");
    const staffPerf = await Promise.all(staff.map(async (s) => {
      const assigned = await Complaint.countDocuments({ assignedTo: s._id, status: { $ne: "Resolved" } });
      const resolved = await Complaint.countDocuments({ assignedTo: s._id, status: "Resolved" });
      
      const resolvedComplaints = await Complaint.find({ assignedTo: s._id, status: "Resolved" }).select("createdAt updatedAt rating");
      let avgTime = "N/A";
      if (resolvedComplaints.length > 0) {
        const totalTime = resolvedComplaints.reduce((sum, c) => sum + (new Date(c.updatedAt) - new Date(c.createdAt)), 0);
        const avgMs = totalTime / resolvedComplaints.length;
        const avgDays = (avgMs / (1000 * 60 * 60 * 24)).toFixed(1);
        avgTime = avgDays + "d";
      }

      // Calculate average rating from rated complaints
      const ratedComplaints = resolvedComplaints.filter(c => c.rating);
      let avgRating = "N/A";
      if (ratedComplaints.length > 0) {
        const totalRating = ratedComplaints.reduce((sum, c) => sum + c.rating, 0);
        avgRating = (totalRating / ratedComplaints.length).toFixed(1);
      }
      
      return { 
        name: s.name, 
        email: s.email, 
        assigned, 
        resolved, 
        avgTime,
        avgRating,
        ratedCount: ratedComplaints.length
      };
    }));
    
    res.json({ staffPerformance: staffPerf });
  } catch (error) {
    console.error("Reports staff performance error:", error);
    res.status(500).json({ msg: "Unable to fetch staff performance", error: error.message });
  }
});

module.exports = router;
