const express = require("express");
const router = express.Router();

const {
  createProject,
  getProjects,
} = require("../controllers/projectController");

const {
  auth,
  isAdmin,
} = require("../middleware/authMiddleware");

router.post("/", auth, isAdmin, createProject);
router.get("/", auth, getProjects);

module.exports = router;