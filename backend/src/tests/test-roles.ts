import mongoose from "mongoose";
import { Role } from "../models/Role.model";

async function runTest() {
  await mongoose.connect("mongodb://localhost:27017/maxmusicschool");

  try {
    console.log("Attempting to add invalid role: PRINCIPAL...");
    await Role.create({ name: "PRINCIPAL" });
  } catch (err: any) {
    console.log("✅ Caught expected error:");
    console.log(err.message);
  }

  await mongoose.disconnect();
}

runTest();