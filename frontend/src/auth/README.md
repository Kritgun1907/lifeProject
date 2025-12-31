# 🔐 Authentication Module

Complete authentication system for the Music School LMS frontend.

## 📁 Structure

```
src/auth/
├── index.ts                    # Barrel exports (main entry point)
├── api.ts                      # Axios client with token refresh
├── components/
│   └── ProtectedRoute.tsx      # Route guards (ProtectedRoute, GuestRoute)
├── providers/
│   └── AuthProvider.tsx        # Auth initialization provider
├── services/
│   └── auth.service.ts         # Auth API service layer
└── store/
    └── auth.store.ts           # Zustand auth state management
```

## 🚀 Quick Start

### Import from module root:
```typescript
import { 
  useAuthStore, 
  authService, 
  ProtectedRoute,
  tokenManager 
} from "@/src/auth";
```

### Or import from main src:
```typescript
import { useAuthStore, authService } from "@/src";
```

## 📦 Exports

### Store (Zustand)
- `useAuthStore` - Main auth store hook
- `useUser()` - Get current user
- `useRole()` - Get current user role
- `useIsAuthenticated()` - Check if authenticated
- `useIsAdmin()`, `useIsTeacher()`, `useIsStudent()` - Role helpers
- `useDashboardPath()` - Get role-based dashboard path

### Services
- `authService` - Auth API methods (login, register, logout, etc.)
- `roleHelpers` - Role-based utility functions

### Components
- `ProtectedRoute` - Protect routes (require auth + optional role)
- `GuestRoute` - Guest-only routes (redirect if authenticated)

### Providers
- `AuthProvider` - Initialize auth on app load (wraps root layout)

### API
- `tokenManager` - Access token management
- `apiClient` - Typed HTTP methods

## 🔧 Usage Examples

### Protect a route:
```tsx
<ProtectedRoute>
  <DashboardContent />
</ProtectedRoute>
```

### Protect with role restriction:
```tsx
<ProtectedRoute allowedRoles={["ADMIN", "TEACHER"]}>
  <AdminPanel />
</ProtectedRoute>
```

### Guest-only route (login/register):
```tsx
<GuestRoute>
  <LoginForm />
</GuestRoute>
```

### Access auth state:
```tsx
function MyComponent() {
  const user = useUser();
  const isAdmin = useIsAdmin();
  const { login, logout } = useAuthStore();
  
  return <div>Welcome, {user?.name}</div>;
}
```

### Call auth service directly:
```tsx
import { authService } from "@/src/auth";

async function handleLogin(email: string, password: string) {
  try {
    const response = await authService.login({ email, password });
    console.log("Logged in as:", response.user);
  } catch (error) {
    console.error("Login failed:", error);
  }
}
```

## 🔑 Token Management

- **Access Token**: Stored in `localStorage`, managed by frontend
- **Refresh Token**: httpOnly cookie, managed by backend
- **Auto-refresh**: Handled automatically on 401 responses
- **Token injection**: Automatic via Axios interceptor

## 🛡️ Security

- Frontend only checks roles for routing (NOT permissions)
- Backend enforces all permissions
- Refresh token never exposed to JavaScript
- Access token cleared on logout

## 📍 Backend API

Base URL: `http://localhost:5001/api`

### Endpoints:
- `POST /auth/login` - Login
- `POST /auth/register` - Register
- `POST /auth/logout` - Logout
- `POST /auth/refresh` - Refresh token
- `GET /auth/me` - Get current user
- `PATCH /auth/profile` - Update profile
- `POST /auth/change-password` - Change password

## 🧪 Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@music.com` | `Test@123` |
| Teacher | `teacher@music.com` | `Test@123` |
| Student | `student@music.com` | `Test@123` |
| Guest | `guest@music.com` | `Test@123` |
