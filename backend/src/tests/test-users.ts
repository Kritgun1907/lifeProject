import mongoose from "mongoose";
import { User } from '../models/User.model';
import { Role } from '../models/Role.model';
import { Status } from '../models/Status.model';

async function testUserModel() {
  try {
    // Connect to database
    await mongoose.connect("mongodb://localhost:27017/maxmusicschool");
    console.log("🔌 Connected to MongoDB");

    // Test 1: Check if required data exists
    console.log("\n📝 Test 1: Checking required Role and Status...");
    const adminRole = await Role.findOne({ name: 'ADMIN' });
    const activeStatus = await Status.findOne({ name: 'ACTIVE' });

    if (!adminRole) {
      throw new Error("ADMIN role not found. Run role seed first.");
    }
    if (!activeStatus) {
      throw new Error("ACTIVE status not found. Run status seed first.");
    }
    console.log("✅ Found required Role and Status");

    // Clear test user if exists
    await User.deleteOne({ email: 'john@music.com' });

    // Test 2: Create a new user
    console.log("\n📝 Test 2: Creating a new user...");
    const newUser = await User.create({
      name: 'John Doe',
      email: 'john@music.com',
      mobile: '1234567890',
      password: 'securePassword123',
      role: adminRole._id,
      status: activeStatus._id
    });
    console.log("✅ User created:", newUser.name);

    // Test 3: Test populate with role
    console.log("\n📝 Test 3: Testing populate with role...");
    const foundUser = await User.findById(newUser._id).populate('role');
    console.log("✅ User Role Name:", (foundUser?.role as any)?.name);

    // Test 4: Test populate with both role and status
    console.log("\n📝 Test 4: Testing populate with role and status...");
    const userWithRefs = await User.findById(newUser._id)
      .populate('role')
      .populate('status');
    console.log("✅ User Role Name:", (userWithRefs?.role as any)?.name);
    console.log("✅ User Status Name:", (userWithRefs?.status as any)?.name);

    // Test 5: Test duplicate email (should fail)
    console.log("\n📝 Test 5: Testing duplicate email validation...");
    try {
      await User.create({
        name: 'Jane Doe',
        email: 'john@music.com', // duplicate email
        mobile: '9876543210',
        password: 'anotherPassword',
        role: adminRole._id,
        status: activeStatus._id
      });
      console.log("❌ ERROR: Duplicate email was allowed");
    } catch (err: any) {
      if (err.code === 11000) {
        console.log("✅ Caught expected E11000 duplicate key error for email");
      } else {
        console.log("❌ Unexpected error:", err.message);
      }
    }

    // Test 6: Test duplicate mobile (should fail)
    console.log("\n📝 Test 6: Testing duplicate mobile validation...");
    try {
      await User.create({
        name: 'Jane Doe',
        email: 'jane@music.com',
        mobile: '1234567890', // duplicate mobile
        password: 'anotherPassword',
        role: adminRole._id,
        status: activeStatus._id
      });
      console.log("❌ ERROR: Duplicate mobile was allowed");
    } catch (err: any) {
      if (err.code === 11000) {
        console.log("✅ Caught expected E11000 duplicate key error for mobile");
      } else {
        console.log("❌ Unexpected error:", err.message);
      }
    }

    // Test 7: Verify timestamps
    console.log("\n📝 Test 7: Checking timestamps...");
    const userWithTimestamps = await User.findById(newUser._id);
    console.log("✅ Created at:", userWithTimestamps?.createdAt);
    console.log("✅ Updated at:", userWithTimestamps?.updatedAt);

    console.log("\n🎉 All tests completed successfully!");

  } catch (err: any) {
    console.error("❌ Test failed:", err.message);
  } finally {
    // Disconnect from database
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
    process.exit();
  }
}

testUserModel();