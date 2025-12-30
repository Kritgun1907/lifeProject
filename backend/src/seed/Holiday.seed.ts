import { Holiday } from "../models/Holiday.model";
import { SeedContext } from "./seedContext";

export async function seedHolidays(context: SeedContext) {
  await Holiday.deleteMany();

  await Holiday.create({
    date: new Date(),
    batch: context.batchId,
    appliedBy: context.teacherId,
    appliedByRole: "TEACHER",
    reason: "Festival Holiday",
    status: "APPROVED",
  });

  console.log("✅ Holidays seeded");
}
