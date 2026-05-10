const User = require("../models/User");

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("name email role createdAt updatedAt")
      .sort({ name: 1 });

    res.json(users);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};