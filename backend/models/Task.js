const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: String,
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: ["Todo", "In Progress", "Completed"],
      default: "Todo",
    },
    dueDate: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Task", taskSchema);