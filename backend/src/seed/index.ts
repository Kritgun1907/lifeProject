import mongoose from "mongoose";
import { SeedContext } from "./seedContext";
import { HydratedDocument } from "mongoose";

// base models
import { Role } from "../models/Role.model";
import { Instrument } from "../models/Instrument.model";
import { WorkingDay } from "../models/WorkingDay.model";
import { WorkingTimings } from "../models/WorkingTime.model";
import { Status } from "../models/Status.model";
import { ClassPlan } from "../models/ClassPlan.model";

// seed functions
import { seedUsers } from "./User.seed";
import { seedBatches } from "./Batch.seed";
import { seedBatchStudents } from "./BatchStudent.seed";
import { seedStudentEnrollments } from "./StudentEnrollment.seed";
import { seedStudentBatchApplications } from "./StudentBatchApplication.seed";
import { seedBatchChangeRequests } from "./BatchChangeRequest.seed";
import { seedAnnouncements } from "./Announcement.seed";
import { seedAnnouncementBatches } from "./AnnouncementBatch.seed";
import { seedAnnouncementReads } from "./AnnouncementRead.seed";
import { seedAttendance } from "./Attendance.seed";
import { seedHolidays } from "./Holiday.seed";
import { seedZoomSessions } from "./ZoomSession.seed";
import { seedPayments } from "./Payment.seed";

const MONGO_URI = "mongodb://localhost:27017/maxmusicschool";

async function runSeed() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ MongoDB connected");

  // 1️⃣ Fetch roles (already seeded)
  const adminRole: HydratedDocument<any> | null =
  await Role.findOne({ name: "ADMIN" });
  const teacherRole: HydratedDocument<any> | null =
  await Role.findOne({ name: "TEACHER" });
  const studentRole: HydratedDocument<any> | null =
  await Role.findOne({ name: "STUDENT" });

  if (!adminRole || !teacherRole || !studentRole) {
    throw new Error("❌ Roles not seeded");
  }

// 2️⃣ Fetch base reference data
const instrument: HydratedDocument<any> | null =
await Instrument.findOne();
const workingDay: HydratedDocument<any> | null =
await WorkingDay.findOne();
const workingTiming: HydratedDocument<any> | null =
await WorkingTimings.findOne();
const status: HydratedDocument<any> | null =
await Status.findOne({ name: "ACTIVE" });
const classPlan: HydratedDocument<any> | null =
await ClassPlan.findOne({ code: "CLASS_1" });

if (!instrument || !workingDay || !workingTiming || !status || !classPlan) {
  console.error("Missing data:", { 
    instrument: !!instrument, 
    workingDay: !!workingDay, 
    workingTiming: !!workingTiming, 
    status: !!status, 
    classPlan: !!classPlan 
  });
  throw new Error("❌ Base reference data missing");
}


  // 3️⃣ Build SeedContext (roles + base refs)
  const context: SeedContext = {
    adminRoleId: adminRole._id.toString(),
    teacherRoleId: teacherRole._id.toString(),
    studentRoleId: studentRole._id.toString(),

    instrumentId: instrument._id.toString(),
    workingDayId: workingDay._id.toString(),
    workingTimingId: workingTiming._id.toString(),
    statusId: status._id.toString(),
    classPlanId: classPlan._id.toString(),
  };

  // 4️⃣ SEED USERS (THIS WAS MISSING)
  await seedUsers(context);

  // 5️⃣ Seed batches and get IDs
  const batches = await seedBatches(context);
  console.log('Batches returned:', batches);
  console.log('Batch 0:', batches?.[0]);
  console.log('Batch 1:', batches?.[1]);
  
  if (!batches || batches.length < 2) {
    throw new Error('❌ Failed to create batches');
  }
  
  context.batchId = batches[0]._id.toString();
  const newBatchId = batches[1]._id.toString();

  // 6️⃣ Seed dependent data with both batch IDs
  await seedBatchStudents(context);
  await seedStudentEnrollments(context);
  await seedStudentBatchApplications(context);
  await seedBatchChangeRequests({
    ...context,
    fromBatchId: context.batchId,
    toBatchId: newBatchId,
  });

  // 7️⃣ Seed additional features
  const announcementData = await seedAnnouncements(context);
  
  // Add announcement IDs to context for read tracking
  context.announcementId = announcementData.announcementId;
  context.announcement1Id = announcementData.announcement1Id;
  context.announcement2Id = announcementData.announcement2Id;
  context.announcement3Id = announcementData.announcement3Id;
  context.announcement4Id = announcementData.announcement4Id;
  context.announcement5Id = announcementData.announcement5Id;
  context.announcement6Id = announcementData.announcement6Id;
  
  await seedAnnouncementBatches({ ...context, announcementId: announcementData.announcementId });
  await seedAnnouncementReads(context); // NEW: Seed read tracking
  await seedAttendance(context);
  await seedHolidays(context);
  await seedZoomSessions(context);
  await seedPayments(context);

  await mongoose.disconnect();
  console.log("🌱 Database seeded successfully");
}

runSeed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
