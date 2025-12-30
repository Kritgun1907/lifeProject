import connectDB from "../config/db";
import { Role } from "../models/Role.model";
import {
  ADMIN_PERMISSIONS,
  TEACHER_PERMISSIONS,
  STUDENT_PERMISSIONS,
  GUEST_PERMISSIONS,
} from "../constants/rolePermissions";

const seedRoles = async () => {
  await connectDB();

  // Delete existing roles
  await Role.deleteMany({});

  await Role.insertMany([
    {
      name: "ADMIN",
      permissions: ADMIN_PERMISSIONS,
      description: "Full system access with all permissions",
      isActive: true,
    },
    {
      name: "TEACHER",
      permissions: TEACHER_PERMISSIONS,
      description: "Teacher with batch management and student tracking",
      isActive: true,
    },
    {
      name: "STUDENT",
      permissions: STUDENT_PERMISSIONS,
      description: "Student with basic access to own data",
      isActive: true,
    },
    {
      name: "GUEST",
      permissions: GUEST_PERMISSIONS,
      description: "Limited read-only access for prospective students",
      isActive: true,
    },
  ]);

  console.log("✅ Roles seeded with permissions");
  process.exit();
};

seedRoles();
