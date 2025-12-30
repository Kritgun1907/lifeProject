export interface SeedContext {
  // role IDs
  adminRoleId: string;
  teacherRoleId: string;
  studentRoleId: string;

  // user IDs
  adminId?: string;
  teacherId?: string;
  studentId?: string;
  guestUserId?: string;

  // other refs
  instrumentId: string;
  workingDayId: string;
  workingTimingId: string;
  statusId: string;
  classPlanId: string;

  // generated later
  batchId?: string;
  
  // announcement IDs (for read tracking)
  announcementId?: string;
  announcement1Id?: string;
  announcement2Id?: string;
  announcement3Id?: string;
  announcement4Id?: string;
  announcement5Id?: string;
  announcement6Id?: string;
}
