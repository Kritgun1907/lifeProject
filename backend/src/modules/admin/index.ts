/**
 * ===============================================
 * ADMIN MODULE EXPORTS
 * ===============================================
 * Central export point for admin module.
 */

// Main router
export { default as adminRouter } from "./admin.routes";

// Sub-modules
export * from "./users";
export * from "./roles";
export * from "./settings";
