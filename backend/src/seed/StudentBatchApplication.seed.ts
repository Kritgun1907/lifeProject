import { StudentBatchApplication } from '../models/StudentBatchApplication.model';

export const seedStudentBatchApplications = async ({
  guestUserId,
  instrumentId,
  workingDayId,
  workingTimingId,
  batchId,
  adminId,
}: any) => {
  await StudentBatchApplication.deleteMany();

  await StudentBatchApplication.create({
    guestUser: guestUserId,
    preferredInstrument: instrumentId,
    preferredDay: workingDayId,
    preferredTiming: workingTimingId,
    mode: 'ONLINE',
    status: 'APPROVED',
    assignedBatch: batchId,
    handledBy: adminId,
  });

  console.log('✅ Student batch applications seeded');
};
