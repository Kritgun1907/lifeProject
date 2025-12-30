import mongoose from "mongoose";
import { ClassPlan } from '../models/ClassPlan.model';

const MONGO_URI = "mongodb://localhost:27017/maxmusicschool";

async function seedClassPlans() {
  await mongoose.connect(MONGO_URI);

  await ClassPlan.insertMany([
    {
      code: 'TRIAL',
      durationDays: 7,
      description: 'Trial plan',
    },
    {
      code: 'CLASS_1',
      durationDays: 90,
      description: 'Beginner level',
    },
    {
      code: 'CLASS_2',
      durationDays: 180,
      description: 'Intermediate level',
    },
    {
      code: 'CLASS_3',
      durationDays: 180,
      description: 'Advanced level',
    },
  ]);

console.log('✅ Class plans seeded');

 await mongoose.disconnect();
}

seedClassPlans().catch(err => {
  console.error(err);
  process.exit(1);
});
