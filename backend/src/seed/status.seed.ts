import connectDB from "../config/db";
import {Status} from "../models/Status.model";

const seedStatus = async () => {
  await connectDB();

  await Status.insertMany([
    { name: "ACTIVE" },
    { name: "INACTIVE" },
    { name: "BLOCKED" },
    { name: "ACTIVE SOON" },
    { name: "HOLD" },
  ]);

  console.log("✅ Status seeded");
  process.exit();
};

seedStatus();