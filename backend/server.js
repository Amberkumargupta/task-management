const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();


const app = express();

app.use(cors());
app.use(express.json());
const authRoutes = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");
const userRoutes = require("./routes/userRoutes");
app.use("/api/projects", projectRoutes);
const taskRoutes = require("./routes/taskRoutes");
app.use("/api/tasks", taskRoutes);
app.use("/api/users", userRoutes);

app.use('/api/auth', authRoutes);

app.get("/", (req, res) => {
  res.send("Backend running...");
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
    app.listen(process.env.PORT, () => {
      console.log(`Server running on port ${process.env.PORT}`);
    });
  })
  .catch((err) => console.log(err));