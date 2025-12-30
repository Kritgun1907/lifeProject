# 📢 Announcement API - Quick Reference

## 🎯 Base URL
```
http://localhost:5001/api/announcements
```

## 🔐 Authentication
All endpoints require Bearer token in Authorization header:
```
Authorization: Bearer {your_jwt_token}
```

---

## 📡 Endpoints

### 1️⃣ Create Announcement
```http
POST /api/announcements
Permission: ANNOUNCEMENT:CREATE
```

**Request Body:**
```json
{
  "title": "Class Rescheduled",
  "description": "Tomorrow's guitar class will be at 5 PM",
  "urgency": "URGENT",
  "batchIds": ["675285ba3e4b92dbeaf8ae7d"]
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Announcement created successfully",
  "data": {
    "_id": "...",
    "title": "Class Rescheduled",
    "description": "Tomorrow's guitar class will be at 5 PM",
    "urgency": "URGENT",
    "createdBy": {
      "_id": "...",
      "name": "Teacher One",
      "email": "teacher1@maxmusic.com"
    },
    "createdAt": "2025-12-29T...",
    "updatedAt": "2025-12-29T..."
  }
}
```

---

### 2️⃣ Get All Announcements
```http
GET /api/announcements?page=1&limit=10&urgency=URGENT
Permission: ANNOUNCEMENT:READ
```

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20, max: 100)
- `urgency` (string, optional): Filter by urgency (URGENT, NORMAL, REGULAR)
- `createdBy` (string, optional): Filter by creator user ID

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "title": "Class Rescheduled",
      "description": "Tomorrow's guitar class will be at 5 PM",
      "urgency": "URGENT",
      "createdBy": {
        "_id": "...",
        "name": "Teacher One",
        "email": "teacher1@maxmusic.com"
      },
      "createdAt": "2025-12-29T...",
      "updatedAt": "2025-12-29T..."
    }
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "limit": 10,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

---

### 3️⃣ Get Announcement by ID
```http
GET /api/announcements/:id
Permission: ANNOUNCEMENT:READ
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "title": "Class Rescheduled",
    "description": "Tomorrow's guitar class will be at 5 PM",
    "urgency": "URGENT",
    "createdBy": {
      "_id": "...",
      "name": "Teacher One",
      "email": "teacher1@maxmusic.com"
    },
    "batches": [
      {
        "_id": "...",
        "name": "Guitar Beginners",
        "startDate": "2025-01-01T..."
      }
    ],
    "createdAt": "2025-12-29T...",
    "updatedAt": "2025-12-29T..."
  }
}
```

---

### 4️⃣ Update Announcement
```http
PUT /api/announcements/:id
Permission: ANNOUNCEMENT:UPDATE
```

**Request Body:**
```json
{
  "title": "Updated: Class Rescheduled",
  "urgency": "NORMAL"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Announcement updated successfully",
  "data": {
    "_id": "...",
    "title": "Updated: Class Rescheduled",
    "description": "Tomorrow's guitar class will be at 5 PM",
    "urgency": "NORMAL",
    "createdBy": {
      "_id": "...",
      "name": "Teacher One",
      "email": "teacher1@maxmusic.com"
    },
    "createdAt": "2025-12-29T...",
    "updatedAt": "2025-12-29T..."
  }
}
```

**Note:** Only the creator can update their own announcement.

---

### 5️⃣ Delete Announcement
```http
DELETE /api/announcements/:id
Permission: ANNOUNCEMENT:DELETE
```

**Response (200):**
```json
{
  "success": true,
  "message": "Announcement deleted successfully"
}
```

**Note:** Only the creator can delete their own announcement (soft delete).

---

### 6️⃣ Get Announcements for Batch
```http
GET /api/announcements/batch/:batchId
Permission: ANNOUNCEMENT:READ
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "title": "Class Rescheduled",
      "description": "Tomorrow's guitar class will be at 5 PM",
      "urgency": "URGENT",
      "createdBy": {
        "_id": "...",
        "name": "Teacher One",
        "email": "teacher1@maxmusic.com"
      },
      "createdAt": "2025-12-29T...",
      "updatedAt": "2025-12-29T..."
    }
  ],
  "count": 1
}
```

---

## 🎭 Permission Matrix

| Role | CREATE | READ | UPDATE | DELETE |
|------|--------|------|--------|--------|
| **GUEST** | ❌ | ✅ | ❌ | ❌ |
| **STUDENT** | ❌ | ✅ | ❌ | ❌ |
| **TEACHER** | ✅ | ✅ | ✅ | ❌ |
| **ADMIN** | ✅ | ✅ | ✅ | ✅ |

---

## ⚠️ Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Title is required and must be a non-empty string",
  "errorType": "ValidationError"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required. No token provided."
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Insufficient permissions.",
  "required": "ANNOUNCEMENT:CREATE",
  "errorType": "ForbiddenError"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Announcement with ID 507f1f77bcf86cd799439011 not found",
  "errorType": "NotFoundError"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to create announcement",
  "errorType": "InternalServerError"
}
```

---

## 📝 Field Specifications

### Title
- **Type:** String
- **Required:** Yes
- **Min Length:** 1
- **Max Length:** 200
- **Example:** "Class Rescheduled"

### Description
- **Type:** String
- **Required:** Yes
- **Min Length:** 1
- **Max Length:** 2000
- **Example:** "Tomorrow's guitar class will be at 5 PM instead of 4 PM"

### Urgency
- **Type:** Enum
- **Required:** No
- **Default:** "REGULAR"
- **Values:** "URGENT" | "NORMAL" | "REGULAR"

### BatchIds
- **Type:** Array of MongoDB ObjectIds
- **Required:** No
- **Example:** ["675285ba3e4b92dbeaf8ae7d", "675285ba3e4b92dbeaf8ae7e"]

---

## 🧪 Postman Collection Example

```json
{
  "info": {
    "name": "Announcement API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Create Announcement",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{teacher_token}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"title\": \"Class Rescheduled\",\n  \"description\": \"Tomorrow's guitar class will be at 5 PM\",\n  \"urgency\": \"URGENT\"\n}",
          "options": {
            "raw": {
              "language": "json"
            }
          }
        },
        "url": {
          "raw": "http://localhost:5001/api/announcements",
          "protocol": "http",
          "host": ["localhost"],
          "port": "5001",
          "path": ["api", "announcements"]
        }
      }
    }
  ]
}
```

---

## 💡 Common Use Cases

### 1. Teacher creates urgent announcement
```bash
curl -X POST http://localhost:5001/api/announcements \
  -H "Authorization: Bearer {teacher_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Exam Postponed",
    "description": "Next week exam has been postponed to following Monday",
    "urgency": "URGENT"
  }'
```

### 2. Student views all announcements
```bash
curl -X GET "http://localhost:5001/api/announcements?page=1&limit=10" \
  -H "Authorization: Bearer {student_token}"
```

### 3. Admin filters by urgency
```bash
curl -X GET "http://localhost:5001/api/announcements?urgency=URGENT&page=1" \
  -H "Authorization: Bearer {admin_token}"
```

### 4. Teacher updates their announcement
```bash
curl -X PUT http://localhost:5001/api/announcements/{announcement_id} \
  -H "Authorization: Bearer {teacher_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated: Exam Postponed",
    "urgency": "NORMAL"
  }'
```

---

## 🚦 Rate Limiting (Future)
- 100 requests per minute per user
- 10 POST requests per minute per user

---

## 🔄 Versioning
Current version: **v1**

Future versions will be accessible via:
```
http://localhost:5001/api/v2/announcements
```

---

**Last Updated:** December 29, 2025
**Maintained by:** Backend Team
