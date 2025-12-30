import express from "express";
import cookieParser from "cookie-parser";

// Middleware
import { requestLogger } from "./middleware/requestLogger.middleware";

// Module routes (enterprise pattern)
import {
  authRouter,
  adminRouter,
  announcementsRouter,
  paymentsRouter,
  holidaysRouter,
  analyticsRouter,
  batchRequestsRouter,
  attendanceRouter,
  batchesRouter,
  profileRouter,
} from "./modules";

// Error handling middleware
import { errorMiddleware } from "./utils/errorHandler";

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser()); // Required for refresh token cookies
app.use(requestLogger); // Request logging with request ID and timing

// Health check
app.get("/", (_req, res) => {
  res.send("Music School API running");
});

// ============================================
// API ROUTES (Enterprise Module Pattern)
// ============================================

// Authentication & Profile
app.use("/auth", authRouter);

// Admin Operations (requires ADMIN role)
app.use("/admin", adminRouter);

// Announcements
app.use("/api/announcements", announcementsRouter);

// Payments
app.use("/api/payments", paymentsRouter);

// Holidays
app.use("/api/holidays", holidaysRouter);

// Analytics & Reports
app.use("/api/analytics", analyticsRouter);

// Batch Change Requests (Student self-service)
app.use("/api/batch-requests", batchRequestsRouter);

// Attendance
app.use("/api/attendance", attendanceRouter);

// Batches
app.use("/api/batches", batchesRouter);

// Profile Management
app.use("/api/profile", profileRouter);

// ============================================
// ERROR HANDLING MIDDLEWARE (must be last)
// ============================================
app.use(errorMiddleware);

export default app;
