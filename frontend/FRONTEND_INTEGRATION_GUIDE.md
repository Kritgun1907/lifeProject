# Frontend Integration Guide

**Version:** 1.0.0  
**Backend Version:** 1.0.0  
**Last Updated:** December 31, 2025

## 🎯 Quick Start

### Base Configuration

```javascript
// config/api.js
export const API_CONFIG = {
  baseURL: 'http://localhost:5000/api',
  timeout: 10000,
};
```

### Authentication Setup

```javascript
// services/auth.service.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true, // Important for refresh token cookie
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const { data } = await axios.post(
          'http://localhost:5000/api/auth/refresh',
          {},
          { withCredentials: true }
        );
        
        localStorage.setItem('accessToken', data.token);
        originalRequest.headers.Authorization = `Bearer ${data.token}`;
        
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
```

---

## 📋 Required Fields Reference

### User Registration
```typescript
{
  name: string;        // Min 2 chars, required
  email: string;       // Valid email, unique, required
  mobile: string;      // Exactly 10 digits, required
  password: string;    // Min 4 chars, required
}
```

### User Login
```typescript
{
  email: string;       // Required
  password: string;    // Required
}
```

### Create Batch (Admin)
```typescript
{
  batchName: string;      // Required
  instrument: ObjectId;   // Required (24-char hex string)
  teacher: ObjectId;      // Required
  workingDay: ObjectId;   // Required
  workingTiming: ObjectId; // Required
  mode: 'ONLINE' | 'OFFLINE'; // Required
  maxStudents: number;    // Required, min 1
}
```

### Mark Attendance (Teacher)
```typescript
{
  batchId: ObjectId;      // Required
  date: string;           // Required (ISO date)
  records: Array<{
    studentId: ObjectId;  // Required
    status: 'PRESENT' | 'ABSENT'; // Required
  }>;
}
```

### Create Holiday
```typescript
{
  date: string;           // Required (ISO date)
  batchId: ObjectId;      // Required
  reason: string;         // Required
}
```

### Create Announcement
```typescript
{
  title: string;                     // Required
  description: string;               // Required
  urgency?: 'LOW' | 'REGULAR' | 'HIGH' | 'URGENT'; // Default: REGULAR
  batchIds?: ObjectId[];            // Required if not broadcast
  isBroadcast?: boolean;            // Default: false
  isPinned?: boolean;               // Default: false
  expiresAt?: string;               // ISO date (optional)
}
```

### Batch Change Request (Student)
```typescript
{
  currentBatchId: ObjectId;  // Required
  requestedBatchId: ObjectId; // Required
  reason?: string;            // Optional
}
```

---

## 🔐 Authentication Flow

### Login Flow

```javascript
// 1. Login
const login = async (email, password) => {
  const { data } = await api.post('/auth/login', { email, password });
  
  // Store token
  localStorage.setItem('accessToken', data.token);
  
  // Store user data
  localStorage.setItem('user', JSON.stringify(data.user));
  
  return data.user;
};

// 2. Use token in subsequent requests (automatic via interceptor)
const getMyBatches = async () => {
  const { data } = await api.get('/batches/my');
  return data.data;
};

// 3. Logout
const logout = async (everywhere = false) => {
  await api.post('/auth/logout', { everywhere });
  localStorage.removeItem('accessToken');
  localStorage.removeItem('user');
  window.location.href = '/login';
};
```

### Token Refresh (Automatic)

The token refresh happens automatically via the interceptor.  
The backend uses an HTTP-only cookie for the refresh token.

---

## 📊 Response Handling

### Success Response

```javascript
{
  success: true,
  data: { /* ... */ },
  message: "Optional message"
}
```

Example handling:
```javascript
const { data } = await api.get('/batches/my');
if (data.success) {
  const batches = data.data;
  // Use batches
}
```

### Paginated Response

```javascript
{
  success: true,
  data: [ /* items */ ],
  pagination: {
    total: 100,
    page: 1,
    limit: 20,
    totalPages: 5
  }
}
```

Example handling:
```javascript
const { data } = await api.get('/admin/users', {
  params: { page: 1, limit: 20 }
});

const users = data.data;
const { total, page, totalPages } = data.pagination;
```

### Error Response

```javascript
{
  success: false,
  message: "Error description",
  error: "ERROR_CODE",
  statusCode: 400
}
```

Example handling:
```javascript
try {
  const { data } = await api.post('/batches', batchData);
} catch (error) {
  if (error.response) {
    const { message, error: errorCode, statusCode } = error.response.data;
    
    // Display error to user
    if (statusCode === 401) {
      // Unauthorized - redirect to login
    } else if (statusCode === 403) {
      // Forbidden - show permission denied
    } else {
      // Show error message
      alert(message);
    }
  }
}
```

---

## 🎨 UI Components Guide

### Role-Based UI

```javascript
// utils/permissions.js
export const hasPermission = (user, permission) => {
  return user.permissions?.includes(permission);
};

// Component example
function BatchActions({ user, batch }) {
  const canUpdate = hasPermission(user, 'BATCH:UPDATE:ALL') ||
                    (hasPermission(user, 'BATCH:UPDATE:UNDER_TEACHER') && 
                     batch.teacher._id === user.id);
  
  return (
    <div>
      {canUpdate && <button>Edit Batch</button>}
    </div>
  );
}
```

### Conditional Rendering by Role

```javascript
function Dashboard({ user }) {
  if (user.role === 'ADMIN') {
    return <AdminDashboard />;
  } else if (user.role === 'TEACHER') {
    return <TeacherDashboard />;
  } else if (user.role === 'STUDENT') {
    return <StudentDashboard />;
  } else {
    return <GuestDashboard />;
  }
}
```

---

## 🔍 Common Patterns

### Fetching Data

```javascript
// List with pagination
const fetchUsers = async (page = 1, filters = {}) => {
  const { data } = await api.get('/admin/users', {
    params: { page, limit: 20, ...filters }
  });
  return data;
};

// Single item
const fetchUser = async (userId) => {
  const { data } = await api.get(`/admin/users/${userId}`);
  return data.data;
};
```

### Creating Resources

```javascript
const createBatch = async (batchData) => {
  const { data } = await api.post('/batches', batchData);
  return data.data;
};
```

### Updating Resources

```javascript
const updateBatch = async (batchId, updates) => {
  const { data } = await api.put(`/batches/${batchId}`, updates);
  return data.data;
};
```

### Deleting Resources

```javascript
const deleteBatch = async (batchId) => {
  const { data } = await api.delete(`/batches/${batchId}`);
  return data;
};
```

---

## 📅 Date Handling

### Sending Dates

Always send dates in ISO 8601 format:

```javascript
// Good
const createHoliday = async (date, batchId, reason) => {
  const isoDate = new Date(date).toISOString();
  return api.post('/holidays', {
    date: isoDate,  // "2025-01-15T00:00:00.000Z"
    batchId,
    reason
  });
};

// Also good (string format)
const markAttendance = async (batchId, dateString, records) => {
  return api.post('/attendance/mark', {
    batchId,
    date: dateString,  // "2025-01-15"
    records
  });
};
```

### Receiving Dates

Backend returns ISO 8601 strings:

```javascript
const displayDate = (isoString) => {
  const date = new Date(isoString);
  return date.toLocaleDateString(); // Format as needed
};

// Example
const holiday = {
  date: "2025-01-15T00:00:00.000Z",
  reason: "National Holiday"
};
console.log(displayDate(holiday.date)); // "1/15/2025"
```

---

## 🔔 Real-time Features (Future)

Currently not implemented, but prepared for:

```javascript
// WebSocket connection (future)
const socket = io('http://localhost:5000', {
  auth: {
    token: localStorage.getItem('accessToken')
  }
});

socket.on('announcement:new', (announcement) => {
  // Show notification
});

socket.on('attendance:marked', (data) => {
  // Update UI
});
```

---

## 🚨 Error Codes Reference

| Code | Description | Action |
|------|-------------|--------|
| `VALIDATION_ERROR` | Invalid input | Show field-specific errors |
| `AUTHENTICATION_ERROR` | Token missing/invalid | Redirect to login |
| `AUTHORIZATION_ERROR` | Insufficient permissions | Show "Access Denied" |
| `NOT_FOUND` | Resource not found | Show 404 page |
| `ALREADY_EXISTS` | Duplicate resource | Inform user (e.g., "Email already exists") |
| `OWNERSHIP_ERROR` | Not your resource | Show "Access Denied" |
| `BATCH_FULL` | Batch at capacity | Inform user |
| `INVALID_BATCH_CHANGE` | Invalid request | Show error details |
| `INTERNAL_ERROR` | Server error | Show generic error, log for support |

---

## 🧪 Testing Accounts

```
Admin:
  Email: admin@music.com
  Password: Test@123

Teacher:
  Email: teacher@music.com
  Password: Test@123

Student:
  Email: student@music.com
  Password: Test@123
```

---

## 📦 Sample Service Files

### auth.service.js

```javascript
import api from './api';

export const authService = {
  register: async (userData) => {
    const { data } = await api.post('/auth/register', userData);
    localStorage.setItem('accessToken', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data.user;
  },

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data.user;
  },

  logout: async (everywhere = false) => {
    await api.post('/auth/logout', { everywhere });
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
  },

  getCurrentUser: async () => {
    const { data } = await api.get('/auth/me');
    return data.data;
  },

  updateProfile: async (updates) => {
    const { data } = await api.patch('/auth/profile', updates);
    localStorage.setItem('user', JSON.stringify(data.data));
    return data.data;
  },

  changePassword: async (currentPassword, newPassword) => {
    await api.post('/auth/change-password', { currentPassword, newPassword });
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
  }
};
```

### batch.service.js

```javascript
import api from './api';

export const batchService = {
  // Student
  getMyBatches: async () => {
    const { data } = await api.get('/batches/my');
    return data.data;
  },

  getMyBatchSchedule: async (batchId) => {
    const { data } = await api.get(`/batches/my/${batchId}/schedule`);
    return data.data;
  },

  getZoomLink: async (batchId) => {
    const { data } = await api.get(`/batches/my/${batchId}/zoom`);
    return data.data;
  },

  // Teacher
  getTeacherBatches: async () => {
    const { data } = await api.get('/batches/teacher');
    return data.data;
  },

  getBatchStudents: async (batchId) => {
    const { data } = await api.get(`/batches/teacher/${batchId}/students`);
    return data.data;
  },

  createZoomSession: async (batchId, sessionData) => {
    const { data } = await api.post(`/batches/teacher/${batchId}/zoom`, sessionData);
    return data.data;
  },

  // Admin
  getAllBatches: async (filters = {}) => {
    const { data } = await api.get('/batches', { params: filters });
    return data.data;
  },

  createBatch: async (batchData) => {
    const { data } = await api.post('/batches', batchData);
    return data.data;
  },

  updateBatch: async (batchId, updates) => {
    const { data } = await api.put(`/batches/${batchId}`, updates);
    return data.data;
  },

  deleteBatch: async (batchId) => {
    await api.delete(`/batches/${batchId}`);
  },

  addStudent: async (batchId, studentId) => {
    const { data } = await api.post(`/batches/${batchId}/students`, { studentId });
    return data.data;
  },

  removeStudent: async (batchId, studentId) => {
    await api.delete(`/batches/${batchId}/students/${studentId}`);
  }
};
```

---

## 🎯 Next Steps

1. ✅ **Read API Contracts** (`API_CONTRACTS.md`) - Full endpoint documentation
2. ✅ **Check Permissions** (`PERMISSIONS_MATRIX.md`) - Role-based access
3. ✅ **Setup Auth** - Implement login/logout flow
4. ✅ **Create Services** - One service file per resource
5. ✅ **Build Components** - Role-based conditional rendering
6. ✅ **Test** - Use provided test accounts

---

## 📞 Support

- **API Issues**: Check browser console for request/response details
- **Permission Issues**: Check `X-Request-ID` header and verify role/permissions
- **Backend Logs**: Check server console for color-coded request logs
- **Audit Trail**: Admins can view `/admin/system/audit` for system activity

---

**Questions?** Contact the backend team!

**Last Updated:** December 31, 2025
