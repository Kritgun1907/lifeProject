# Module Architecture Guide

## Overview

The backend follows an enterprise-grade modular architecture with clear separation of concerns. Each feature domain is organized as a self-contained module with its own routes, controllers, and services.

## Directory Structure

```
src/
├── modules/
│   ├── shared/                    # Shared utilities across all modules
│   │   ├── base.controller.ts     # asyncHandler, successResponse, etc.
│   │   └── index.ts
│   │
│   ├── auth/                      # Authentication & Profile
│   │   ├── auth.service.ts        # JWT, login, register, password
│   │   ├── auth.controller.ts
│   │   ├── auth.routes.ts
│   │   └── index.ts
│   │
│   ├── admin/                     # Admin operations (ADMIN role required)
│   │   ├── admin.routes.ts        # Main admin router
│   │   ├── index.ts
│   │   │
│   │   ├── users/                 # User management
│   │   │   ├── users.service.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.routes.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── roles/                 # Role & permission management
│   │   │   ├── roles.service.ts
│   │   │   ├── roles.controller.ts
│   │   │   ├── roles.routes.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── settings/              # System settings
│   │   │   ├── settings.service.ts
│   │   │   ├── settings.controller.ts
│   │   │   ├── settings.routes.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── reports/               # Reports & CSV exports
│   │   │   ├── reports.service.ts
│   │   │   ├── reports.controller.ts
│   │   │   ├── reports.routes.ts
│   │   │   └── index.ts
│   │   │
│   │   └── system/                # System management & archives
│   │       ├── system.service.ts
│   │       ├── system.controller.ts
│   │       ├── system.routes.ts
│   │       └── index.ts
│   │
│   ├── announcements/             # Announcement management
│   │   ├── announcements.service.ts
│   │   ├── announcements.controller.ts
│   │   ├── announcements.routes.ts
│   │   └── index.ts
│   │
│   ├── payments/                  # Payment operations
│   │   ├── payments.service.ts
│   │   ├── payments.controller.ts
│   │   ├── payments.routes.ts
│   │   └── index.ts
│   │
│   ├── holidays/                  # Holiday management
│   │   ├── holidays.service.ts
│   │   ├── holidays.controller.ts
│   │   ├── holidays.routes.ts
│   │   └── index.ts
│   │
│   ├── analytics/                 # Analytics & reporting
│   │   ├── analytics.service.ts
│   │   ├── analytics.controller.ts
│   │   ├── analytics.routes.ts
│   │   └── index.ts
│   │
│   ├── applications/              # Batch applications (Guest self-service)
│   │   ├── applications.service.ts
│   │   ├── applications.controller.ts
│   │   ├── applications.routes.ts
│   │   └── index.ts
│   │
│   ├── batch-requests/            # Batch change requests (Student self-service)
│   │   ├── batch-requests.service.ts
│   │   ├── batch-requests.controller.ts
│   │   ├── batch-requests.routes.ts
│   │   └── index.ts
│   │
│   └── index.ts                   # Central exports
│
├── middleware/                    # Authentication & Authorization
│   ├── auth.middleware.ts         # JWT verification, req.auth
│   ├── authorize.middleware.ts    # Permission checks
│   └── rbac.middleware.ts         # Role checks
│
├── services/                      # Core services
│   └── ownership.service.ts       # Data-level access control
│
└── models/                        # Mongoose models
```

## Module Pattern

Each module follows a 3-layer architecture:

### 1. Service Layer (`*.service.ts`)
- Pure business logic
- Database operations
- No HTTP concepts (req/res)
- Reusable across routes and other services

```typescript
// Example: payments.service.ts
export async function getStudentPayments(studentId: string, page: number, limit: number) {
  const query = { student: studentId, isDeleted: false };
  const payments = await Payment.find(query).populate("batch").lean();
  return { payments, total, page, limit };
}
```

### 2. Controller Layer (`*.controller.ts`)
- HTTP request handling
- Input validation
- Calls service methods
- Uses shared response helpers

```typescript
// Example: payments.controller.ts
export class PaymentController {
  static getMyPayments = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = getAuthContext(req);
    const { page, limit } = getPaginationParams(req.query);
    
    const result = await PaymentService.getStudentPayments(userId, page, limit);
    
    paginatedResponse(res, result.payments, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  });
}
```

### 3. Routes Layer (`*.routes.ts`)
- Route definitions
- Middleware chains
- Permission requirements

```typescript
// Example: payments.routes.ts
router.get(
  "/me",
  authorize([PERMISSIONS.PAYMENT_READ_SELF]),
  PaymentController.getMyPayments
);
```

## Shared Utilities

The `shared/` module provides DRY utilities:

### Response Helpers
```typescript
successResponse(res, data, message?, status?)
paginatedResponse(res, data, { total, page, limit }, message?)
```

### Request Helpers
```typescript
getAuthContext(req)     // Get userId, role from authenticated request
getPaginationParams(req.query)  // Extract page, limit, skip
validateObjectId(id, fieldName)
validateRequired(body, fields[])
```

### Async Handler
```typescript
asyncHandler(fn)  // Wraps async functions, forwards errors to Express error handler
```

## API Routes

### Auth Module (`/auth`)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/register` | Public | Register new user (GUEST) |
| POST | `/login` | Public | Login, get tokens |
| POST | `/refresh` | Public (cookie) | Refresh access token |
| POST | `/logout` | Optional auth | Logout, clear tokens |
| GET | `/me` | Authenticated | Get profile |
| PATCH | `/profile` | PROFILE_UPDATE_SELF_LIMITED | Update own profile |
| POST | `/change-password` | PASSWORD_CHANGE_SELF | Change password |

### Admin Module (`/admin`) - Requires ADMIN role

#### Users (`/admin/users`)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/` | ADMIN | List all users |
| GET | `/pending-guests` | ROLE_ASSIGN | List guests ready for approval |
| GET | `/:id` | ADMIN | Get user details |
| POST | `/` | STUDENT_CREATE | Create user |
| PATCH | `/:id` | STUDENT_UPDATE_STATUS_ANY | Update user |
| PUT | `/:id/role` | ROLE_ASSIGN | Change role (GUEST→STUDENT) |
| PUT | `/:id/status` | STUDENT_UPDATE_STATUS_ANY | Change status |
| DELETE | `/:id` | STUDENT_UPDATE_STATUS_ANY | Soft delete |
| POST | `/:id/invalidate-tokens` | ROLE_ASSIGN | Force logout |
| POST | `/:id/approve` | ROLE_ASSIGN | Approve GUEST→STUDENT |
| POST | `/:id/assign-batch` | BATCH_UPDATE | Assign to batch |
| DELETE | `/:id/batch/:batchId` | BATCH_UPDATE | Remove from batch |

#### Roles (`/admin/roles`)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/` | ADMIN | List all roles |
| GET | `/stats` | ADMIN | Role distribution |
| GET | `/:id` | ADMIN | Get role details |
| PUT | `/:id/permissions` | ROLE_ASSIGN | Update permissions |
| POST | `/:id/permissions` | ROLE_ASSIGN | Add permission |
| DELETE | `/:id/permissions/:perm` | ROLE_ASSIGN | Remove permission |

#### Settings (`/admin/settings`)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/working-days` | ADMIN | List working days |
| POST | `/working-days` | SYSTEM_CONFIGURE | Create working day |
| PATCH | `/working-days/:id` | SYSTEM_CONFIGURE | Update |
| DELETE | `/working-days/:id` | SYSTEM_CONFIGURE | Delete |
| GET | `/working-times` | ADMIN | List time slots |
| POST | `/working-times` | SYSTEM_CONFIGURE | Create time slot |
| GET | `/statuses` | ADMIN | List statuses |

#### Reports (`/admin/reports`)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/summary` | ANALYTICS_VIEW_ANY | Overall summary |
| GET | `/payments` | ANALYTICS_VIEW_ANY | Payment report (?format=csv) |
| GET | `/attendance` | ANALYTICS_VIEW_ANY | Attendance report (?format=csv) |
| GET | `/students` | ANALYTICS_VIEW_ANY | Student report (?format=csv) |
| GET | `/batches` | ANALYTICS_VIEW_ANY | Batch report (?format=csv) |

#### System (`/admin/system`)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/health` | SYSTEM_CONFIGURE | System health |
| GET | `/statuses` | SYSTEM_CONFIGURE | List statuses |
| POST | `/statuses` | SYSTEM_CONFIGURE | Create status |
| GET | `/archived` | SYSTEM_CONFIGURE | Archived stats |
| POST | `/archive/attendance` | SYSTEM_CONFIGURE | Archive old attendance |
| POST | `/archive/payments` | SYSTEM_CONFIGURE | Archive old payments |
| POST | `/archive/announcements` | SYSTEM_CONFIGURE | Archive old announcements |
| POST | `/bulk/status` | STUDENT_UPDATE_STATUS_ANY | Bulk status update |
| POST | `/bulk/archive` | SYSTEM_CONFIGURE | Bulk archive users |
| POST | `/restore` | SYSTEM_CONFIGURE | Restore archived |
| GET | `/audit` | SYSTEM_CONFIGURE | Audit log |
| POST | `/sync-permissions` | SYSTEM_CONFIGURE | Sync permissions |

### Announcements Module (`/api/announcements`)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/` | ANNOUNCEMENT_CREATE | Create announcement |
| GET | `/` | ANNOUNCEMENT_READ | List (filtered for role) |
| GET | `/batch/:batchId` | ANNOUNCEMENT_READ | Batch announcements |
| GET | `/:id` | ANNOUNCEMENT_READ | Single announcement |
| POST | `/:id/read` | ANNOUNCEMENT_READ | Mark as read |
| GET | `/:id/readers` | ANNOUNCEMENT_READ | Read receipts |
| PUT | `/:id` | ANNOUNCEMENT_UPDATE | Update |
| DELETE | `/:id` | ANNOUNCEMENT_DELETE | Delete |

### Payments Module (`/api/payments`)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/me` | PAYMENT_READ_SELF | Student's own payments |
| GET | `/batch/:batchId` | PAYMENT_READ_UNDER_BATCH | Batch payments (teacher) |
| GET | `/student/:studentId` | PAYMENT_READ_ANY | Student payments (admin) |
| GET | `/` | PAYMENT_READ_ANY | All payments (admin) |
| GET | `/:id` | * | Single payment |
| GET | `/stats` | PAYMENT_READ_ANY | Payment statistics |
| POST | `/dummy` | PAYMENT_READ_ANY | Create test payment |
| POST | `/:id/assign-batch` | PAYMENT_READ_ANY | Assign batch after payment |

### Holidays Module (`/api/holidays`)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/me` | HOLIDAY_READ | User's upcoming holidays |
| GET | `/batch/:batchId` | HOLIDAY_READ | Batch holidays |
| GET | `/` | HOLIDAY_DECLARE_ANY | All holidays (admin) |
| GET | `/:id` | HOLIDAY_READ | Single holiday |
| POST | `/` | HOLIDAY_DECLARE_* | Create holiday |
| PATCH | `/:id` | HOLIDAY_DECLARE_* | Update holiday |
| PATCH | `/:id/status` | HOLIDAY_DECLARE_ANY | Approve/reject |
| DELETE | `/:id` | HOLIDAY_DECLARE_* | Delete holiday |

### Analytics Module (`/api/analytics`)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/dashboard` | (authenticated) | Role-based dashboard |
| GET | `/student/attendance` | ATTENDANCE_READ_* | Attendance history |
| GET | `/batch/:batchId` | ANALYTICS_VIEW_* | Batch analytics |
| GET | `/admin/revenue` | ANALYTICS_VIEW_ANY | Revenue report |
| GET | `/admin/attendance` | ANALYTICS_VIEW_ANY | Attendance report |

### Applications Module (`/api/applications`)

Guest batch application lifecycle (DDD: Guest self-service domain)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/` | (authenticated) | Guest submits application |
| GET | `/my` | (authenticated) | Guest views own application |
| GET | `/pending` | STUDENT_CREATE | List pending applications |
| GET | `/` | STUDENT_CREATE | List all applications |
| GET | `/:id` | STUDENT_CREATE | Get single application |
| GET | `/:id/matching-batches` | STUDENT_CREATE | Find matching batches |
| POST | `/:id/approve` | STUDENT_CREATE | Approve application |
| POST | `/:id/reject` | STUDENT_CREATE | Reject application |

### Batch Requests Module (`/api/batch-requests`)

Batch change requests (DDD: Student self-service domain)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/` | BATCH_CHANGE_CREATE | Student submits change request |
| GET | `/my` | (authenticated) | Student views own requests |
| GET | `/` | BATCH_CHANGE_READ_* | List all requests |
| GET | `/:id` | BATCH_CHANGE_READ_* | Get single request |
| POST | `/:id/teacher-respond` | BATCH_CHANGE_APPROVE_UNDER_BATCH | Teacher approves/rejects |
| POST | `/:id/admin-approve` | BATCH_CHANGE_APPROVE_ANY | Admin approves |
| POST | `/:id/admin-reject` | BATCH_CHANGE_APPROVE_ANY | Admin rejects |

## DDD Lifecycle Architecture

The Guest→Student lifecycle follows Domain-Driven Design principles:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     GUEST → STUDENT LIFECYCLE (DDD)                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. AUTH DOMAIN (Identity)                                              │
│     └─ POST /auth/register → Creates GUEST user                         │
│                                                                         │
│  2. APPLICATIONS DOMAIN (Guest Self-Service)                            │
│     └─ POST /api/applications → Guest submits batch preferences         │
│                                                                         │
│  3. PAYMENTS DOMAIN (Money)                                             │
│     └─ POST /api/payments → Guest pays for a batch                      │
│                                                                         │
│  4. ADMIN/USERS DOMAIN (Authority)                                      │
│     ├─ GET /admin/users/pending-guests → List guests ready for approval │
│     └─ POST /admin/users/:id/approve → Upgrade to STUDENT + assign batch│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key Principle**: Each domain owns its part of the workflow. No centralized "enrollment" module.

## Security Layers

1. **Authentication** (`authenticate` middleware)
   - Validates JWT access token
   - Attaches `req.auth` with userId, role, permissions

2. **Authorization** (`authorize`/`authorizeAny` middleware)
   - Checks permissions from JWT
   - `authorize([P1, P2])` - requires ALL permissions
   - `authorizeAny([P1, P2])` - requires ANY permission

3. **Ownership** (in service/controller)
   - Validates resource belongs to requesting user
   - Uses `OwnershipService.ensureTeacherOwnsBatch()`, etc.

## Adding a New Module

1. Create folder: `src/modules/{moduleName}/`

2. Create service: `{moduleName}.service.ts`
   ```typescript
   // Business logic functions
   export async function getItems() { ... }
   export async function createItem(data) { ... }
   ```

3. Create controller: `{moduleName}.controller.ts`
   ```typescript
   import { asyncHandler, successResponse, getAuthContext } from "../shared";
   import * as ModuleService from "./{moduleName}.service";
   
   export class ModuleController {
     static getItems = asyncHandler(async (req, res) => {
       const result = await ModuleService.getItems();
       successResponse(res, result);
     });
   }
   ```

4. Create routes: `{moduleName}.routes.ts`
   ```typescript
   import { Router } from "express";
   import { authenticate } from "../../middleware/auth.middleware";
   import { authorize } from "../../middleware/authorize.middleware";
   import { ModuleController } from "./{moduleName}.controller";
   
   const router = Router();
   router.use(authenticate);
   router.get("/", authorize([PERMISSIONS.X]), ModuleController.getItems);
   export default router;
   ```

5. Create index: `index.ts`
   ```typescript
   export { default as modulesRouter } from "./{moduleName}.routes";
   ```

6. Add to `modules/index.ts`:
   ```typescript
   export { modulesRouter } from "./{moduleName}";
   ```

7. Mount in `app.ts`:
   ```typescript
   app.use("/api/{moduleName}", modulesRouter);
   ```

## Best Practices

1. **Keep services pure** - No req/res objects, just data in/out
2. **Use shared helpers** - Don't repeat validation/response logic
3. **Permission naming** - `RESOURCE:ACTION:SCOPE` (e.g., `PAYMENT:READ:SELF`)
4. **Ownership checks** - Always verify resource ownership in service/controller
5. **Pagination** - Use `getPaginationParams()` and `paginatedResponse()`
6. **Error handling** - Throw from `errors/` classes, let middleware handle
