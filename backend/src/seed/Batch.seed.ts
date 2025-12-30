import { Batch } from '../models/Batch.model';

export const seedBatches = async ({
  instrumentId,
  teacherId,
  workingDayId,
  workingTimingId,
  statusId,
}: any) => {
  await Batch.deleteMany();

  const batches = await Batch.insertMany([
    {
      batchName: 'Guitar Beginners',
      instrument: instrumentId,
      teacher: teacherId,
      workingDay: workingDayId,
      workingTiming: workingTimingId,
      mode: 'ONLINE',
      maxStudents: 15,
      status: statusId,
    },
    {
      batchName: 'Piano Intermediate',
      instrument: instrumentId,
      teacher: teacherId,
      workingDay: workingDayId,
      workingTiming: workingTimingId,
      mode: 'OFFLINE',
      maxStudents: 15,
      status: statusId,
    },
  ]);

  console.log('✅ Batches seeded');
  return batches;
};
