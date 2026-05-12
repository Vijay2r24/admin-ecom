import React, { useEffect, useState } from "react";
import Layout from "../layout/Layout";
import { Navigate, useLocation } from "react-router-dom";
import PlanGate from "../pages/PlanGate";
import {
  getFirstAccessibleHrefForSession,
  isTenantAdminRole,
  isPathnameRestrictedByPlan,
} from "../utils/planAccessUtils";
import { permissionIdsInclude } from "../utils/permissionUtils";

function readPermissionAllowed(permissionCode) {
  if (!permissionCode) {
    return true;
  }
  try {
    const permissionIDs =
      JSON.parse(localStorage.getItem("PermissionIDs")) || [];
    return permissionIdsInclude(permissionIDs, permissionCode);
  } catch {
    return false;
  }
}

/**
 * Route guard with three distinct behaviours depending on role:
 *
 *  ┌─────────────┬──────────────────────────┬──────────────────────────┐
 *  │ Role        │ Plan-restricted path     │ Permission-denied path   │
 *  ├─────────────┼──────────────────────────┼──────────────────────────┤
 *  │ Admin       │ Show PlanGate (upgrade)  │ Admin has all perms      │
 *  │ Other roles │ Redirect (can't upgrade) │ Redirect to first page   │
 *  └─────────────┴──────────────────────────┴──────────────────────────┘
 *
 * @param {{ permissionCode?: string|null, tenantAdminOnly?: boolean }} props
 */
const ProtectedRoute = ({ permissionCode, tenantAdminOnly, children }) => {
  const location = useLocation();
  const token = localStorage.getItem("token");
  const isAdmin = isTenantAdminRole();

  const [hasPermission, setHasPermission] = useState(() =>
    permissionCode ? readPermissionAllowed(permissionCode) : true
  );

  useEffect(() => {
    setHasPermission(
      permissionCode ? readPermissionAllowed(permissionCode) : true
    );
  }, [permissionCode]);

  // ── 1. Not logged in ──────────────────────────────────────────────
  if (!token) {
    return <Navigate to="/" replace />;
  }

  // ── 2. Tenant-admin-only pages (subscription, etc.) ───────────────
  if (tenantAdminOnly) {
    if (!isAdmin) {
      const next = getFirstAccessibleHrefForSession();
      const target =
        next && next !== location.pathname ? next : "/not-authorized";
      return <Navigate to={target} replace />;
    }
    return <Layout>{children}</Layout>;
  }

  // ── 3. Plan-based restriction ─────────────────────────────────────
  //   Admin sees PlanGate so they can upgrade.
  //   Non-admin is redirected silently — they cannot upgrade the plan.
  if (isPathnameRestrictedByPlan(location.pathname)) {
    if (isAdmin) {
      return (
        <Layout>
          <PlanGate />
        </Layout>
      );
    }
    const next = getFirstAccessibleHrefForSession();
    const target =
      next && next !== location.pathname ? next : "/not-authorized";
    return <Navigate to={target} replace />;
  }

  // ── 4. Permission check (non-admin, plan allows the module) ───────
  if (!hasPermission) {
    if (isAdmin) {
      // Admin role should have all permissions; if somehow missing, still show content
      return <Layout>{children}</Layout>;
    }
    const next = getFirstAccessibleHrefForSession();
    const target =
      next && next !== location.pathname ? next : "/not-authorized";
    return <Navigate to={target} replace />;
  }

  return <Layout>{children}</Layout>;
};

export default ProtectedRoute;
