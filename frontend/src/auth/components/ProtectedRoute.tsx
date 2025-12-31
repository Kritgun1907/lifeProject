/**
 * ===============================================
 * PROTECTED ROUTE
 * ===============================================
 * Client-side route protection based on authentication
 * and role requirements.
 * 
 * Usage:
 * <ProtectedRoute>
 *   <DashboardContent />
 * </ProtectedRoute>
 * 
 * With role requirement:
 * <ProtectedRoute allowedRoles={["ADMIN", "TEACHER"]}>
 *   <AdminPanel />
 * </ProtectedRoute>
 */

"use client";

import { useEffect, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "../store/auth.store";
import { UserRole } from "../services/auth.service";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo = "/auth/login",
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isInitialized, status } = useAuthStore();

  useEffect(() => {
    // Wait for initialization
    if (!isInitialized || status === "idle") {
      return;
    }

    // Not authenticated - redirect to login
    if (!isAuthenticated) {
      // Store the intended destination for after login
      const returnUrl = encodeURIComponent(pathname);
      router.push(`${redirectTo}?returnUrl=${returnUrl}`);
      return;
    }

    // Check role restrictions if specified
    if (allowedRoles && allowedRoles.length > 0 && user) {
      const hasAllowedRole = allowedRoles.includes(user.role);
      if (!hasAllowedRole) {
        // Redirect to appropriate dashboard based on user's actual role
        router.push(getRoleDashboard(user.role));
        return;
      }
    }
  }, [isInitialized, isAuthenticated, user, allowedRoles, router, pathname, redirectTo, status]);

  // Still initializing
  if (!isInitialized || status === "idle") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show nothing while redirecting
  if (!isAuthenticated) {
    return null;
  }

  // Check role
  if (allowedRoles && allowedRoles.length > 0 && user) {
    const hasAllowedRole = allowedRoles.includes(user.role);
    if (!hasAllowedRole) {
      return null; // Will redirect via useEffect
    }
  }

  // All checks passed - render children
  return <>{children}</>;
}

/**
 * Get the default dashboard for a given role
 * Must match the roleHelpers.getDashboardPath in auth.service
 */
function getRoleDashboard(role: UserRole): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "TEACHER":
      return "/teacher";
    case "STUDENT":
      return "/student";
    case "GUEST":
      return "/public"; // Guest portal with limited access
    default:
      return "/";
  }
}

export default ProtectedRoute;
