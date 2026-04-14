const router = require("express").Router();
const User = require("../models/User");
const Complaint = require("../models/Complaint");
const auth = require("../middleware/auth");

// Get all staff members
router.get("/", auth, async (req, res) => {
  try {
    // Only admin can view all staff
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "Forbidden" });
    }

    const staff = await User.find({ role: "staff" }).select("_id name email role createdAt");
    
    // Get stats for each staff member
    const staffWithStats = await Promise.all(
      staff.map(async (s) => {
        const assigned = await Complaint.countDocuments({ assignedTo: s._id, status: { $ne: "Resolved" } });
        const resolved = await Complaint.countDocuments({ assignedTo: s._id, status: "Resolved" });
        
        return {
          _id: s._id,
          name: s.name,
          email: s.email,
          role: s.role,
          activeTasksCount: assigned,
          resolvedCount: resolved,
          createdAt: s.createdAt
        };
      })
    );

    res.json(staffWithStats);
  } catch (error) {
    console.error("Get staff error:", error);
    res.status(500).json({ msg: "Unable to fetch staff", error: error.message });
  }
});

// Get single staff member details
router.get("/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "Forbidden" });
    }

    const staff = await User.findById(req.params.id).select("_id name email role createdAt");
    if (!staff) return res.status(404).json({ msg: "Staff not found" });

    const assigned = await Complaint.countDocuments({ assignedTo: staff._id, status: { $ne: "Resolved" } });
    const resolved = await Complaint.countDocuments({ assignedTo: staff._id, status: "Resolved" });

    res.json({
      ...staff.toObject(),
      activeTasksCount: assigned,
      resolvedCount: resolved
    });
  } catch (error) {
    console.error("Get staff detail error:", error);
    res.status(500).json({ msg: "Unable to fetch staff", error: error.message });
  }
});

module.exports = router;
