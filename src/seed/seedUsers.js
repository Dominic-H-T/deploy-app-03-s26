require("dotenv").config();

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");

async function seedUsers() {
  try {
    await connectDB();

    const username = "admin";
    const plainPassword = "secret321";

    const existingAdmin = await User.findOne({ username });

    if (existingAdmin) {
      console.log("Admin user already exists");
      await mongoose.connection.close();
      return;
    }

    const passwordHash = await bcrypt.hash(plainPassword, 10);

    await User.create({
      username,
      passwordHash,
      role: "admin"
    });

    console.log("Admin user created");
    console.log("username: admin");
    console.log("password: secret321");

    await mongoose.connection.close();
  } catch (error) {
    console.error(error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

seedUsers();