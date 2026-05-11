const express = require("express");
const router = express.Router();

const { getUsers } = require("./controllers/userController");
const { auth, isAdmin } = require("./middleware/authMiddleware");

router.get("/", auth, isAdmin, getUsers);

module.exports = router;