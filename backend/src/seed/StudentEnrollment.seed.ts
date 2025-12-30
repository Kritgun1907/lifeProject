import { StudentEnrollment } from '../models/StudentEnrollment.model';

export const seedStudentEnrollments = async ({
  studentId,
  batchId,
  classPlanId,
}: any) => {
  await StudentEnrollment.deleteMany();

  await StudentEnrollment.create({
    student: studentId,
    batch: batchId,
    classPlan: classPlanId,
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    status: 'ACTIVE',
  });

  console.log('✅ Student enrollments seeded');
};
