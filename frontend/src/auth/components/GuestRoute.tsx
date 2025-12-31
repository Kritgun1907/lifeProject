/**
 * ===============================================
 * GUEST ROUTE
 * ===============================================
 * Protects routes that should ONLY be accessible to
 * unauthenticated users (guests).
 * 
 * Use Cases:
 * - /auth/login
 * - /auth/register
 * - /forgot-password
 * - /landing-page
 * 
 * Behavior:
 * - If user is NOT authenticated → Allow access ✅
 * - If user IS authenticated → Redirect to their dashboard ⚠️
 * 
 * Why?
 * Logged-in users shouldn't see login/register pages.
 * They should be redirected to their role-based dashboard.
 * 
 * Compatible with:
 * ✅ Zustand auth store
 * ✅ Backend RBAC (role-based routing)
 * ✅ Next.js 13+ App Router
 */

"use client";

import { useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../store/auth.store";
import { roleHelpers } from "../services/auth.service";

// ===============================================
// TYPES
// ===============================================

interface GuestRouteProps {
  /**
   * The content to render if user is NOT authenticated
   */
  children: ReactNode;

  /**
   * Optional custom redirect path for authenticated users
   * If not provided, uses role-based dashboard (admin/teacher/student/public)
   */
  redirectTo?: string;
}

// ===============================================
// GUEST ROUTE COMPONENT
// ===============================================

export function GuestRoute({ children, redirectTo }: GuestRouteProps) {
  const router = useRouter();
  const { user, isAuthenticated, isInitialized, status } = useAuthStore();

  useEffect(() => {
    // Wait for auth initialization
    if (!isInitialized || status === "idle") {
      return;
    }

    // If user is authenticated, redirect them away
    if (isAuthenticated && user) {
      const destination = redirectTo || roleHelpers.getDashboardPath(user.role);
      console.log(`[GuestRoute] User authenticated, redirecting to: ${destination}`);
      router.push(destination);
    }
  }, [isInitialized, isAuthenticated, user, router, redirectTo, status]);

  // ===============================================
  // LOADING STATE (while checking auth)
  // ===============================================
  if (!isInitialized || status === "idle") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // ===============================================
  // AUTHENTICATED STATE (redirecting)
  // ===============================================
  if (isAuthenticated) {
    // Show nothing while redirecting to prevent flash
    return null;
  }

  // ===============================================
  // UNAUTHENTICATED STATE (allow access)
  // ===============================================
  return <>{children}</>;
}

export default GuestRoute;
