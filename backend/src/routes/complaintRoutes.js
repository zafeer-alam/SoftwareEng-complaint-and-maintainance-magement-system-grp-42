const router = require("express").Router();
const Complaint = require("../models/Complaint");
const auth = require("../middleware/auth");

// ╔═══════════════════════════════════════════╗
// ║ IMPORTANT: Specific routes MUST come      ║
// ║ before generic :id routes in Express!     ║
// ╚═══════════════════════════════════════════╝

// CREATE complaint
router.post("/", auth, async (req, res) => {
  try {
    console.log("Creating complaint - req.user:", req.user);
    console.log("Request body:", req.body);
    
    if (!req.user || !req.user.id) {
      return res.status(400).json({ msg: "User ID not found in token", debug: req.user });
    }

    const complaint = await Complaint.create({
      ...req.body,
      userId: req.user.id
    });

    console.log("Complaint created:", complaint);
    res.status(201).json(complaint);
  } catch (error) {
    console.error("Create complaint error:", error);
    res.status(500).json({ msg: "Unable to create complaint", error: error.message });
  }
});

// ── SPECIFIC ROUTES (Must be BEFORE /:id) ──

// GET pending tasks for current staff member
router.get("/pending-for-staff", auth, async (req, res) => {
  try {
    console.log("Fetching pending tasks for staff - req.user.id:", req.user.id);
    const data = await Complaint.find({
      assignedTo: req.user.id,
      status: { $ne: "Resolved" }
    }).populate("userId assignedTo");
    console.log("Found tasks:", data.length, "for staff:", req.user.id);
    res.json(data);
  } catch (error) {
    console.error("Get staff tasks error:", error);
    res.status(500).json({ msg: "Unable to fetch tasks", error: error.message });
  }
});

// GET resolved complaints for current staff member
router.get("/resolved", auth, async (req, res) => {
  try {
    console.log("Fetching resolved tasks for staff - req.user.id:", req.user.id);
    const data = await Complaint.find({ 
      assignedTo: req.user.id,
      status: "Resolved" 
    }).populate("userId assignedTo");
    console.log("Found resolved tasks:", data.length, "for staff:", req.user.id);
    res.json(data);
  } catch (error) {
    console.error("Get resolved complaints error:", error);
    res.status(500).json({ msg: "Unable to fetch resolved complaints", error: error.message });
  }
});

// GET complaints for a specific user
router.get("/user/:userId", auth, async (req, res) => {
  try {
    if (req.user.id !== req.params.userId && req.user.role !== "admin") {
      return res.status(403).json({ msg: "Forbidden" });
    }

    const data = await Complaint.find({ userId: req.params.userId }).populate("assignedTo");
    res.json(data);
  } catch (error) {
    console.error("Get user complaints error:", error);
    res.status(500).json({ msg: "Unable to fetch user complaints", error: error.message });
  }
});

// PUT assign complaint to staff
router.put("/assign/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "Forbidden" });
    }

    const updated = await Complaint.findByIdAndUpdate(
      req.params.id,
      {
        assignedTo: req.body.staffId,
        status: "In Progress"
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ msg: "Complaint not found" });
    res.json(updated);
  } catch (error) {
    console.error("Assign complaint error:", error);
    res.status(500).json({ msg: "Unable to assign complaint", error: error.message });
  }
});

// PUT update status
router.put("/status/:id", auth, async (req, res) => {
  try {
    const updated = await Complaint.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );

    if (!updated) return res.status(404).json({ msg: "Complaint not found" });
    res.json(updated);
  } catch (error) {
    console.error("Update complaint status error:", error);
    res.status(500).json({ msg: "Unable to update status", error: error.message });
  }
});

// ── GENERIC ROUTES (Must be AFTER specific routes) ──

// GET all complaints
router.get("/", auth, async (req, res) => {
  try {
    const filter = {};

    if (req.query.status) filter.status = req.query.status;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.userId) filter.userId = req.query.userId;
    if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;

    if (req.user.role !== "admin") {
      if (req.query.userId && req.query.userId !== req.user.id) {
        return res.status(403).json({ msg: "Forbidden" });
      }

      filter.userId = req.user.id;
    }

    const data = await Complaint.find(filter).populate("userId assignedTo");
    res.json(data);
  } catch (error) {
    console.error("Get complaints error:", error);
    res.status(500).json({ msg: "Unable to fetch complaints", error: error.message });
  }
});

// DELETE complaint by id
router.delete("/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "Forbidden" });
    }

    const deleted = await Complaint.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ msg: "Complaint not found" });

    res.json({ msg: "Complaint deleted" });
  } catch (error) {
    console.error("Delete complaint error:", error);
    res.status(500).json({ msg: "Unable to delete complaint", error: error.message });
  }
});

// PUT generic update complaint by id
router.put("/:id", auth, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ msg: "Complaint not found" });

    // Check permissions
    if (req.user.role !== "admin" && String(complaint.userId) !== req.user.id) {
      return res.status(403).json({ msg: "Forbidden" });
    }

    // Update fields
    if (req.body.status) complaint.status = req.body.status;
    if (req.body.assignedTo) {
      complaint.assignedTo = req.body.assignedTo;
      console.log("Assigning complaint", req.params.id, "to staff:", req.body.assignedTo);
    }
    if (req.body.description) complaint.description = req.body.description;
    if (req.body.priority) complaint.priority = req.body.priority;

    const updated = await complaint.save();
    console.log("Complaint updated:", { id: updated._id, assignedTo: updated.assignedTo, status: updated.status });
    res.json(updated);
  } catch (error) {
    console.error("Update complaint error:", error);
    res.status(500).json({ msg: "Unable to update complaint", error: error.message });
  }
});

// GET complaint by id (MUST BE LAST - generic catch-all)
router.get("/:id", auth, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id).populate("userId assignedTo");
    if (!complaint) return res.status(404).json({ msg: "Complaint not found" });

    if (req.user.id !== String(complaint.userId?._id || complaint.userId) && req.user.role !== "admin") {
      return res.status(403).json({ msg: "Forbidden" });
    }

    res.json(complaint);
  } catch (error) {
    console.error("Get complaint error:", error);
    res.status(500).json({ msg: "Unable to fetch complaint", error: error.message });
  }
});

// PUT rate complaint (student submits rating)
router.put("/rate/:id", auth, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ msg: "Complaint not found" });

    // Only student who created it can rate
    if (String(complaint.userId) !== req.user.id) {
      return res.status(403).json({ msg: "Forbidden - Only complaint creator can rate" });
    }

    // Only rate if staff marked as resolved
    if (complaint.status !== "Resolved") {
      return res.status(400).json({ msg: "Can only rate resolved complaints" });
    }

    complaint.rating = req.body.rating;
    complaint.ratingComment = req.body.ratingComment || '';
    complaint.studentApprovedAt = new Date();

    const updated = await complaint.save();
    console.log(`Rating submitted for complaint ${req.params.id}: ${req.body.rating} stars by student ${req.user.id}`);
    res.json(updated);
  } catch (error) {
    console.error("Rate complaint error:", error);
    res.status(500).json({ msg: "Unable to submit rating", error: error.message });
  }
});

// PUT reopen complaint (student reopens if not satisfied)
router.put("/reopen/:id", auth, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ msg: "Complaint not found" });

    // Only student who created it can reopen
    if (String(complaint.userId) !== req.user.id) {
      return res.status(403).json({ msg: "Forbidden - Only complaint creator can reopen" });
    }

    complaint.status = "In Progress";
    complaint.reopenedAt = new Date();
    complaint.rating = null;
    complaint.ratingComment = null;
    complaint.studentApprovedAt = null;

    const updated = await complaint.save();
    console.log(`Complaint ${req.params.id} reopened by student ${req.user.id}`);
    res.json(updated);
  } catch (error) {
    console.error("Reopen complaint error:", error);
    res.status(500).json({ msg: "Unable to reopen complaint", error: error.message });
  }
});

module.exports = router;