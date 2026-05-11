const express = require("express");
const router = express.Router();

const {
  createTask,
  getTasks,
} = require("../controllers/taskController");

const {
  auth,
  isAdmin,
} = require("../middleware/authMiddleware");

router.post("/", auth, isAdmin, createTask);
router.get("/", getTasks);

module.exports = router;