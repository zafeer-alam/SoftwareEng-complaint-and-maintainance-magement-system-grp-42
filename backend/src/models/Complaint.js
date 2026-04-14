const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  subject: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  location: String,
  priority: { type: String, default: "Medium" },
  attachments: [{ type: String }],
  status: { type: String, default: "Pending" },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  // Rating & Approval fields
  rating: { type: Number, min: 1, max: 5 },
  ratingComment: String,
  studentApprovedAt: Date,
  staffResolvedAt: Date,
  reopenedAt: Date
}, { timestamps: true });

module.exports = mongoose.model("Complaint", complaintSchema);