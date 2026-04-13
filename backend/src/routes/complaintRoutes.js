const router = require("express").Router();
const Complaint = require("../models/Complaint");
const auth = require("../middleware/auth");

// create complaint
router.post("/", auth, async (req, res) => {
  try {
    const complaint = await Complaint.create({
      ...req.body,
      userId: req.user.id
    });

    res.status(201).json(complaint);
  } catch (error) {
    console.error("Create complaint error:", error);
    res.status(500).json({ msg: "Unable to create complaint", error: error.message });
  }
});

// get complaints for a user
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

// get complaint by id
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

// get all complaints
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

// delete complaint (admin)
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

// assign complaint (admin)
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

// update status (staff)
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

// generic update complaint
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
    if (req.body.assignedTo) complaint.assignedTo = req.body.assignedTo;
    if (req.body.description) complaint.description = req.body.description;
    if (req.body.priority) complaint.priority = req.body.priority;

    const updated = await complaint.save();
    res.json(updated);
  } catch (error) {
    console.error("Update complaint error:", error);
    res.status(500).json({ msg: "Unable to update complaint", error: error.message });
  }
});

// get complaints assigned to current user (staff)
router.get("/pending-for-staff", auth, async (req, res) => {
  try {
    const data = await Complaint.find({
      assignedTo: req.user.id,
      status: { $ne: "Resolved" }
    }).populate("userId assignedTo");
    res.json(data);
  } catch (error) {
    console.error("Get staff tasks error:", error);
    res.status(500).json({ msg: "Unable to fetch tasks", error: error.message });
  }
});

// get resolved complaints
router.get("/resolved", auth, async (req, res) => {
  try {
    const data = await Complaint.find({ status: "Resolved" }).populate("userId assignedTo");
    res.json(data);
  } catch (error) {
    console.error("Get resolved complaints error:", error);
    res.status(500).json({ msg: "Unable to fetch resolved complaints", error: error.message });
  }
});

module.exports = router;