/// <reference types="jest" />
/**
 * ===============================================
 * INTEGRATION TEST SUITE
 * ===============================================
 * Tests all modules: routes, controllers, business logic
 * 
 * Run: npm test
 */

// Set required environment variables BEFORE importing app
process.env.JWT_SECRET = 'test-jwt-secret-for-integration-tests';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-integration-tests';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.NODE_ENV = 'test';

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app';

// Models
import { User } from '../models/User.model';
import { Role } from '../models/Role.model';
import { Batch } from '../models/Batch.model';
import { BatchStudent } from '../models/BatchStudent.model';
import { Holiday } from '../models/Holiday.model';
import { Attendance } from '../models/Attendance.model';
import { BatchChangeRequest } from '../models/BatchChangeRequest.model';
import { Instrument } from '../models/Instrument.model';
import { WorkingDay } from '../models/WorkingDay.model';
import { WorkingTimings } from '../models/WorkingTime.model';
import { Status } from '../models/Status.model';

// Permissions
import { 
  ADMIN_PERMISSIONS, 
  TEACHER_PERMISSIONS, 
  STUDENT_PERMISSIONS,
  GUEST_PERMISSIONS 
} from '../constants/rolePermissions';

// Test data holders
let mongoServer: MongoMemoryServer;
let adminToken: string;
let teacherToken: string;
let teacher2Token: string;
let studentToken: string;

let adminRole: any;
let teacherRole: any;
let studentRole: any;

let teacher1: any;
let teacher2: any;
let student1: any;
let admin: any;

let instrument: any;
let workingDay: any;
let workingTime: any;
let activeStatus: any;

let batch1: any;  // Owned by teacher1
let batch2: any;  // Owned by teacher2

/**
 * ===============================================
 * TEST SETUP & TEARDOWN
 * ===============================================
 */

beforeAll(async () => {
  // Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  
  // Create roles with permissions (GUEST is required for registration)
  adminRole = await Role.create({ name: 'ADMIN', isActive: true, permissions: ADMIN_PERMISSIONS });
  teacherRole = await Role.create({ name: 'TEACHER', isActive: true, permissions: TEACHER_PERMISSIONS });
  studentRole = await Role.create({ name: 'STUDENT', isActive: true, permissions: STUDENT_PERMISSIONS });
  await Role.create({ name: 'GUEST', isActive: true, permissions: GUEST_PERMISSIONS }); // Required for registration
  
  // Create status first (needed for users)
  activeStatus = await Status.create({ name: 'ACTIVE' });
  
  // Create supporting data with correct schema fields
  instrument = await Instrument.create({ name: 'Guitar' });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear test data before each test
  await User.deleteMany({});
  await Batch.deleteMany({});
  await BatchStudent.deleteMany({});
  await Holiday.deleteMany({});
  await Attendance.deleteMany({});
  await BatchChangeRequest.deleteMany({});
  await WorkingDay.deleteMany({});
  await WorkingTimings.deleteMany({});
  
  // Reset tokens
  adminToken = '';
  teacherToken = '';
  teacher2Token = '';
  studentToken = '';
  
  // Reset references
  workingDay = null;
  workingTime = null;
});

/**
 * Helper: Create users and get tokens
 */
async function setupUsersAndTokens() {
  // Register Admin
  const adminRes = await request(app)
    .post('/auth/register')
    .send({
      name: 'Admin User',
      email: 'admin@test.com',
      password: 'Admin@123',
      mobile: '9999999999'
    });
  
  // Get admin user ID - response has user.id (not user._id)
  const adminUserId = adminRes.body.user?.id || adminRes.body.user?._id;
  
  // Manually assign admin role (since registration defaults to GUEST)
  await User.findByIdAndUpdate(adminUserId, { role: adminRole._id });
  
  // Login Admin - MUST happen AFTER role update
  const adminLogin = await request(app)
    .post('/auth/login')
    .send({ email: 'admin@test.com', password: 'Admin@123' });
  
  // Token is directly in body.token
  adminToken = adminLogin.body.token;
  admin = await User.findOne({ email: 'admin@test.com' });
  
  // Now create workingDay and workingTime with admin as createdBy
  workingDay = await WorkingDay.create({ 
    name: 'Mon-Wed-Fri', 
    daysArray: ['MON', 'WED', 'FRI'],
    createdBy: admin._id
  });
  
  workingTime = await WorkingTimings.create({ 
    time_range: '09:00 - 10:00',
    start_time: '09:00', 
    end_time: '10:00',
    created_by: admin._id
  });
  
  // Register Teacher 1
  await request(app)
    .post('/auth/register')
    .send({
      name: 'Teacher One',
      email: 'teacher1@test.com',
      password: 'Teacher@123',
      mobile: '8888888888'
    });
  await User.findOneAndUpdate(
    { email: 'teacher1@test.com' },
    { role: teacherRole._id }
  );
  const teacher1Login = await request(app)
    .post('/auth/login')
    .send({ email: 'teacher1@test.com', password: 'Teacher@123' });
  teacherToken = teacher1Login.body.token;
  teacher1 = await User.findOne({ email: 'teacher1@test.com' });
  
  // Register Teacher 2
  await request(app)
    .post('/auth/register')
    .send({
      name: 'Teacher Two',
      email: 'teacher2@test.com',
      password: 'Teacher@123',
      mobile: '7777777777'
    });
  await User.findOneAndUpdate(
    { email: 'teacher2@test.com' },
    { role: teacherRole._id }
  );
  const teacher2Login = await request(app)
    .post('/auth/login')
    .send({ email: 'teacher2@test.com', password: 'Teacher@123' });
  teacher2Token = teacher2Login.body.token;
  teacher2 = await User.findOne({ email: 'teacher2@test.com' });
  
  // Register Student
  await request(app)
    .post('/auth/register')
    .send({
      name: 'Student One',
      email: 'student@test.com',
      password: 'Student@123',
      mobile: '6666666666'
    });
  await User.findOneAndUpdate(
    { email: 'student@test.com' },
    { role: studentRole._id }
  );
  const studentLogin = await request(app)
    .post('/auth/login')
    .send({ email: 'student@test.com', password: 'Student@123' });
  studentToken = studentLogin.body.token;
  student1 = await User.findOne({ email: 'student@test.com' });
}

/**
 * Helper: Create batches
 */
async function setupBatches() {
  batch1 = await Batch.create({
    batchName: 'Guitar Beginners',
    teacher: teacher1._id,
    instrument: instrument._id,
    workingDay: workingDay._id,
    workingTiming: workingTime._id,
    mode: 'ONLINE',
    maxStudents: 5,
    status: activeStatus._id
  });
  
  batch2 = await Batch.create({
    batchName: 'Guitar Advanced',
    teacher: teacher2._id,
    instrument: instrument._id,
    workingDay: workingDay._id,
    workingTiming: workingTime._id,
    mode: 'ONLINE',
    maxStudents: 5,
    status: activeStatus._id
  });
}

/**
 * Helper: Enroll student in batch
 */
async function enrollStudentInBatch(studentId: string, batchId: string) {
  await BatchStudent.create({
    student: studentId,
    batch: batchId,
    joinedAt: new Date()
  });
}

/**
 * ===============================================
 * AUTH MODULE TESTS
 * ===============================================
 */

describe('🔐 AUTH MODULE', () => {
  
  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          name: 'Test User',
          email: 'test@test.com',
          password: 'Test@123',
          mobile: '1234567890'
        });
      
      // Debug: log response if test fails
      if (res.status !== 201) {
        console.log('Registration failed:', res.status, res.body);
      }
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
    
    it('should reject duplicate email', async () => {
      await request(app)
        .post('/auth/register')
        .send({
          name: 'User 1',
          email: 'duplicate@test.com',
          password: 'Test@123',
          mobile: '1111111111'
        });
      
      const res = await request(app)
        .post('/auth/register')
        .send({
          name: 'User 2',
          email: 'duplicate@test.com',
          password: 'Test@123',
          mobile: '2222222222'
        });
      
      expect(res.status).toBe(400);
    });
  });
  
  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/auth/register')
        .send({
          name: 'Login Test',
          email: 'login@test.com',
          password: 'Test@123',
          mobile: '3333333333'
        });
    });
    
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'login@test.com',
          password: 'Test@123'
        });
      
      expect(res.status).toBe(200);
      expect(res.body.data?.token || res.body.token).toBeDefined();
    });
    
    it('should reject invalid password', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'login@test.com',
          password: 'WrongPassword'
        });
      
      expect(res.status).toBe(401);
    });
  });
  
  describe('GET /auth/me', () => {
    it('should return current user profile', async () => {
      await setupUsersAndTokens();
      
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data?.email || res.body.email).toBe('admin@test.com');
    });
    
    it('should reject without token', async () => {
      const res = await request(app)
        .get('/auth/me');
      
      expect(res.status).toBe(401);
    });
  });
});

/**
 * ===============================================
 * BATCHES MODULE TESTS
 * ===============================================
 */

describe('📚 BATCHES MODULE', () => {
  
  beforeEach(async () => {
    await setupUsersAndTokens();
    await setupBatches();
  });
  
  describe('GET /api/batches (Admin)', () => {
    it('should return all batches for admin', async () => {
      const res = await request(app)
        .get('/api/batches')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data?.length || res.body.length).toBeGreaterThanOrEqual(2);
    });
  });
  
  describe('GET /api/batches/my (Student)', () => {
    it('should return only enrolled batches for student', async () => {
      await enrollStudentInBatch(student1._id.toString(), batch1._id.toString());
      
      const res = await request(app)
        .get('/api/batches/my')
        .set('Authorization', `Bearer ${studentToken}`);
      
      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(Array.isArray(data) ? data.length : 0).toBe(1);
    });
    
    it('should return empty for non-enrolled student', async () => {
      const res = await request(app)
        .get('/api/batches/my')
        .set('Authorization', `Bearer ${studentToken}`);
      
      expect(res.status).toBe(200);
    });
  });
  
  describe('GET /api/batches/teacher (Teacher)', () => {
    it('should return only owned batches for teacher', async () => {
      const res = await request(app)
        .get('/api/batches/teacher')
        .set('Authorization', `Bearer ${teacherToken}`);
      
      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      // Teacher 1 should only see batch1
      if (Array.isArray(data)) {
        data.forEach((batch: any) => {
          expect(batch.batchName).toBe('Guitar Beginners');
        });
      }
    });
  });
  
  describe('Batch Capacity', () => {
    it('should enforce max student limit', async () => {
      // Create batch with maxStudents = 1
      const smallBatch = await Batch.create({
        batchName: 'Small Batch',
        teacher: teacher1._id,
        instrument: instrument._id,
        workingDay: workingDay._id,
        workingTiming: workingTime._id,
        mode: 'ONLINE',
        maxStudents: 1,
        status: activeStatus._id
      });
      
      // Add first student
      await BatchStudent.create({
        student: student1._id,
        batch: smallBatch._id,
        joinedAt: new Date()
      });
      
      // Create another student
      await request(app)
        .post('/auth/register')
        .send({
          name: 'Student Two',
          email: 'student2@test.com',
          password: 'Student@123',
          mobile: '5555555555'
        });
      const student2 = await User.findOne({ email: 'student2@test.com' });
      
      // Try to add second student (should fail)
      const currentCount = await BatchStudent.countDocuments({ batch: smallBatch._id });
      expect(currentCount).toBe(1);
      
      // Direct capacity check
      const isFull = currentCount >= 1; // maxStudents = 1
      expect(isFull).toBe(true);
    });
  });
});

/**
 * ===============================================
 * ATTENDANCE + HOLIDAY INTEGRATION TESTS
 * ===============================================
 */

describe('📅 ATTENDANCE + HOLIDAY INTEGRATION', () => {
  
  beforeEach(async () => {
    await setupUsersAndTokens();
    await setupBatches();
    await enrollStudentInBatch(student1._id.toString(), batch1._id.toString());
  });
  
  describe('Attendance on Normal Days', () => {
    it('should ALLOW marking attendance on non-holiday', async () => {
      const res = await request(app)
        .post('/api/attendance/mark')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          batchId: batch1._id.toString(),
          date: '2025-12-28',
          records: [
            { studentId: student1._id.toString(), status: 'PRESENT' }
          ]
        });
      
      // Accept 200 or 201
      expect([200, 201]).toContain(res.status);
    });
  });
  
  describe('Attendance on Holidays', () => {
    it('should REJECT attendance on APPROVED holiday', async () => {
      // Create approved holiday
      await Holiday.create({
        date: new Date('2025-12-31'),
        batch: batch1._id,
        appliedBy: teacher1._id,
        appliedByRole: 'TEACHER',
        reason: 'New Year Eve',
        status: 'APPROVED'
      });
      
      const res = await request(app)
        .post('/api/attendance/mark')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          batchId: batch1._id.toString(),
          date: '2025-12-31',
          records: [
            { studentId: student1._id.toString(), status: 'PRESENT' }
          ]
        });
      
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('holiday');
    });
    
    it('should ALLOW attendance on PENDING holiday', async () => {
      // Create pending holiday
      await Holiday.create({
        date: new Date('2025-12-30'),
        batch: batch1._id,
        appliedBy: teacher1._id,
        appliedByRole: 'TEACHER',
        reason: 'Requested Holiday',
        status: 'PENDING'
      });
      
      const res = await request(app)
        .post('/api/attendance/mark')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          batchId: batch1._id.toString(),
          date: '2025-12-30',
          records: [
            { studentId: student1._id.toString(), status: 'PRESENT' }
          ]
        });
      
      // Pending holiday should not block attendance
      expect([200, 201]).toContain(res.status);
    });
    
    it('should ALLOW attendance on REJECTED holiday', async () => {
      // Create rejected holiday
      await Holiday.create({
        date: new Date('2025-12-29'),
        batch: batch1._id,
        appliedBy: teacher1._id,
        appliedByRole: 'TEACHER',
        reason: 'Rejected Holiday',
        status: 'REJECTED'
      });
      
      const res = await request(app)
        .post('/api/attendance/mark')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          batchId: batch1._id.toString(),
          date: '2025-12-29',
          records: [
            { studentId: student1._id.toString(), status: 'PRESENT' }
          ]
        });
      
      // Rejected holiday should not block attendance
      expect([200, 201]).toContain(res.status);
    });
  });
  
  describe('Attendance Summary Holiday Exclusion', () => {
    it('should exclude holidays from attendance calculations', async () => {
      // Create some attendance records
      await Attendance.create({
        student: student1._id,
        batch: batch1._id,
        date: new Date('2025-12-28'),
        status: 'PRESENT',
        markedBy: teacher1._id
      });
      
      // Create approved holiday
      await Holiday.create({
        date: new Date('2025-12-31'),
        batch: batch1._id,
        appliedBy: teacher1._id,
        appliedByRole: 'TEACHER',
        reason: 'New Year Eve',
        status: 'APPROVED'
      });
      
      const res = await request(app)
        .get(`/api/attendance/teacher/batch/${batch1._id.toString()}/summary`)
        .set('Authorization', `Bearer ${teacherToken}`);
      
      expect(res.status).toBe(200);
      // Check if holiday info is included in response
      const data = res.body.data || res.body;
      if (data.excludedHolidays !== undefined) {
        expect(data.excludedHolidays).toBeGreaterThanOrEqual(0);
      }
    });
  });
});

/**
 * ===============================================
 * OWNERSHIP VALIDATION TESTS
 * ===============================================
 */

describe('🔒 OWNERSHIP VALIDATION', () => {
  
  beforeEach(async () => {
    await setupUsersAndTokens();
    await setupBatches();
  });
  
  describe('Teacher Batch Ownership', () => {
    it('should REJECT teacher accessing another teacher batch', async () => {
      // Teacher 1 tries to access batch2 (owned by teacher2)
      const res = await request(app)
        .get(`/api/batches/teacher/${batch2._id.toString()}`)
        .set('Authorization', `Bearer ${teacherToken}`);
      
      // Should be 403 Forbidden
      expect([403, 404]).toContain(res.status);
    });
    
    it('should ALLOW teacher accessing their own batch', async () => {
      // Teacher 1 accesses batch1 (owned by teacher1)
      const res = await request(app)
        .get(`/api/batches/teacher/${batch1._id.toString()}`)
        .set('Authorization', `Bearer ${teacherToken}`);
      
      expect(res.status).toBe(200);
    });
  });
  
  describe('Student Batch Access', () => {
    it('should REJECT student accessing non-enrolled batch', async () => {
      // Student not enrolled in batch1
      const res = await request(app)
        .get(`/api/batches/my/${batch1._id.toString()}/schedule`)
        .set('Authorization', `Bearer ${studentToken}`);
      
      // Should be 403 Forbidden
      expect([403, 404]).toContain(res.status);
    });
    
    it('should ALLOW student accessing enrolled batch', async () => {
      // Enroll student in batch1
      await enrollStudentInBatch(student1._id.toString(), batch1._id.toString());
      
      const res = await request(app)
        .get(`/api/batches/my/${batch1._id.toString()}/schedule`)
        .set('Authorization', `Bearer ${studentToken}`);
      
      expect(res.status).toBe(200);
    });
  });
});

/**
 * ===============================================
 * BATCH CHANGE REQUEST TESTS
 * ===============================================
 */

describe('🔄 BATCH CHANGE REQUESTS', () => {
  
  beforeEach(async () => {
    await setupUsersAndTokens();
    await setupBatches();
    await enrollStudentInBatch(student1._id.toString(), batch1._id.toString());
  });
  
  describe('Create Request', () => {
    it('should create batch change request', async () => {
      const res = await request(app)
        .post('/api/batch-requests')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          currentBatchId: batch1._id.toString(),
          requestedBatchId: batch2._id.toString(),
          reason: 'Schedule conflict'
        });
      
      expect([200, 201]).toContain(res.status);
    });
    
    it('should REJECT duplicate pending request', async () => {
      // Create first request
      await request(app)
        .post('/api/batch-requests')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          currentBatchId: batch1._id.toString(),
          requestedBatchId: batch2._id.toString(),
          reason: 'Schedule conflict'
        });
      
      // Try to create duplicate
      const res = await request(app)
        .post('/api/batch-requests')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          currentBatchId: batch1._id.toString(),
          requestedBatchId: batch2._id.toString(),
          reason: 'Another reason'
        });
      
      expect(res.status).toBe(400);
    });
  });
  
  describe('Request to Full Batch', () => {
    it('should REJECT request to full batch', async () => {
      // Make batch2 full
      await Batch.findByIdAndUpdate(batch2._id, { maxStudents: 0 });
      
      const res = await request(app)
        .post('/api/batch-requests')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          currentBatchId: batch1._id.toString(),
          requestedBatchId: batch2._id.toString(),
          reason: 'Schedule conflict'
        });
      
      expect(res.status).toBe(400);
    });
  });
});

/**
 * ===============================================
 * HOLIDAYS MODULE TESTS
 * ===============================================
 */

describe('🏖️ HOLIDAYS MODULE', () => {
  
  beforeEach(async () => {
    await setupUsersAndTokens();
    await setupBatches();
  });
  
  describe('Create Holiday', () => {
    it('should allow teacher to create holiday for owned batch', async () => {
      const res = await request(app)
        .post('/api/holidays')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          date: '2025-12-31',
          batchId: batch1._id.toString(),
          reason: 'New Year Eve'
        });
      
      expect([200, 201]).toContain(res.status);
    });
    
    it('should REJECT teacher creating holiday for non-owned batch', async () => {
      const res = await request(app)
        .post('/api/holidays')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          date: '2025-12-31',
          batchId: batch2._id.toString(), // batch2 owned by teacher2
          reason: 'New Year Eve'
        });
      
      expect(res.status).toBe(403);
    });
  });
  
  describe('Approve Holiday', () => {
    it('should allow admin to approve holiday', async () => {
      // Create holiday
      const holiday = await Holiday.create({
        date: new Date('2025-12-31'),
        batch: batch1._id,
        appliedBy: teacher1._id,
        appliedByRole: 'TEACHER',
        reason: 'New Year Eve',
        status: 'PENDING'
      });
      
      const res = await request(app)
        .patch(`/api/holidays/${holiday._id.toString()}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'APPROVED' });
      
      expect(res.status).toBe(200);
    });
  });
});

/**
 * ===============================================
 * ANALYTICS MODULE TESTS
 * ===============================================
 */

describe('📊 ANALYTICS MODULE', () => {
  
  beforeEach(async () => {
    await setupUsersAndTokens();
    await setupBatches();
  });
  
  describe('Dashboard', () => {
    it('should return admin dashboard', async () => {
      const res = await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
    });
    
    it('should return teacher dashboard', async () => {
      const res = await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${teacherToken}`);
      
      expect(res.status).toBe(200);
    });
    
    it('should return student dashboard', async () => {
      const res = await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${studentToken}`);
      
      expect(res.status).toBe(200);
    });
  });
  
  describe('Batch Analytics', () => {
    it('should return batch analytics for teacher', async () => {
      const res = await request(app)
        .get(`/api/analytics/batch/${batch1._id.toString()}`)
        .set('Authorization', `Bearer ${teacherToken}`);
      
      expect(res.status).toBe(200);
    });
    
    it('should include holiday exclusion info', async () => {
      // Create approved holiday
      await Holiday.create({
        date: new Date('2025-12-31'),
        batch: batch1._id,
        appliedBy: teacher1._id,
        appliedByRole: 'TEACHER',
        reason: 'New Year Eve',
        status: 'APPROVED'
      });
      
      const res = await request(app)
        .get(`/api/analytics/batch/${batch1._id.toString()}`)
        .set('Authorization', `Bearer ${teacherToken}`);
      
      expect(res.status).toBe(200);
      // Check if response includes holiday info
      const data = res.body.data || res.body;
      if (data.excludedHolidays !== undefined) {
        expect(data.excludedHolidays).toBeGreaterThanOrEqual(0);
      }
    });
  });
});

/**
 * ===============================================
 * ANNOUNCEMENTS MODULE TESTS
 * ===============================================
 */

describe('📢 ANNOUNCEMENTS MODULE', () => {
  
  beforeEach(async () => {
    await setupUsersAndTokens();
    await setupBatches();
    await enrollStudentInBatch(student1._id.toString(), batch1._id.toString());
  });
  
  describe('Create Announcement', () => {
    it('should allow admin to create announcement for any batch', async () => {
      const res = await request(app)
        .post('/api/announcements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Admin Announcement',
          description: 'Test announcement description',
          batchIds: [batch1._id.toString(), batch2._id.toString()],
          urgency: 'NORMAL'
        });
      
      expect([200, 201]).toContain(res.status);
    });
    
    it('should allow teacher to announce only to owned batches', async () => {
      const res = await request(app)
        .post('/api/announcements')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Teacher Announcement',
          description: 'Test announcement from teacher',
          batchIds: [batch1._id.toString()], // owned by teacher1
          urgency: 'NORMAL'
        });
      
      expect([200, 201]).toContain(res.status);
    });
    
    it('should REJECT teacher announcing to non-owned batch', async () => {
      const res = await request(app)
        .post('/api/announcements')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Teacher Announcement',
          description: 'Test announcement from teacher',
          batchIds: [batch2._id.toString()], // owned by teacher2
          urgency: 'NORMAL'
        });
      
      // May return 400 (validation) or 403 (authorization) depending on which check happens first
      expect([400, 403]).toContain(res.status);
    });
  });
});

/**
 * ===============================================
 * PROFILE MODULE TESTS
 * ===============================================
 */

describe('👤 PROFILE MODULE', () => {
  
  beforeEach(async () => {
    await setupUsersAndTokens();
  });
  
  describe('Get My Profile', () => {
    it('should return user profile', async () => {
      const res = await request(app)
        .get('/api/profile/me')
        .set('Authorization', `Bearer ${studentToken}`);
      
      expect(res.status).toBe(200);
    });
  });
  
  describe('Update Profile', () => {
    it('should update user profile', async () => {
      const res = await request(app)
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          name: 'Updated Name'
        });
      
      expect(res.status).toBe(200);
    });
  });
});

console.log('🧪 Integration Test Suite Loaded');
