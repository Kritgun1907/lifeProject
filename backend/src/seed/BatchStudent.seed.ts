import { BatchStudent } from "../models/BatchStudent.model";
import { SeedContext } from "./seedContext";

export async function seedBatchStudents(context: SeedContext) {
  if (!context.batchId) {
    throw new Error("batchId missing. Run seedBatches first.");
  }

  await BatchStudent.deleteMany();

  await BatchStudent.create({
    batch: context.batchId,
    student: context.studentId,
  });

  console.log("✅ Batch students seeded");
}
