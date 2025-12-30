# API Contracts - Music School LMS

**Version:** 1.0.0  
**Last Updated:** December 31, 2025  
**Base URL:** `http://localhost:5000/api`

> ⚠️ **FROZEN**: These contracts are locked for frontend development. Any changes require backend-frontend coordination.

---

## Table of Contents

1. [Authentication](#authentication)
2. [User Profile](#user-profile)
3. [Batches](#batches)
4. [Attendance](#attendance)
5. [Holidays](#holidays)
6. [Announcements](#announcements)
7. [Batch Change Requests](#batch-change-requests)
8. [Payments](#payments)
9. [Admin - Users](#admin---users)
10. [Admin - System](#admin---system)

---

## Global Headers

All authenticated requests must include:

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

All responses include:

```
X-Request-ID: <UUID>
Content-Type: application/json
```

---

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Optional success message"
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [ /* array of items */ ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  },
  "message": "Optional message"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "error": "ERROR_CODE",
  "statusCode": 400
}
```

---

## Authentication

### POST `/auth/register`

**Description:** Register a new user (GUEST role by default)

**Permission:** Public

**Request Body:**
```json
{
  "name": "string (required, min 2 chars)",
  "email": "string (required, valid email)",
  "mobile": "string (required, 10 digits)",
  "password": "string (required, min 4 chars)"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Registration successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@music.com",
    "mobile": "9876543210",
    "role": "GUEST",
    "permissions": ["PROFILE:READ:OWN", "PROFILE:UPDATE:OWN"]
  }
}
```

**Set-Cookie:** `refreshToken=<token>; HttpOnly; Path=/auth`

---

### POST `/auth/login`

**Description:** Login existing user

**Permission:** Public

**Request Body:**
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@music.com",
    "mobile": "9876543210",
    "role": "STUDENT",
    "permissions": ["BATCH:READ:OWN", "ATTENDANCE:READ:OWN", ...]
  }
}
```

**Set-Cookie:** `refreshToken=<token>; HttpOnly; Path=/auth`

---

### POST `/auth/refresh`

**Description:** Refresh access token using refresh token from cookie

**Permission:** Public (requires refresh token cookie)

**Request Body:** None (uses cookie)

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Set-Cookie:** `refreshToken=<new_token>; HttpOnly; Path=/auth`

---

### POST `/auth/logout`

**Description:** Logout user (clears refresh token)

**Permission:** Authenticated

**Request Body:**
```json
{
  "everywhere": "boolean (optional, default: false)"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Logged out successfully",
  "data": null
}
```

**Clears-Cookie:** `refreshToken`

---

### GET `/auth/me`

**Description:** Get current user profile

**Permission:** Authenticated

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@music.com",
    "mobile": "9876543210",
    "role": {
      "name": "STUDENT",
      "permissions": ["BATCH:READ:OWN", ...]
    },
    "status": "ACTIVE",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

### PATCH `/auth/profile`

**Description:** Update own profile (name, mobile only)

**Permission:** Authenticated

**Request Body:**
```json
{
  "name": "string (optional)",
  "mobile": "string (optional, 10 digits)"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe Updated",
    "email": "john@music.com",
    "mobile": "9876543211",
    "role": "STUDENT",
    "status": "ACTIVE"
  }
}
```

---

### POST `/auth/change-password`

**Description:** Change own password

**Permission:** Authenticated

**Request Body:**
```json
{
  "currentPassword": "string (required)",
  "newPassword": "string (required, min 4 chars)"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Password changed. Please login again.",
  "data": null
}
```

**Clears-Cookie:** `refreshToken` (forces re-login)

---

## Batches

### GET `/batches/my`

**Description:** Student views their enrolled batches

**Permission:** `BATCH:READ:OWN`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "batchName": "Guitar Beginners Evening",
      "instrument": {
        "_id": "507f1f77bcf86cd799439012",
        "name": "Guitar"
      },
      "teacher": {
        "_id": "507f1f77bcf86cd799439013",
        "name": "Jane Smith",
        "email": "jane@music.com"
      },
      "mode": "ONLINE",
      "maxStudents": 10,
      "currentStudents": 5,
      "workingDay": {
        "name": "MON-WED-FRI"
      },
      "workingTiming": {
        "startTime": "18:00",
        "endTime": "19:00"
      },
      "status": "ACTIVE"
    }
  ]
}
```

---

### GET `/batches/my/:batchId/schedule`

**Description:** Student views schedule for their batch

**Permission:** `BATCH:READ:OWN`

**Path Parameters:**
- `batchId` - MongoDB ObjectId (required)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "batch": {
      "_id": "507f1f77bcf86cd799439011",
      "batchName": "Guitar Beginners Evening"
    },
    "schedule": {
      "workingDay": "MON-WED-FRI",
      "workingTiming": "18:00 - 19:00"
    },
    "upcomingClasses": [
      {
        "date": "2025-01-06",
        "day": "Monday",
        "time": "18:00 - 19:00"
      }
    ]
  }
}
```

---

### GET `/batches/my/:batchId/zoom`

**Description:** Student gets Zoom link for their batch

**Permission:** `BATCH:READ:OWN`

**Path Parameters:**
- `batchId` - MongoDB ObjectId (required)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "batchId": "507f1f77bcf86cd799439011",
    "batchName": "Guitar Beginners Evening",
    "zoomLink": "https://zoom.us/j/123456789",
    "nextClass": {
      "date": "2025-01-06",
      "startTime": "18:00",
      "endTime": "19:00"
    }
  }
}
```

---

### GET `/batches/teacher`

**Description:** Teacher views their batches

**Permission:** `BATCH:READ:UNDER_TEACHER`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "batchName": "Guitar Beginners Evening",
      "instrument": { "name": "Guitar" },
      "mode": "ONLINE",
      "maxStudents": 10,
      "currentStudents": 5,
      "workingDay": { "name": "MON-WED-FRI" },
      "workingTiming": { "startTime": "18:00", "endTime": "19:00" }
    }
  ]
}
```

---

### GET `/batches/teacher/:batchId`

**Description:** Teacher views single batch with students

**Permission:** `BATCH:READ:UNDER_TEACHER`

**Path Parameters:**
- `batchId` - MongoDB ObjectId (required)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "batchName": "Guitar Beginners Evening",
    "instrument": { "name": "Guitar" },
    "students": [
      {
        "_id": "507f1f77bcf86cd799439020",
        "name": "John Doe",
        "email": "john@music.com",
        "mobile": "9876543210"
      }
    ],
    "maxStudents": 10
  }
}
```

---

### POST `/batches/teacher/:batchId/zoom`

**Description:** Teacher creates Zoom session

**Permission:** `BATCH:UPDATE:UNDER_TEACHER`

**Path Parameters:**
- `batchId` - MongoDB ObjectId (required)

**Request Body:**
```json
{
  "zoomLink": "string (required, URL)",
  "classDate": "string (required, ISO date)",
  "startTime": "string (required, HH:mm)",
  "endTime": "string (required, HH:mm)"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439030",
    "batch": "507f1f77bcf86cd799439011",
    "zoomLink": "https://zoom.us/j/123456789",
    "classDate": "2025-01-06T00:00:00.000Z",
    "startTime": "18:00",
    "endTime": "19:00"
  }
}
```

---

### GET `/batches`

**Description:** Admin views all batches with filters

**Permission:** `BATCH:READ:ALL`

**Query Parameters:**
- `teacherId` - MongoDB ObjectId (optional)
- `instrumentId` - MongoDB ObjectId (optional)
- `mode` - "ONLINE" | "OFFLINE" (optional)
- `status` - string (optional)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "batchName": "Guitar Beginners Evening",
      "instrument": { "_id": "...", "name": "Guitar" },
      "teacher": { "_id": "...", "name": "Jane Smith" },
      "mode": "ONLINE",
      "maxStudents": 10,
      "currentStudents": 5,
      "status": "ACTIVE"
    }
  ]
}
```

---

### POST `/batches`

**Description:** Admin creates new batch

**Permission:** `BATCH:CREATE`

**Request Body:**
```json
{
  "batchName": "string (required)",
  "instrument": "ObjectId (required)",
  "teacher": "ObjectId (required)",
  "workingDay": "ObjectId (required)",
  "workingTiming": "ObjectId (required)",
  "mode": "ONLINE | OFFLINE (required)",
  "maxStudents": "number (required, min 1)"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "batchName": "Guitar Beginners Evening",
    "instrument": "507f1f77bcf86cd799439012",
    "teacher": "507f1f77bcf86cd799439013",
    "mode": "ONLINE",
    "maxStudents": 10,
    "status": "ACTIVE",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

### PUT `/batches/:id`

**Description:** Admin updates batch

**Permission:** `BATCH:UPDATE:ALL`

**Path Parameters:**
- `id` - MongoDB ObjectId (required)

**Request Body:** (all fields optional)
```json
{
  "batchName": "string",
  "teacher": "ObjectId",
  "workingDay": "ObjectId",
  "workingTiming": "ObjectId",
  "mode": "ONLINE | OFFLINE",
  "maxStudents": "number"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": { /* updated batch */ }
}
```

---

### DELETE `/batches/:id`

**Description:** Admin deletes batch (soft delete)

**Permission:** `BATCH:DELETE`

**Path Parameters:**
- `id` - MongoDB ObjectId (required)

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Batch deleted successfully"
}
```

---

### POST `/batches/:id/students`

**Description:** Admin adds student to batch

**Permission:** `BATCH:UPDATE:ALL`

**Path Parameters:**
- `id` - Batch MongoDB ObjectId (required)

**Request Body:**
```json
{
  "studentId": "ObjectId (required)"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439040",
    "student": "507f1f77bcf86cd799439020",
    "batch": "507f1f77bcf86cd799439011",
    "enrolledAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

### DELETE `/batches/:batchId/students/:studentId`

**Description:** Admin removes student from batch

**Permission:** `BATCH:UPDATE:ALL`

**Path Parameters:**
- `batchId` - MongoDB ObjectId (required)
- `studentId` - MongoDB ObjectId (required)

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Student removed from batch"
}
```

---

## Attendance

### GET `/attendance/my`

**Description:** Student views their attendance

**Permission:** `ATTENDANCE:READ:OWN`

**Query Parameters:**
- `batchId` - MongoDB ObjectId (optional)
- `fromDate` - ISO date string (optional)
- `toDate` - ISO date string (optional)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439050",
      "student": "507f1f77bcf86cd799439020",
      "batch": {
        "_id": "507f1f77bcf86cd799439011",
        "batchName": "Guitar Beginners Evening"
      },
      "date": "2025-01-06T00:00:00.000Z",
      "status": "PRESENT",
      "markedBy": {
        "name": "Jane Smith",
        "role": "TEACHER"
      },
      "createdAt": "2025-01-06T18:05:00.000Z"
    }
  ]
}
```

---

### GET `/attendance/my/summary`

**Description:** Student views attendance summary

**Permission:** `ATTENDANCE:READ:OWN`

**Query Parameters:**
- `batchId` - MongoDB ObjectId (optional)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "totalClasses": 20,
    "present": 18,
    "absent": 2,
    "percentage": 90.0,
    "batchName": "Guitar Beginners Evening"
  }
}
```

---

### POST `/attendance/mark`

**Description:** Teacher marks attendance for their batch

**Permission:** `ATTENDANCE:CREATE:UNDER_TEACHER`

**Request Body:**
```json
{
  "batchId": "ObjectId (required)",
  "date": "ISO date string (required)",
  "records": [
    {
      "studentId": "ObjectId (required)",
      "status": "PRESENT | ABSENT (required)"
    }
  ]
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "marked": 5,
    "failed": 0,
    "records": [ /* created attendance records */ ]
  }
}
```

---

### PUT `/attendance/:id`

**Description:** Teacher edits attendance record

**Permission:** `ATTENDANCE:UPDATE:UNDER_TEACHER`

**Path Parameters:**
- `id` - Attendance MongoDB ObjectId (required)

**Request Body:**
```json
{
  "status": "PRESENT | ABSENT (required)"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": { /* updated attendance record */ }
}
```

---

### GET `/attendance/teacher`

**Description:** Teacher views attendance for their batches

**Permission:** `ATTENDANCE:READ:UNDER_TEACHER`

**Query Parameters:**
- `batchId` - MongoDB ObjectId (optional)
- `date` - ISO date string (optional)
- `studentId` - MongoDB ObjectId (optional)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [ /* attendance records */ ]
}
```

---

### GET `/attendance`

**Description:** Admin views all attendance records

**Permission:** `ATTENDANCE:READ:ALL`

**Query Parameters:**
- `studentId` - MongoDB ObjectId (optional)
- `batchId` - MongoDB ObjectId (optional)
- `status` - "PRESENT" | "ABSENT" (optional)
- `fromDate` - ISO date string (optional)
- `toDate` - ISO date string (optional)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [ /* attendance records */ ]
}
```

---

### PUT `/attendance/admin/:id`

**Description:** Admin overrides attendance (any record)

**Permission:** `ATTENDANCE:UPDATE:ALL`

**Path Parameters:**
- `id` - Attendance MongoDB ObjectId (required)

**Request Body:**
```json
{
  "status": "PRESENT | ABSENT (required)"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": { /* updated attendance record */ }
}
```

---

## Holidays

### GET `/holidays/me`

**Description:** Get upcoming holidays for current user's batches

**Permission:** Authenticated

**Query Parameters:**
- `page` - number (optional, default: 1)
- `limit` - number (optional, default: 20)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439060",
      "date": "2025-01-15T00:00:00.000Z",
      "batch": {
        "_id": "507f1f77bcf86cd799439011",
        "batchName": "Guitar Beginners Evening"
      },
      "reason": "National Holiday",
      "status": "APPROVED",
      "declaredBy": {
        "name": "Admin User",
        "role": "ADMIN"
      }
    }
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

### GET `/holidays/batch/:batchId`

**Description:** Get holidays for a specific batch

**Permission:** `HOLIDAY:READ:UNDER_BATCH` or own batch

**Path Parameters:**
- `batchId` - MongoDB ObjectId (required)

**Query Parameters:**
- `page` - number (optional, default: 1)
- `limit` - number (optional, default: 20)

**Response:** Same as `/holidays/me`

---

### GET `/holidays`

**Description:** Get all holidays with filters (Admin)

**Permission:** `HOLIDAY:READ:ALL`

**Query Parameters:**
- `batchId` - MongoDB ObjectId (optional)
- `status` - "PENDING" | "APPROVED" | "REJECTED" (optional)
- `fromDate` - ISO date string (optional)
- `toDate` - ISO date string (optional)
- `page` - number (optional, default: 1)
- `limit` - number (optional, default: 20)

**Response:** Same as `/holidays/me` with pagination

---

### POST `/holidays`

**Description:** Create a new holiday

**Permission:** `HOLIDAY:DECLARE:UNDER_BATCH` or `HOLIDAY:DECLARE:ALL`

**Request Body:**
```json
{
  "date": "ISO date string (required)",
  "batchId": "ObjectId (required)",
  "reason": "string (required)"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Holiday created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439060",
    "date": "2025-01-15T00:00:00.000Z",
    "batch": "507f1f77bcf86cd799439011",
    "reason": "National Holiday",
    "status": "PENDING",
    "declaredBy": "507f1f77bcf86cd799439013"
  }
}
```

---

### PATCH `/holidays/:id/status`

**Description:** Update holiday status (Admin only)

**Permission:** `HOLIDAY:APPROVE`

**Path Parameters:**
- `id` - Holiday MongoDB ObjectId (required)

**Request Body:**
```json
{
  "status": "APPROVED | REJECTED (required)"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Holiday approved",
  "data": { /* updated holiday */ }
}
```

---

### DELETE `/holidays/:id`

**Description:** Delete a holiday

**Permission:** `HOLIDAY:DELETE:UNDER_BATCH` or `HOLIDAY:DELETE:ALL`

**Path Parameters:**
- `id` - Holiday MongoDB ObjectId (required)

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Holiday deleted successfully",
  "data": null
}
```

---

## Announcements

### GET `/announcements`

**Description:** Get announcements for current user

**Permission:** Authenticated

**Query Parameters:**
- `urgency` - "LOW" | "REGULAR" | "HIGH" | "URGENT" (optional)
- `batchId` - MongoDB ObjectId (optional)
- `isPinned` - boolean (optional)
- `isActive` - boolean (optional, default: true)
- `page` - number (optional, default: 1)
- `limit` - number (optional, default: 20)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439070",
      "title": "Class Schedule Change",
      "description": "Tomorrow's class will start at 7 PM instead of 6 PM",
      "urgency": "HIGH",
      "contentType": "PLAIN",
      "targetAudience": "STUDENTS",
      "isPinned": true,
      "isBroadcast": false,
      "attachments": [],
      "batches": ["507f1f77bcf86cd799439011"],
      "createdBy": {
        "name": "Jane Smith",
        "role": "TEACHER"
      },
      "expiresAt": "2025-01-20T00:00:00.000Z",
      "createdAt": "2025-01-05T10:00:00.000Z",
      "readBy": ["507f1f77bcf86cd799439020"]
    }
  ],
  "pagination": { /* ... */ }
}
```

---

### GET `/announcements/:id`

**Description:** Get single announcement (marks as read)

**Permission:** Authenticated

**Path Parameters:**
- `id` - Announcement MongoDB ObjectId (required)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": { /* announcement details */ }
}
```

---

### POST `/announcements`

**Description:** Create new announcement

**Permission:** `ANNOUNCEMENT:CREATE`

**Request Body:**
```json
{
  "title": "string (required)",
  "description": "string (required)",
  "urgency": "LOW | REGULAR | HIGH | URGENT (optional, default: REGULAR)",
  "contentType": "PLAIN | HTML (optional, default: PLAIN)",
  "targetAudience": "STUDENTS | TEACHERS | ALL (optional, default: STUDENTS)",
  "batchIds": ["ObjectId"] (required if not broadcast),
  "isBroadcast": "boolean (optional, default: false)",
  "isPinned": "boolean (optional, default: false)",
  "expiresAt": "ISO date string (optional)",
  "attachments": [
    {
      "type": "IMAGE | AUDIO | VIDEO | DOCUMENT",
      "url": "string",
      "filename": "string",
      "mimeType": "string",
      "size": "number"
    }
  ]
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Announcement created successfully",
  "data": { /* created announcement */ }
}
```

---

### DELETE `/announcements/:id`

**Description:** Delete announcement (soft delete)

**Permission:** `ANNOUNCEMENT:DELETE` (own or all)

**Path Parameters:**
- `id` - Announcement MongoDB ObjectId (required)

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Announcement deleted successfully",
  "data": null
}
```

---

## Batch Change Requests

### POST `/batch-requests`

**Description:** Student creates batch change request

**Permission:** Authenticated (Student)

**Request Body:**
```json
{
  "currentBatchId": "ObjectId (required)",
  "requestedBatchId": "ObjectId (required)",
  "reason": "string (optional)"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Batch change request submitted",
  "data": {
    "_id": "507f1f77bcf86cd799439080",
    "student": "507f1f77bcf86cd799439020",
    "currentBatch": {
      "_id": "507f1f77bcf86cd799439011",
      "batchName": "Guitar Beginners Evening"
    },
    "requestedBatch": {
      "_id": "507f1f77bcf86cd799439012",
      "batchName": "Guitar Advanced Morning"
    },
    "reason": "Want to switch to morning classes",
    "status": "PENDING",
    "createdAt": "2025-01-05T10:00:00.000Z"
  }
}
```

---

### GET `/batch-requests/my`

**Description:** Student views their requests

**Permission:** Authenticated (Student)

**Query Parameters:**
- `page` - number (optional, default: 1)
- `limit` - number (optional, default: 20)

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Your batch change requests",
  "data": [ /* array of requests */ ],
  "pagination": { /* ... */ }
}
```

---

### GET `/batch-requests/teacher`

**Description:** Teacher lists requests for their batches

**Permission:** `BATCH_REQUEST:READ:UNDER_TEACHER`

**Query Parameters:**
- `page` - number (optional, default: 1)
- `limit` - number (optional, default: 20)

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Batch change requests for your batches",
  "data": [ /* requests */ ],
  "pagination": { /* ... */ }
}
```

---

### POST `/batch-requests/:id/teacher-review`

**Description:** Teacher reviews batch change request

**Permission:** `BATCH_REQUEST:REVIEW:AS_TEACHER`

**Path Parameters:**
- `id` - Request MongoDB ObjectId (required)

**Request Body:**
```json
{
  "decision": "APPROVED | REJECTED (required)"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Request approved",
  "data": { /* updated request */ }
}
```

---

### GET `/batch-requests`

**Description:** Admin lists all requests

**Permission:** `BATCH_REQUEST:READ:ALL`

**Query Parameters:**
- `status` - string (optional)
- `batchId` - MongoDB ObjectId (optional)
- `studentId` - MongoDB ObjectId (optional)
- `page` - number (optional, default: 1)
- `limit` - number (optional, default: 20)

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "All batch change requests",
  "data": [ /* requests */ ],
  "pagination": { /* ... */ }
}
```

---

### POST `/batch-requests/:id/admin-review`

**Description:** Admin reviews any request

**Permission:** `BATCH_REQUEST:REVIEW:AS_ADMIN`

**Path Parameters:**
- `id` - Request MongoDB ObjectId (required)

**Request Body:**
```json
{
  "decision": "APPROVED | REJECTED (required)"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Request approved by admin",
  "data": { /* updated request */ }
}
```

---

### POST `/batch-requests/admin-reassign`

**Description:** Admin directly reassigns student (bypasses request flow)

**Permission:** `BATCH_REQUEST:ADMIN_REASSIGN`

**Request Body:**
```json
{
  "studentId": "ObjectId (required)",
  "fromBatchId": "ObjectId (required)",
  "toBatchId": "ObjectId (required)"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Student reassigned to new batch",
  "data": { /* new enrollment */ }
}
```

---

## Admin - Users

### GET `/admin/users`

**Description:** List all users with filters

**Permission:** `USER:READ:ALL`

**Query Parameters:**
- `role` - string (optional)
- `status` - string (optional)
- `search` - string (optional, searches name/email)
- `page` - number (optional, default: 1)
- `limit` - number (optional, default: 20)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439020",
      "name": "John Doe",
      "email": "john@music.com",
      "mobile": "9876543210",
      "role": {
        "name": "STUDENT",
        "permissions": [...]
      },
      "status": "ACTIVE",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "pagination": { /* ... */ }
}
```

---

### GET `/admin/users/:id`

**Description:** Get user details

**Permission:** `USER:READ:ALL`

**Path Parameters:**
- `id` - User MongoDB ObjectId (required)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439020",
    "name": "John Doe",
    "email": "john@music.com",
    "mobile": "9876543210",
    "role": { /* role details */ },
    "status": "ACTIVE",
    "batches": [ /* enrolled batches */ ],
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

### POST `/admin/users`

**Description:** Create a new user

**Permission:** `USER:CREATE`

**Request Body:**
```json
{
  "name": "string (required)",
  "email": "string (required, unique)",
  "mobile": "string (required, 10 digits)",
  "password": "string (required, min 4 chars)",
  "roleName": "ADMIN | TEACHER | STUDENT | GUEST (required)"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "User created successfully",
  "data": { /* created user */ }
}
```

---

### PATCH `/admin/users/:id`

**Description:** Update user details

**Permission:** `USER:UPDATE`

**Path Parameters:**
- `id` - User MongoDB ObjectId (required)

**Request Body:** (all fields optional)
```json
{
  "name": "string",
  "email": "string",
  "mobile": "string"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": { /* updated user */ }
}
```

---

### PUT `/admin/users/:id/role`

**Description:** Update user's role

**Permission:** `USER:ASSIGN_ROLE`

**Path Parameters:**
- `id` - User MongoDB ObjectId (required)

**Request Body:**
```json
{
  "roleId": "ObjectId (optional)",
  "roleName": "ADMIN | TEACHER | STUDENT | GUEST (optional)"
}
```

> Note: Provide either `roleId` or `roleName`

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Role updated to STUDENT. User must re-login.",
  "data": {
    "_id": "507f1f77bcf86cd799439020",
    "name": "John Doe",
    "email": "john@music.com",
    "role": "STUDENT",
    "permissions": [...]
  }
}
```

---

### PUT `/admin/users/:id/status`

**Description:** Update user's status

**Permission:** `USER:UPDATE_STATUS`

**Path Parameters:**
- `id` - User MongoDB ObjectId (required)

**Request Body:**
```json
{
  "status": "ACTIVE | INACTIVE | SUSPENDED (required)"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Status updated to ACTIVE",
  "data": { /* updated user */ }
}
```

---

### DELETE `/admin/users/:id`

**Description:** Delete user (soft delete)

**Permission:** `USER:DELETE`

**Path Parameters:**
- `id` - User MongoDB ObjectId (required)

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "User deleted successfully",
  "data": null
}
```

---

### POST `/admin/users/:id/approve`

**Description:** Approve GUEST → STUDENT upgrade

**Permission:** `USER:UPGRADE_GUEST`

**Path Parameters:**
- `id` - User MongoDB ObjectId (required)

**Request Body:**
```json
{
  "batchId": "ObjectId (optional)"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Guest approved and upgraded to STUDENT",
  "data": {
    "user": { /* updated user */ },
    "enrollment": { /* enrollment if batchId provided */ }
  }
}
```

---

### POST `/admin/users/:id/assign-batch`

**Description:** Assign student to a batch

**Permission:** `USER:ASSIGN_BATCH`

**Path Parameters:**
- `id` - User MongoDB ObjectId (required)

**Request Body:**
```json
{
  "batchId": "ObjectId (required)"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Student assigned to batch",
  "data": { /* enrollment */ }
}
```

---

## Admin - System

### GET `/admin/system/audit`

**Description:** Query audit logs

**Permission:** `SYSTEM_CONFIGURE`

**Query Parameters:**
- `performedBy` - MongoDB ObjectId (optional)
- `targetModel` - string (optional)
- `action` - string (optional)
- `severity` - "INFO" | "WARNING" | "CRITICAL" (optional)
- `fromDate` - ISO date string (optional)
- `toDate` - ISO date string (optional)
- `page` - number (optional, default: 1)
- `limit` - number (optional, default: 50)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439090",
      "action": "ROLE_CHANGED",
      "severity": "CRITICAL",
      "performedBy": {
        "_id": "507f1f77bcf86cd799439001",
        "name": "Admin User"
      },
      "performerRole": "ADMIN",
      "targetModel": "User",
      "targetId": "507f1f77bcf86cd799439020",
      "description": "User role changed from GUEST to STUDENT",
      "previousState": { "role": "GUEST" },
      "newState": { "role": "STUDENT" },
      "metadata": {},
      "requestContext": {
        "requestId": "abc123...",
        "ip": "127.0.0.1",
        "userAgent": "Mozilla/5.0..."
      },
      "createdAt": "2025-01-05T10:00:00.000Z"
    }
  ],
  "pagination": { /* ... */ }
}
```

---

### GET `/admin/system/audit/stats`

**Description:** Get audit statistics

**Permission:** `SYSTEM_CONFIGURE`

**Query Parameters:**
- `days` - number (optional, default: 7)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "total": 1250,
    "byAction": {
      "LOGIN_SUCCESS": 500,
      "ROLE_CHANGED": 10,
      "BATCH_CREATED": 5,
      "ATTENDANCE_MARKED": 735
    },
    "bySeverity": {
      "INFO": 1200,
      "WARNING": 40,
      "CRITICAL": 10
    },
    "byDay": [
      { "date": "2025-01-05", "count": 180 },
      { "date": "2025-01-04", "count": 175 }
    ]
  }
}
```

---

### GET `/admin/system/audit/critical`

**Description:** Get critical security events

**Permission:** `SYSTEM_CONFIGURE`

**Query Parameters:**
- `fromDate` - ISO date string (optional)
- `limit` - number (optional, default: 100)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [ /* critical audit logs */ ]
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Invalid request body/params |
| `AUTHENTICATION_ERROR` | Missing or invalid token |
| `AUTHORIZATION_ERROR` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `ALREADY_EXISTS` | Duplicate resource |
| `OWNERSHIP_ERROR` | Resource doesn't belong to user |
| `BATCH_FULL` | Batch has reached max students |
| `INVALID_BATCH_CHANGE` | Invalid batch change request |
| `INTERNAL_ERROR` | Server error |

---

## Common HTTP Status Codes

- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource already exists
- `500 Internal Server Error` - Server error

---

## Notes for Frontend

1. **Authentication**: Include `Authorization: Bearer <token>` header in all authenticated requests
2. **Refresh Token**: Stored in HTTP-only cookie, automatically sent with requests
3. **Request ID**: Every response includes `X-Request-ID` header for debugging
4. **Pagination**: All list endpoints support `page` and `limit` query parameters
5. **Dates**: All dates are in ISO 8601 format (UTC)
6. **ObjectIds**: All IDs are MongoDB ObjectId strings (24 hex characters)
7. **Soft Delete**: Deleted resources are marked as `isDeleted: true`, not physically removed

---

**Last Updated:** December 31, 2025  
**Contact:** Backend Team for any API changes
