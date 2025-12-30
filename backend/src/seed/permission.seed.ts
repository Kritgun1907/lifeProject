import connectDB from "../config/db";
import { Permission } from "../models/Permission.model";
import { PERMISSIONS } from "../constants/permissions";

const seedPermissions = async () => {
  await connectDB();

  // Delete existing permissions
  await Permission.deleteMany({});

  const permissionsData = [
    // Profile & Account
    { name: "Read Own Profile", code: PERMISSIONS.PROFILE_READ_SELF, category: "PROFILE", description: "View own profile information" },
    { name: "Update Own Profile (Limited)", code: PERMISSIONS.PROFILE_UPDATE_SELF_LIMITED, category: "PROFILE", description: "Update basic profile fields" },
    { name: "Update Own Profile (Full)", code: PERMISSIONS.PROFILE_UPDATE_SELF_FULL, category: "PROFILE", description: "Update all profile fields including sensitive data" },
    { name: "Update Student Profile (Under Batch)", code: PERMISSIONS.PROFILE_UPDATE_STUDENT_UNDER_BATCH, category: "PROFILE", description: "Update profiles of students in assigned batches" },
    { name: "Update Any Student Profile", code: PERMISSIONS.PROFILE_UPDATE_STUDENT_ANY, category: "PROFILE", description: "Update any student profile" },
    { name: "Change Own Password", code: PERMISSIONS.PASSWORD_CHANGE_SELF, category: "PROFILE", description: "Change own password" },

    // Student
    { name: "Read Own Student Data", code: PERMISSIONS.STUDENT_READ_SELF, category: "STUDENT", description: "View own student information" },
    { name: "Read Students (Under Batch)", code: PERMISSIONS.STUDENT_READ_UNDER_BATCH, category: "STUDENT", description: "View students in assigned batches" },
    { name: "Read Any Student", code: PERMISSIONS.STUDENT_READ_ANY, category: "STUDENT", description: "View any student data" },
    { name: "Create Student", code: PERMISSIONS.STUDENT_CREATE, category: "STUDENT", description: "Create new student accounts" },
    { name: "Update Student Status (Under Batch)", code: PERMISSIONS.STUDENT_UPDATE_STATUS_UNDER_BATCH, category: "STUDENT", description: "Update status of students in assigned batches" },
    { name: "Update Any Student Status", code: PERMISSIONS.STUDENT_UPDATE_STATUS_ANY, category: "STUDENT", description: "Update any student status" },

    // Teacher
    { name: "Read Own Teacher Data", code: PERMISSIONS.TEACHER_READ_SELF, category: "TEACHER", description: "View own teacher information" },
    { name: "Read Any Teacher", code: PERMISSIONS.TEACHER_READ_ANY, category: "TEACHER", description: "View any teacher data" },
    { name: "Create Teacher", code: PERMISSIONS.TEACHER_CREATE, category: "TEACHER", description: "Create new teacher accounts" },
    { name: "Update Teacher", code: PERMISSIONS.TEACHER_UPDATE, category: "TEACHER", description: "Update teacher information" },

    // Batch
    { name: "Read Own Batches", code: PERMISSIONS.BATCH_READ_OWN, category: "BATCH", description: "View batches enrolled in" },
    { name: "Read Batches (Under Teacher)", code: PERMISSIONS.BATCH_READ_UNDER_TEACHER, category: "BATCH", description: "View assigned batches as teacher" },
    { name: "Read Any Batch", code: PERMISSIONS.BATCH_READ_ANY, category: "BATCH", description: "View any batch" },
    { name: "Create Batch", code: PERMISSIONS.BATCH_CREATE, category: "BATCH", description: "Create new batches" },
    { name: "Update Batch", code: PERMISSIONS.BATCH_UPDATE, category: "BATCH", description: "Update batch information" },
    { name: "Delete Batch", code: PERMISSIONS.BATCH_DELETE, category: "BATCH", description: "Delete batches" },

    // Attendance
    { name: "Read Own Attendance", code: PERMISSIONS.ATTENDANCE_READ_SELF, category: "ATTENDANCE", description: "View own attendance records" },
    { name: "Read Attendance (Under Batch)", code: PERMISSIONS.ATTENDANCE_READ_UNDER_BATCH, category: "ATTENDANCE", description: "View attendance of assigned batches" },
    { name: "Read Any Attendance", code: PERMISSIONS.ATTENDANCE_READ_ANY, category: "ATTENDANCE", description: "View any attendance records" },
    { name: "Update Attendance (Under Batch)", code: PERMISSIONS.ATTENDANCE_UPDATE_UNDER_BATCH, category: "ATTENDANCE", description: "Mark attendance for assigned batches" },
    { name: "Update Any Attendance", code: PERMISSIONS.ATTENDANCE_UPDATE_ANY, category: "ATTENDANCE", description: "Mark attendance for any batch" },

    // Batch Change
    { name: "Create Batch Change Request", code: PERMISSIONS.BATCH_CHANGE_CREATE, category: "BATCH_CHANGE", description: "Request to change batch" },
    { name: "Read Batch Changes (Under Batch)", code: PERMISSIONS.BATCH_CHANGE_READ_UNDER_BATCH, category: "BATCH_CHANGE", description: "View batch change requests for assigned batches" },
    { name: "Read Any Batch Changes", code: PERMISSIONS.BATCH_CHANGE_READ_ANY, category: "BATCH_CHANGE", description: "View all batch change requests" },
    { name: "Approve Batch Changes (Under Batch)", code: PERMISSIONS.BATCH_CHANGE_APPROVE_UNDER_BATCH, category: "BATCH_CHANGE", description: "Approve batch changes for assigned batches" },
    { name: "Approve Any Batch Changes", code: PERMISSIONS.BATCH_CHANGE_APPROVE_ANY, category: "BATCH_CHANGE", description: "Approve any batch change request" },

    // Announcements
    { name: "Read Announcements", code: PERMISSIONS.ANNOUNCEMENT_READ, category: "ANNOUNCEMENT", description: "View announcements" },
    { name: "Create Announcement", code: PERMISSIONS.ANNOUNCEMENT_CREATE, category: "ANNOUNCEMENT", description: "Create new announcements" },
    { name: "Update Announcement", code: PERMISSIONS.ANNOUNCEMENT_UPDATE, category: "ANNOUNCEMENT", description: "Update announcements" },
    { name: "Delete Announcement", code: PERMISSIONS.ANNOUNCEMENT_DELETE, category: "ANNOUNCEMENT", description: "Delete announcements" },

    // Practice
    { name: "Access Practice Library", code: PERMISSIONS.PRACTICE_ACCESS, category: "PRACTICE", description: "Access practice materials and resources" },

    // Zoom
    { name: "Post Zoom Link (Under Batch)", code: PERMISSIONS.ZOOM_POST_UNDER_BATCH, category: "ZOOM", description: "Post Zoom links for assigned batches" },
    { name: "Post Any Zoom Link", code: PERMISSIONS.ZOOM_POST_ANY, category: "ZOOM", description: "Post Zoom links for any batch" },
    { name: "View Zoom Links (Under Batch)", code: PERMISSIONS.ZOOM_VIEW_UNDER_BATCH, category: "ZOOM", description: "View Zoom links for enrolled batches" },
    { name: "View All Zoom Links", code: PERMISSIONS.ZOOM_VIEW_ALL, category: "ZOOM", description: "View all Zoom links" },

    // Analytics
    { name: "View Analytics (Under Batch)", code: PERMISSIONS.ANALYTICS_VIEW_UNDER_BATCH, category: "ANALYTICS", description: "View analytics for assigned batches" },
    { name: "View Any Analytics", code: PERMISSIONS.ANALYTICS_VIEW_ANY, category: "ANALYTICS", description: "View all analytics" },
    { name: "Generate Reports", code: PERMISSIONS.REPORT_GENERATE, category: "ANALYTICS", description: "Generate system reports" },

    // Payments
    { name: "Read Own Payments", code: PERMISSIONS.PAYMENT_READ_SELF, category: "PAYMENT", description: "View own payment history" },
    { name: "Read Payments (Under Batch)", code: PERMISSIONS.PAYMENT_READ_UNDER_BATCH, category: "PAYMENT", description: "View payments for students in assigned batches" },
    { name: "Read Any Payments", code: PERMISSIONS.PAYMENT_READ_ANY, category: "PAYMENT", description: "View all payment records" },

    // Holidays & Scheduling
    { name: "View Holidays", code: PERMISSIONS.HOLIDAY_READ, category: "HOLIDAY", description: "View holiday calendar" },
    { name: "Declare Holidays (Under Batch)", code: PERMISSIONS.HOLIDAY_DECLARE_UNDER_BATCH, category: "HOLIDAY", description: "Declare holidays for assigned batches" },
    { name: "Declare Any Holidays", code: PERMISSIONS.HOLIDAY_DECLARE_ANY, category: "HOLIDAY", description: "Declare holidays for any batch" },
    { name: "Reschedule Classes (Under Batch)", code: PERMISSIONS.SCHEDULE_RESCHEDULE_UNDER_BATCH, category: "SCHEDULE", description: "Reschedule classes for assigned batches" },
    { name: "Reschedule Any Classes", code: PERMISSIONS.SCHEDULE_RESCHEDULE_ANY, category: "SCHEDULE", description: "Reschedule any class" },

    // System
    { name: "Assign Roles", code: PERMISSIONS.ROLE_ASSIGN, category: "SYSTEM", description: "Assign roles to users" },
    { name: "Database Access", code: PERMISSIONS.DATABASE_ACCESS, category: "SYSTEM", description: "Direct database access" },
    { name: "System Configuration", code: PERMISSIONS.SYSTEM_CONFIGURE, category: "SYSTEM", description: "Configure system settings" },
  ];

  await Permission.insertMany(permissionsData);

  console.log(`✅ ${permissionsData.length} Permissions seeded`);
  process.exit();
};

seedPermissions();
