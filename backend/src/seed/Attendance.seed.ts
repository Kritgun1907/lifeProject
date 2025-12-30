import { Attendance } from "../models/Attendance.model";
import { SeedContext } from "./seedContext";

export async function seedAttendance(context: SeedContext) {
  await Attendance.deleteMany();

  await Attendance.create({
    student: context.studentId,
    batch: context.batchId,
    status: "PRESENT",
    date: new Date(),
    markedBy: context.teacherId,
  });

  console.log("✅ Attendance seeded");
}
