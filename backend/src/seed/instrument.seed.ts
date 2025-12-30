import mongoose from "mongoose";
import { Instrument } from "../models/Instrument.model";

const MONGO_URI = "mongodb://localhost:27017/maxmusicschool";

async function seedInstruments() {
  await mongoose.connect(MONGO_URI);

  await Instrument.deleteMany({});

  await Instrument.insertMany([
    { name: "Guitar" },
    { name: "Piano" },
    { name: "Vocal" },
    { name: "Violin" }
  ]);

  console.log("✅ Instruments seeded");

  await mongoose.disconnect();
}

seedInstruments().catch(err => {
  console.error(err);
  process.exit(1);
});
