# Permission Matrix - API Endpoints

**Version:** 1.0.0  
**Last Updated:** December 31, 2025

This document maps every API endpoint to the required permissions for each user role.

---

## Role Overview

| Role | Description | Access Level |
|------|-------------|--------------|
| `ADMIN` | System administrator | Full access to all resources |
| `TEACHER` | Instructor | Manage own batches, students, attendance |
| `STUDENT` | Learner | View own data, request changes |
| `GUEST` | New user | Limited access, awaiting approval |

---

## Authentication Endpoints (Public)

| Endpoint | ADMIN | TEACHER | STUDENT | GUEST | Public |
|----------|-------|---------|---------|-------|--------|
| POST `/auth/register` | ✅ | ✅ | ✅ | ✅ | ✅ |
| POST `/auth/login` | ✅ | ✅ | ✅ | ✅ | ✅ |
| POST `/auth/refresh` | ✅ | ✅ | ✅ | ✅ | ✅ |
| POST `/auth/logout` | ✅ | ✅ | ✅ | ✅ | ❌ |
| GET `/auth/me` | ✅ | ✅ | ✅ | ✅ | ❌ |
| PATCH `/auth/profile` | ✅ | ✅ | ✅ | ✅ | ❌ |
| POST `/auth/change-password` | ✅ | ✅ | ✅ | ✅ | ❌ |

**Required Permissions:** None (Public or Authenticated only)

---

## Batches

| Endpoint | ADMIN | TEACHER | STUDENT | GUEST | Permission |
|----------|-------|---------|---------|-------|------------|
| GET `/batches/my` | ❌ | ❌ | ✅ | ❌ | `BATCH:READ:OWN` |
| GET `/batches/my/:batchId/schedule` | ❌ | ❌ | ✅ | ❌ | `BATCH:READ:OWN` |
| GET `/batches/my/:batchId/zoom` | ❌ | ❌ | ✅ | ❌ | `BATCH:READ:OWN` |
| GET `/batches/teacher` | ❌ | ✅ | ❌ | ❌ | `BATCH:READ:UNDER_TEACHER` |
| GET `/batches/teacher/:batchId` | ❌ | ✅ | ❌ | ❌ | `BATCH:READ:UNDER_TEACHER` |
| GET `/batches/teacher/:batchId/students` | ❌ | ✅ | ❌ | ❌ | `BATCH:READ:UNDER_TEACHER` |
| POST `/batches/teacher/:batchId/zoom` | ❌ | ✅ | ❌ | ❌ | `BATCH:UPDATE:UNDER_TEACHER` |
| GET `/batches` | ✅ | ❌ | ❌ | ❌ | `BATCH:READ:ALL` |
| GET `/batches/:id` | ✅ | ❌ | ❌ | ❌ | `BATCH:READ:ALL` |
| POST `/batches` | ✅ | ❌ | ❌ | ❌ | `BATCH:CREATE` |
| PUT `/batches/:id` | ✅ | ❌ | ❌ | ❌ | `BATCH:UPDATE:ALL` |
| DELETE `/batches/:id` | ✅ | ❌ | ❌ | ❌ | `BATCH:DELETE` |
| POST `/batches/:id/students` | ✅ | ❌ | ❌ | ❌ | `BATCH:UPDATE:ALL` |
| DELETE `/batches/:batchId/students/:studentId` | ✅ | ❌ | ❌ | ❌ | `BATCH:UPDATE:ALL` |

---

## Attendance

| Endpoint | ADMIN | TEACHER | STUDENT | GUEST | Permission |
|----------|-------|---------|---------|-------|------------|
| GET `/attendance/my` | ❌ | ❌ | ✅ | ❌ | `ATTENDANCE:READ:OWN` |
| GET `/attendance/my/summary` | ❌ | ❌ | ✅ | ❌ | `ATTENDANCE:READ:OWN` |
| POST `/attendance/mark` | ❌ | ✅ | ❌ | ❌ | `ATTENDANCE:CREATE:UNDER_TEACHER` |
| PUT `/attendance/:id` | ❌ | ✅ | ❌ | ❌ | `ATTENDANCE:UPDATE:UNDER_TEACHER` |
| GET `/attendance/teacher` | ❌ | ✅ | ❌ | ❌ | `ATTENDANCE:READ:UNDER_TEACHER` |
| GET `/attendance/teacher/batch/:batchId/summary` | ❌ | ✅ | ❌ | ❌ | `ATTENDANCE:READ:UNDER_TEACHER` |
| GET `/attendance` | ✅ | ❌ | ❌ | ❌ | `ATTENDANCE:READ:ALL` |
| GET `/attendance/:id` | ✅ | ❌ | ❌ | ❌ | `ATTENDANCE:READ:ALL` |
| POST `/attendance/admin` | ✅ | ❌ | ❌ | ❌ | `ATTENDANCE:CREATE:ALL` |
| PUT `/attendance/admin/:id` | ✅ | ❌ | ❌ | ❌ | `ATTENDANCE:UPDATE:ALL` |
| DELETE `/attendance/admin/:id` | ✅ | ❌ | ❌ | ❌ | `ATTENDANCE:DELETE` |

---

## Holidays

| Endpoint | ADMIN | TEACHER | STUDENT | GUEST | Permission |
|----------|-------|---------|---------|-------|------------|
| GET `/holidays/me` | ✅ | ✅ | ✅ | ❌ | Authenticated |
| GET `/holidays/batch/:batchId` | ✅ | ✅* | ✅* | ❌ | Ownership check |
| GET `/holidays` | ✅ | ❌ | ❌ | ❌ | `HOLIDAY:READ:ALL` |
| GET `/holidays/:id` | ✅ | ✅* | ✅* | ❌ | Authenticated |
| POST `/holidays` | ✅ | ✅ | ❌ | ❌ | `HOLIDAY:DECLARE:UNDER_BATCH` or `HOLIDAY:DECLARE:ALL` |
| PATCH `/holidays/:id/status` | ✅ | ❌ | ❌ | ❌ | `HOLIDAY:APPROVE` |
| PATCH `/holidays/:id` | ✅ | ✅* | ❌ | ❌ | `HOLIDAY:UPDATE:UNDER_BATCH` or `HOLIDAY:UPDATE:ALL` |
| DELETE `/holidays/:id` | ✅ | ✅* | ❌ | ❌ | `HOLIDAY:DELETE:UNDER_BATCH` or `HOLIDAY:DELETE:ALL` |

*Teacher can only access holidays for their own batches  
*Student can only access holidays for batches they're enrolled in

---

## Announcements

| Endpoint | ADMIN | TEACHER | STUDENT | GUEST | Permission |
|----------|-------|---------|---------|-------|------------|
| GET `/announcements` | ✅ | ✅ | ✅ | ❌ | Authenticated (filtered by role) |
| GET `/announcements/:id` | ✅ | ✅ | ✅ | ❌ | Authenticated |
| GET `/announcements/batch/:batchId` | ✅ | ✅* | ✅* | ❌ | Ownership check |
| POST `/announcements` | ✅ | ✅ | ❌ | ❌ | `ANNOUNCEMENT:CREATE` |
| PATCH `/announcements/:id` | ✅ | ✅* | ❌ | ❌ | `ANNOUNCEMENT:UPDATE` (own or all) |
| DELETE `/announcements/:id` | ✅ | ✅* | ❌ | ❌ | `ANNOUNCEMENT:DELETE` (own or all) |
| POST `/announcements/:id/pin` | ✅ | ❌ | ❌ | ❌ | `ANNOUNCEMENT:PIN` |

*Teacher can only modify their own announcements

---

## Batch Change Requests

| Endpoint | ADMIN | TEACHER | STUDENT | GUEST | Permission |
|----------|-------|---------|---------|-------|------------|
| POST `/batch-requests` | ❌ | ❌ | ✅ | ❌ | Authenticated (Student) |
| GET `/batch-requests/my` | ❌ | ❌ | ✅ | ❌ | Authenticated (Student) |
| GET `/batch-requests/teacher` | ❌ | ✅ | ❌ | ❌ | `BATCH_REQUEST:READ:UNDER_TEACHER` |
| POST `/batch-requests/:id/teacher-review` | ❌ | ✅ | ❌ | ❌ | `BATCH_REQUEST:REVIEW:AS_TEACHER` |
| GET `/batch-requests` | ✅ | ❌ | ❌ | ❌ | `BATCH_REQUEST:READ:ALL` |
| GET `/batch-requests/:id` | ✅ | ✅* | ✅* | ❌ | Ownership check |
| POST `/batch-requests/:id/admin-review` | ✅ | ❌ | ❌ | ❌ | `BATCH_REQUEST:REVIEW:AS_ADMIN` |
| POST `/batch-requests/admin-reassign` | ✅ | ❌ | ❌ | ❌ | `BATCH_REQUEST:ADMIN_REASSIGN` |

*Teacher can view requests related to their batches  
*Student can view their own requests

---

## Payments (Future Implementation)

| Endpoint | ADMIN | TEACHER | STUDENT | GUEST | Permission |
|----------|-------|---------|---------|-------|------------|
| GET `/payments/my` | ❌ | ❌ | ✅ | ✅ | `PAYMENT:READ:OWN` |
| POST `/payments` | ❌ | ❌ | ✅ | ✅ | `PAYMENT:CREATE:OWN` |
| GET `/payments` | ✅ | ❌ | ❌ | ❌ | `PAYMENT:READ:ALL` |
| POST `/payments/:id/verify` | ✅ | ❌ | ❌ | ❌ | `PAYMENT:VERIFY` |

---

## Admin - Users

| Endpoint | ADMIN | TEACHER | STUDENT | GUEST | Permission |
|----------|-------|---------|---------|-------|------------|
| GET `/admin/users` | ✅ | ❌ | ❌ | ❌ | `USER:READ:ALL` |
| GET `/admin/users/:id` | ✅ | ❌ | ❌ | ❌ | `USER:READ:ALL` |
| POST `/admin/users` | ✅ | ❌ | ❌ | ❌ | `USER:CREATE` |
| PATCH `/admin/users/:id` | ✅ | ❌ | ❌ | ❌ | `USER:UPDATE` |
| PUT `/admin/users/:id/role` | ✅ | ❌ | ❌ | ❌ | `USER:ASSIGN_ROLE` |
| PUT `/admin/users/:id/status` | ✅ | ❌ | ❌ | ❌ | `USER:UPDATE_STATUS` |
| DELETE `/admin/users/:id` | ✅ | ❌ | ❌ | ❌ | `USER:DELETE` |
| POST `/admin/users/:id/invalidate-tokens` | ✅ | ❌ | ❌ | ❌ | `USER:INVALIDATE_TOKENS` |
| GET `/admin/users/pending-guests` | ✅ | ❌ | ❌ | ❌ | `USER:READ:ALL` |
| POST `/admin/users/:id/approve` | ✅ | ❌ | ❌ | ❌ | `USER:UPGRADE_GUEST` |
| POST `/admin/users/:id/assign-batch` | ✅ | ❌ | ❌ | ❌ | `USER:ASSIGN_BATCH` |
| DELETE `/admin/users/:id/batch/:batchId` | ✅ | ❌ | ❌ | ❌ | `USER:ASSIGN_BATCH` |

---

## Admin - System

| Endpoint | ADMIN | TEACHER | STUDENT | GUEST | Permission |
|----------|-------|---------|---------|-------|------------|
| GET `/admin/system/audit` | ✅ | ❌ | ❌ | ❌ | `SYSTEM_CONFIGURE` |
| GET `/admin/system/audit/stats` | ✅ | ❌ | ❌ | ❌ | `SYSTEM_CONFIGURE` |
| GET `/admin/system/audit/critical` | ✅ | ❌ | ❌ | ❌ | `SYSTEM_CONFIGURE` |

---

## Permission Categories

### Resource:Action:Scope Pattern

All permissions follow the pattern: `RESOURCE:ACTION:SCOPE`

**Examples:**
- `BATCH:READ:OWN` - Read own batches
- `BATCH:READ:UNDER_TEACHER` - Read batches under a teacher
- `BATCH:READ:ALL` - Read all batches
- `ATTENDANCE:CREATE:UNDER_TEACHER` - Create attendance for own batches
- `USER:ASSIGN_ROLE` - Assign roles to users

### Scopes
- `OWN` - User's own data
- `UNDER_TEACHER` - Data related to teacher's batches
- `UNDER_BATCH` - Data within specific batch
- `ALL` - All data (admin level)

---

## Role Permissions Summary

### ADMIN (Full Access)
```
USER:*
BATCH:*
ATTENDANCE:*
HOLIDAY:*
ANNOUNCEMENT:*
BATCH_REQUEST:*
PAYMENT:*
SYSTEM_CONFIGURE
```

### TEACHER
```
PROFILE:READ:OWN
PROFILE:UPDATE:OWN
BATCH:READ:UNDER_TEACHER
BATCH:UPDATE:UNDER_TEACHER
ATTENDANCE:CREATE:UNDER_TEACHER
ATTENDANCE:READ:UNDER_TEACHER
ATTENDANCE:UPDATE:UNDER_TEACHER
HOLIDAY:DECLARE:UNDER_BATCH
HOLIDAY:READ:UNDER_BATCH
HOLIDAY:UPDATE:UNDER_BATCH
HOLIDAY:DELETE:UNDER_BATCH
ANNOUNCEMENT:CREATE
ANNOUNCEMENT:READ:RELEVANT
ANNOUNCEMENT:UPDATE:OWN
ANNOUNCEMENT:DELETE:OWN
BATCH_REQUEST:READ:UNDER_TEACHER
BATCH_REQUEST:REVIEW:AS_TEACHER
```

### STUDENT
```
PROFILE:READ:OWN
PROFILE:UPDATE:OWN
BATCH:READ:OWN
ATTENDANCE:READ:OWN
HOLIDAY:READ:UNDER_BATCH
ANNOUNCEMENT:READ:RELEVANT
BATCH_REQUEST:CREATE
BATCH_REQUEST:READ:OWN
PAYMENT:READ:OWN
PAYMENT:CREATE:OWN
```

### GUEST
```
PROFILE:READ:OWN
PROFILE:UPDATE:OWN
PAYMENT:READ:OWN
PAYMENT:CREATE:OWN
```

---

## Implementation Notes

1. **Middleware Chain**: `auth.middleware.ts` → `authorize.middleware.ts`
2. **Token**: JWT with `userId`, `role`, `permissions` claims
3. **Ownership**: Additional checks in service layer for `UNDER_TEACHER` and `OWN` scopes
4. **Role Changes**: User must re-login after role change
5. **Status**: `INACTIVE` or `SUSPENDED` users are blocked even with valid token

---

## Testing Permissions

Use these test accounts:

```
Admin: admin@music.com / Test@123
Teacher: teacher@music.com / Test@123
Student: student@music.com / Test@123
```

---

**Last Updated:** December 31, 2025  
**Maintained By:** Backend Team
