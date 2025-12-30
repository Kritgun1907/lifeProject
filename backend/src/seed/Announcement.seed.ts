import { Announcement } from "../models/Announcement.model";
import { SeedContext } from "./seedContext";

export async function seedAnnouncements(context: SeedContext) {
  await Announcement.deleteMany();

  // 1. Regular announcement with basic details
  const announcement1 = await Announcement.create({
    title: "Welcome to New Term",
    description: "Classes will begin from Monday. Please be on time.",
    urgency: "NORMAL",
    contentType: "PLAIN",
    createdBy: context.adminId,
    targetAudience: "STUDENTS",
    viewCount: 0,
    isPinned: false,
  });

  // 2. Urgent announcement with attachments
  const announcement2 = await Announcement.create({
    title: "Important: Exam Schedule Released",
    description: "Please check the attached PDF for detailed exam schedule and guidelines.",
    urgency: "URGENT",
    contentType: "PLAIN",
    createdBy: context.teacherId,
    targetAudience: "STUDENTS",
    attachments: [
      {
        type: "DOCUMENT",
        url: "https://example.com/exam-schedule.pdf",
        filename: "exam-schedule.pdf",
        mimeType: "application/pdf",
        size: 1024000,
      },
      {
        type: "IMAGE",
        url: "https://example.com/timetable.jpg",
        filename: "timetable.jpg",
        mimeType: "image/jpeg",
        size: 512000,
      },
    ],
    viewCount: 0,
    isPinned: false,
  });

  // 3. Broadcast announcement (admin only)
  const announcement3 = await Announcement.create({
    title: "School Holiday - Independence Day",
    description: "School will remain closed on 15th August for Independence Day celebration. All classes are cancelled.",
    urgency: "URGENT",
    contentType: "HTML",
    createdBy: context.adminId,
    targetAudience: "ALL",
    isBroadcast: true,
    isPinned: true,
    viewCount: 0,
  });

  // 4. Announcement with rich content (Markdown)
  const announcement4 = await Announcement.create({
    title: "Study Materials - Week 1",
    description: `# Week 1 Study Materials

## Topics Covered
- Introduction to Music Theory
- Basic Scales and Chords
- Rhythm Fundamentals

## Resources
Check the attached video tutorial and PDF notes.`,
    urgency: "NORMAL",
    contentType: "MARKDOWN",
    createdBy: context.teacherId,
    targetAudience: "STUDENTS",
    attachments: [
      {
        type: "VIDEO",
        url: "https://example.com/lesson-1.mp4",
        filename: "lesson-1.mp4",
        mimeType: "video/mp4",
        size: 50000000,
        thumbnail: "https://example.com/lesson-1-thumb.jpg",
      },
      {
        type: "AUDIO",
        url: "https://example.com/scale-practice.mp3",
        filename: "scale-practice.mp3",
        mimeType: "audio/mpeg",
        size: 5000000,
      },
    ],
    viewCount: 0,
    isPinned: false,
  });

  // 5. Announcement with expiry
  const announcement5 = await Announcement.create({
    title: "Flash Sale - 20% Off on Course Fees",
    description: "Limited time offer! Get 20% discount on all course fees if you enroll by this weekend.",
    urgency: "URGENT",
    contentType: "PLAIN",
    createdBy: context.adminId,
    targetAudience: "ALL",
    isBroadcast: true,
    isPinned: true,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expires in 7 days
    viewCount: 0,
  });

  // 6. Teacher-specific announcement
  const announcement6 = await Announcement.create({
    title: "Staff Meeting - Friday 3 PM",
    description: "Monthly staff meeting to discuss student progress and upcoming events. Attendance is mandatory.",
    urgency: "NORMAL",
    contentType: "PLAIN",
    createdBy: context.adminId,
    targetAudience: "TEACHERS",
    isBroadcast: true,
    viewCount: 0,
    isPinned: false,
  });

  console.log("✅ Announcements seeded (6 announcements with enhanced features)");

  return {
    announcementId: announcement1._id.toString(),
    announcement1Id: announcement1._id.toString(),
    announcement2Id: announcement2._id.toString(),
    announcement3Id: announcement3._id.toString(),
    announcement4Id: announcement4._id.toString(),
    announcement5Id: announcement5._id.toString(),
    announcement6Id: announcement6._id.toString(),
  };
}
