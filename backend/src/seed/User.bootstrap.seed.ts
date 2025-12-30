import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import { User } from "../models/User.model";
import { Role } from "../models/Role.model";
import { Status } from "../models/Status.model";

const MONGO_URI = "mongodb://localhost:27017/maxmusicschool";

async function seedInitialAdmin() {
  await mongoose.connect(MONGO_URI);

  const adminRole = await Role.findOne({ name: "ADMIN" });
  const activeStatus = await Status.findOne({ name: "ACTIVE" });

  if (!adminRole || !activeStatus) {
    throw new Error("ADMIN role or ACTIVE status missing. Seed roles/status first.");
  }

  const existingAdmin = await User.findOne({ role: adminRole._id });

  if (existingAdmin) {
    console.log("Admin already exists. Skipping bootstrap admin creation.");
    await mongoose.disconnect();
    return;
  }

  const hashedPassword = await bcrypt.hash("Admin@123", 8);

  await User.create({
    name: "Super Admin",
    email: "admin@music.com",
    mobile: "9999999999",
    password: hashedPassword,
    role: adminRole._id,
    status: activeStatus._id,
  });

  console.log("Initial admin created");

  await mongoose.disconnect();
}

seedInitialAdmin().catch(err => {
  console.error(err);
  process.exit(1);
});
