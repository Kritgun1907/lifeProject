import { Payment } from "../models/Payment.model";
import { SeedContext } from "./seedContext";

export async function seedPayments(context: SeedContext) {
  await Payment.deleteMany();

  await Payment.create({
    student: context.studentId,
    batch: context.batchId,
    classPlan: context.classPlanId,
    amount: 2500,
    paymentMethod: "UPI",
    status: "SUCCESS",
    transactionId: "TXN123456",
    paidAt: new Date(),
  });

  console.log("✅ Payments seeded");
}
