import { AnnouncementRead } from "../models/AnnouncementRead.model";
import { SeedContext } from "./seedContext";

export async function seedAnnouncementReads(context: SeedContext) {
  await AnnouncementRead.deleteMany();

  // Only seed if we have announcement IDs
  if (!context.announcement1Id || !context.studentId) {
    console.log("⏭️  Skipping AnnouncementRead seeding (missing IDs)");
    return {};
  }

  // Student 1 read announcement 1
  await AnnouncementRead.create({
    announcement: context.announcement1Id,
    user: context.studentId,
    readAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    hasInteracted: true,
  });

  // Student 1 read announcement 2
  await AnnouncementRead.create({
    announcement: context.announcement2Id,
    user: context.studentId,
    readAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    hasInteracted: true,
  });

  // Student 1 read announcement 3 (broadcast)
  await AnnouncementRead.create({
    announcement: context.announcement3Id,
    user: context.studentId,
    readAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
    hasInteracted: false,
  });

  // Teacher read announcement 3 (broadcast)
  if (context.teacherId) {
    await AnnouncementRead.create({
      announcement: context.announcement3Id,
      user: context.teacherId,
      readAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      hasInteracted: true,
    });
  }

  // Admin read announcement 4
  if (context.adminId) {
    await AnnouncementRead.create({
      announcement: context.announcement4Id,
      user: context.adminId,
      readAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      hasInteracted: true,
    });
  }

  console.log("✅ AnnouncementReads seeded (5 read records)");

  return {};
}
