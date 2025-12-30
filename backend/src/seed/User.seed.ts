import bcrypt from "bcryptjs";
import { User } from "../models/User.model";
import { SeedContext } from "./seedContext";

export async function seedUsers(context: SeedContext) {
  // Clear existing users
  await User.deleteMany({});

  const password = await bcrypt.hash("Test@123", 8);

  const admin = await User.create({
    name: "Super Admin",
    email: "admin@music.com",
    mobile: "9999999999",
    password,
    role: context.adminRoleId,
    status: context.statusId,
  });

  const teacher = await User.create({
    name: "Teacher One",
    email: "teacher@music.com",
    mobile: "8888888888",
    password,
    role: context.teacherRoleId,
    status: context.statusId,
  });

  const student = await User.create({
    name: "Student One",
    email: "student@music.com",
    mobile: "7777777777",
    password,
    role: context.studentRoleId,
    status: context.statusId,
  });

  const guestUser = await User.create({
    name: "Guest User",
    email: "guest@music.com",
    mobile: "6666666666",
    password,
    role: context.studentRoleId,
    status: context.statusId,
  });

  context.adminId = admin._id.toString();
  context.teacherId = teacher._id.toString();
  context.studentId = student._id.toString();
  context.guestUserId = guestUser._id.toString();

  console.log("✅ Users seeded (admin, teacher, student, guest)");
}
