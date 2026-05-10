const Task = require("../models/Task");

exports.createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      project,
      assignedTo,
      dueDate,
      status,
    } = req.body;

    const task = await Task.create({
      title,
      description,
      project,
      assignedTo,
      dueDate,
      status,
    });

    res.status(201).json({
      message: "Task created",
      task,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.getTasks = async (req, res) => {
  try {
    const tasks = await Task.find()
      .sort({ createdAt: -1 })
      .populate("project", "title")
      .populate("assignedTo", "name email");

    res.json(tasks);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};