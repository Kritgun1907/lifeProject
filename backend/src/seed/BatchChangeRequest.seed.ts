import { BatchChangeRequest } from '../models/BatchChangeRequest.model';

export const seedBatchChangeRequests = async ({
  studentId,
  fromBatchId,
  toBatchId,
  adminId,
}: any) => {
  await BatchChangeRequest.deleteMany();

  await BatchChangeRequest.create({
    student: studentId,
    fromBatch: fromBatchId,
    toBatch: toBatchId,
    reason: 'Schedule conflict',
    fromTeacherApproval: 'APPROVED',
    toTeacherApproval: 'APPROVED',
    finalStatus: 'APPROVED',
    finalizedBy: adminId,
  });

  console.log('✅ Batch change requests seeded');
};
