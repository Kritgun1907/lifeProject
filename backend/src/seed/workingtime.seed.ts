import mongoose from "mongoose";
import { WorkingTimings } from "../models/WorkingTime.model";
import { User } from "../models/User.model";

const MONGO_URI = "mongodb://localhost:27017/maxmusicschool";

async function seedWorkingTimings() {
  await mongoose.connect(MONGO_URI);

  const admin = await User.findOne();
  if (!admin) {
    throw new Error("No admin user found. Seed users first.");
  }

  const timings: [string, string][] = [
    ["06:00", "07:00"],
    ["07:00", "08:00"],
    ["08:00", "09:00"],
    ["09:00", "10:00"],
    ["10:00", "11:00"],
    ["11:00", "12:00"],
    ["12:00", "13:00"],
    ["13:00", "14:00"],
    ["14:00", "15:00"],
    ["15:00", "16:00"],
    ["16:00", "17:00"],
    ["17:00", "18:00"],
    ["18:00", "19:00"],
    ["19:00", "20:00"],
    ["20:00", "21:00"],
    ["21:00", "22:00"]
  ];

  for (const [start, end] of timings) {
    const time_range = `${start} - ${end}`;

    const exists = await WorkingTimings.findOne({ time_range });
    if (!exists) {
      await WorkingTimings.create({
        time_range,
        start_time: start,
        end_time: end,
        created_by: admin._id
      });

      console.log(`✅ Created timing: ${time_range}`);
    }
  }

  await mongoose.disconnect();
}

seedWorkingTimings().catch(err => {
  console.error(err);
  process.exit(1);
});
