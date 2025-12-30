import { Router } from 'express';
import BatchesController from './batches.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/authorize.middleware';
import { PERMISSIONS } from '../../constants/permissions';

const router = Router();

// All routes require authentication
router.use(authenticate);

// =============================================================================
// STUDENT ROUTES - View enrolled batches
// =============================================================================

// GET /api/batches/my - Student views their enrolled batches
router.get('/my', 
  authorize([PERMISSIONS.BATCH_READ_OWN]),
  BatchesController.getMyBatches
);

// GET /api/batches/my/:batchId/schedule - Student views batch schedule
router.get('/my/:batchId/schedule',
  authorize([PERMISSIONS.BATCH_READ_OWN]),
  BatchesController.getMyBatchSchedule
);

// GET /api/batches/my/:batchId/zoom - Student gets zoom link
router.get('/my/:batchId/zoom',
  authorize([PERMISSIONS.BATCH_READ_OWN]),
  BatchesController.getMyBatchZoomLink
);

// =============================================================================
// TEACHER ROUTES - Manage their batches
// =============================================================================

// GET /api/batches/teacher - Teacher views their batches
router.get('/teacher',
  authorize([PERMISSIONS.BATCH_READ_UNDER_TEACHER]),
  BatchesController.getTeacherBatches
);

// GET /api/batches/teacher/:batchId - Teacher views single batch
router.get('/teacher/:batchId',
  authorize([PERMISSIONS.BATCH_READ_UNDER_TEACHER]),
  BatchesController.getTeacherBatchById
);

// GET /api/batches/teacher/:batchId/students - Teacher views batch students
router.get('/teacher/:batchId/students',
  authorize([PERMISSIONS.BATCH_READ_UNDER_TEACHER]),
  BatchesController.getBatchStudents
);

// POST /api/batches/teacher/:batchId/zoom - Teacher creates zoom session
router.post('/teacher/:batchId/zoom',
  authorize([PERMISSIONS.BATCH_READ_UNDER_TEACHER]),
  BatchesController.createZoomSession
);

// =============================================================================
// ADMIN ROUTES - Full CRUD
// =============================================================================

// GET /api/batches - Admin views all batches
router.get('/',
  authorize([PERMISSIONS.BATCH_READ_ANY]),
  BatchesController.getAllBatches
);

// POST /api/batches - Admin creates batch
router.post('/',
  authorize([PERMISSIONS.BATCH_CREATE]),
  BatchesController.createBatch
);

// GET /api/batches/:id - Admin views single batch
router.get('/:id',
  authorize([PERMISSIONS.BATCH_READ_ANY]),
  BatchesController.getBatchById
);

// PUT /api/batches/:id - Admin updates batch
router.put('/:id',
  authorize([PERMISSIONS.BATCH_UPDATE]),
  BatchesController.updateBatch
);

// DELETE /api/batches/:id - Admin deletes batch
router.delete('/:id',
  authorize([PERMISSIONS.BATCH_DELETE]),
  BatchesController.deleteBatch
);

// POST /api/batches/:id/students - Admin adds student to batch
router.post('/:id/students',
  authorize([PERMISSIONS.BATCH_UPDATE]),
  BatchesController.addStudentToBatch
);

// DELETE /api/batches/:batchId/students/:studentId - Admin removes student
router.delete('/:batchId/students/:studentId',
  authorize([PERMISSIONS.BATCH_UPDATE]),
  BatchesController.removeStudentFromBatch
);

export default router;
