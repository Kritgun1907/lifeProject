import mongoose from "mongoose";
import { WorkingDay } from "../models/WorkingDay.model";
import { User } from "../models/User.model";
import { DayCode } from "../models/WorkingDay.model";

const MONGO_URI = "mongodb://localhost:27017/maxmusicschool";

async function seedWorkingDays() {
  await mongoose.connect(MONGO_URI);

  // Any admin user (creator reference)
  const admin = await User.findOne().where("role").exists(true);

  if (!admin) {
    throw new Error("No admin user found. Seed users first.");
  }

  const workingDays = [
    {
      name: "Mon-Wed-Fri",
      daysArray: ["MON", "WED", "FRI"],
      createdBy: admin._id
    },
    {
      name: "Tue-Thu-Sat",
      daysArray: ["TUE", "THU", "SAT"],
      createdBy: admin._id
    },
    {
      name: "Weekend",
      daysArray: ["SAT", "SUN"],
      createdBy: admin._id
    },
    {
      name: "All Week",
      daysArray: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
      createdBy: admin._id
    }
  ] satisfies {
  name: string;
  daysArray: DayCode[];
  createdBy: mongoose.Types.ObjectId;
}[];

  for (const day of workingDays) {
    const exists = await WorkingDay.findOne({ name: day.name });
    if (!exists) {  
      await WorkingDay.create(day);
      console.log(`✅ Created working day: ${day.name}`);
    }
  }

  await mongoose.disconnect();
}

seedWorkingDays().catch(err => {
  console.error(err);
  process.exit(1);
});
