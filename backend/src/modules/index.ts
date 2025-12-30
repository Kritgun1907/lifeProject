/**
 * ===============================================
 * MODULES INDEX
 * ===============================================
 * Central export point for all module routers.
 * Import this in app.ts to mount all routes.
 */

// Module routers
export { authRouter } from "./auth";
export { adminRouter } from "./admin";
export { announcementsRouter } from "./announcements";
export { paymentsRouter } from "./payments";
export { holidaysRouter } from "./holidays";
export { analyticsRouter } from "./analytics";
export { batchRequestsRouter } from "./batch-requests";
export { attendanceRouter } from "./attendance";
export { batchesRouter } from "./batches";
export { profileRouter } from "./profile";

// Re-export shared utilities
export * from "./shared";
