import mongoose from "mongoose";
import { Status } from '../models/Status.model';

async function testStatus() {
  try {
    // Connect to database
    await mongoose.connect("mongodb://localhost:27017/maxmusicschool");
    console.log("🔌 Connected to MongoDB");

    // Clear existing statuses for clean test
    await Status.deleteMany({});
    console.log("🧹 Cleared existing statuses");

    // Test 1: Create valid statuses
    console.log("\n📝 Test 1: Creating valid statuses...");
    const s1 = await Status.create({ name: 'ACTIVE' });
    const s2 = await Status.create({ name: 'INACTIVE' });
    const s3 = await Status.create({ name: 'BLOCKED' });
    const s4 = await Status.create({ name: 'ACTIVE SOON' });
    const s5 = await Status.create({ name: 'HOLD' });
    console.log('✅ Created statuses:', s1.name, s2.name, s3.name, s4.name, s5.name);

    // Test 2: Try to create duplicate (should fail)
    console.log("\n📝 Test 2: Attempting to create duplicate 'ACTIVE'...");
    try {
      await Status.create({ name: 'ACTIVE' });
      console.log("❌ ERROR: Duplicate was allowed (validation not working)");
    } catch (err: any) {
      if (err.code === 11000) {
        console.log("✅ Caught expected E11000 duplicate key error");
        console.log("   Message:", err.message);
      } else {
        console.log("❌ Unexpected error:", err.message);
      }
    }

    // Test 3: Try to create invalid status (should fail)
    console.log("\n📝 Test 3: Attempting to create invalid status 'PENDING'...");
    try {
      await Status.create({ name: 'PENDING' });
      console.log("❌ ERROR: Invalid status was allowed (enum validation not working)");
    } catch (err: any) {
      console.log("✅ Caught expected validation error");
      console.log("   Message:", err.message);
    }

    // Test 4: Verify documents in database
    console.log("\n📝 Test 4: Verifying documents in database...");
    const allStatuses = await Status.find({});
    console.log(`✅ Total statuses in database: ${allStatuses.length}`);
    console.log("   Statuses:", allStatuses.map(s => s.name).join(", "));

    // Test 5: Check timestamps
    console.log("\n📝 Test 5: Checking timestamps...");
    const statusWithTimestamp = await Status.findOne({ name: 'ACTIVE' });
    console.log("✅ Timestamp field 'created_at':", statusWithTimestamp?.created_at);

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

testStatus();
