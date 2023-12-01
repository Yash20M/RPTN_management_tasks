const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const jwt = require("jsonwebtoken");
require("../DataBase/connection");
const User = require("../model/userSchema");
const authenticate = require("../middleware/authenticate");

router.post("/register", async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  if (!name || !email || !password || !confirmPassword) {
    return res.status(422).json({ error: "PLease fill all the details" });
  }

  try {
    const userExist = await User.findOne({ email: email });

    if (userExist) {
      return res.status(422).json({ error: "Email is already in use" });
    } else if (password != confirmPassword) {
      res.status(422).json({ err: "Message password didnt match" });
    } else {
      const user = new User({
        name,
        email,
        password,
        confirmPassword,
      });

      console.log(password);
      const userRegistered = await user.save();
      if (userRegistered) {
        return res
          .status(201)
          .json({ message: "User Registered Successfully" });
      }
    }
  } catch (err) {
    console.log(err);
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(422).json({ error: "Please fill all the details" });
    }

    const userLogin = await User.findOne({ email: email });
    if (userLogin) {
      const isMatch = await bcrypt.compare(password, userLogin.password);

      if (!isMatch) {
        return res.status(422).json({ message: "Invalid Login Credentials" });
      }

      const token = await userLogin.generateAuthToken();
      console.log(token, "this is generated TOken");

      res.cookie("jwttoken", token, {
        expires: new Date(Date.now() + 258920000),
        httpOnly: true,
      });

      console.log("token generation", token);

      return res.status(201).json({ message: "Logged In Successfully" });
    } else {
      return res.status(422).json({ message: "Invalid Login Credentials" });
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/tasks", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userID);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Log all tasks for debugging
    console.log("All tasks:", user.Tasks);

    // Ensure that createdAt is logged correctly
    user.Tasks.forEach((task) => {
      console.log("Task createdAt:", task.createdAt);
    });

    // Filter tasks for the current date
    const currentDate = new Date().toLocaleDateString();
    const currentTasks = user.Tasks.filter((task) => {
      // Log task details for debugging
      console.log("Task details:", task);
      return (
        task.createdAt && task.createdAt.toLocaleDateString() === currentDate
      );
    });

    // Log tasks after filtering
    console.log("Current tasks:", currentTasks);

    res.status(200).json({ tasks: currentTasks, email: req.rootUser.email });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/addTask", authenticate, async (req, res) => {
  try {
    const { task } = req.body; // Assuming that the task data is sent in the request body

    // Save the task to the user's tasks array
    req.rootUser.Tasks.push({
      task,
      startTime: "", // Add default values if needed
      endTime: "",
      totalHours: 0,
      timeDifference: "",
      createdAt: new Date(),
    });

    // Save the user with the updated tasks array
    await req.rootUser.save();

    res.status(201).json({ message: "Task added successfully" });
  } catch (error) {
    console.error("Error adding task:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/addStartTime/:taskId", authenticate, async (req, res) => {
  try {
    const taskId = req.params.taskId;

    // Find the user and task by ID
    const user = await User.findById(req.userID);
    const task = user.Tasks.id(taskId);

    if (!user || !task) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Check if the task already has a start time
    if (task.startTime) {
      return res.status(400).json({ error: "Start time already added" });
    }

    // Add start time to the task
    task.startTime = new Date().toLocaleTimeString();

    // Save the user document
    await user.save();

    res.status(200).json({ message: "Start time added successfully" });
  } catch (error) {
    console.error("Error adding start time:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// router.post("/updateStopTime", authenticate, async (req, res) => {
//   try {
//     const { taskId, stopTime } = req.body;

//     const user = req.rootUser;

//     // Find the task by taskId in the user's tasks array
//     const taskIndex = user.Tasks.findIndex(
//       (task) => task._id.toString() === taskId
//     );

//     if (taskIndex === -1) {
//       return res.status(404).json({ error: "Task not found" });
//     }

//     // Update the stopTime of the task
//     user.Tasks[taskIndex].EndTime = stopTime;

//     // Save the updated user document
//     await user.save();

//     res.status(200).json({ message: "Stop Time updated successfully" });
//   } catch (error) {
//     console.error("Error updating stopTime:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

router.post("/updateStopTime", authenticate, async (req, res) => {
  try {
    const { taskId, stopTime } = req.body;

    const user = req.rootUser;

    // Find the task by taskId in the user's tasks array
    const taskIndex = user.Tasks.findIndex(
      (task) => task._id.toString() === taskId
    );

    if (taskIndex === -1) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Update the stopTime and calculate timeDifference
    user.Tasks[taskIndex].EndTime = stopTime;
    const startTime = user.Tasks[taskIndex].startTime;

    if (startTime && stopTime) {
      const difference = calculateTimeDifference(startTime, stopTime);
      user.Tasks[taskIndex].timeDifference = difference;
    }

    // Save the updated user document
    await user.save();

    res.status(200).json({ message: "Stop Time updated successfully" });
  } catch (error) {
    console.error("Error updating stopTime:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Helper function to calculate time difference
const calculateTimeDifference = (startTime, stopTime) => {
  const start = new Date(`2000-01-01 ${startTime}`);
  const stop = new Date(`2000-01-01 ${stopTime}`);
  const difference = stop - start;

  const hours = Math.floor(difference / 3600000);
  const minutes = Math.floor((difference % 3600000) / 60000);
  const seconds = Math.floor((difference % 60000) / 1000);

  return `${hours}h ${minutes}m ${seconds}s`;
};

module.exports = router;
