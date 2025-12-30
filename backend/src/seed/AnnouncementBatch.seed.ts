import { AnnouncementBatch } from "../models/AnnouncementBatch.model";
import { SeedContext } from "./seedContext";

export async function seedAnnouncementBatches(
  context: SeedContext & { announcementId: string }
) {
  await AnnouncementBatch.deleteMany();

  await AnnouncementBatch.create({
    announcement: context.announcementId,
    batch: context.batchId,
  });

  console.log("✅ Announcement–Batch mapping seeded");
}
