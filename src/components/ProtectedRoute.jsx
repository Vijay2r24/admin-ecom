import React, { useEffect, useState } from "react";
import Layout from "../layout/Layout";
import { Navigate, useLocation } from "react-router-dom";
import PlanGate from "../pages/PlanGate";
import {
  getFirstAccessibleHrefForSession,
  isTenantAdminRole,
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
 * @param {{ permissionCode?: string|null, tenantAdminOnly?: boolean }} props
 * `tenantAdminOnly` — only tenant role name `admin` may open (upgrade / subscription pages).
 */
const ProtectedRoute = ({ permissionCode, tenantAdminOnly, children }) => {
  const location = useLocation();
  const token = localStorage.getItem("token");
  const [hasPermission, setHasPermission] = useState(() =>
    permissionCode ? readPermissionAllowed(permissionCode) : true
  );

  useEffect(() => {
    setHasPermission(permissionCode ? readPermissionAllowed(permissionCode) : true);
  }, [permissionCode]);

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (tenantAdminOnly) {
    if (!isTenantAdminRole()) {
      const next = getFirstAccessibleHrefForSession();
      const target =
        next && next !== location.pathname ? next : "/not-authorized";
      return <Navigate to={target} replace />;
    }
    return <Layout>{children}</Layout>;
  }

  if (!hasPermission) {
    if (isTenantAdminRole()) {
      return (
        <Layout>
          <PlanGate />
        </Layout>
      );
    }
    const next = getFirstAccessibleHrefForSession();
    const target =
      next && next !== location.pathname ? next : "/not-authorized";
    return (
      <Layout>
        <Navigate to={target} replace />
      </Layout>
    );
  }

  return <Layout>{children}</Layout>;
};

export default ProtectedRoute;
