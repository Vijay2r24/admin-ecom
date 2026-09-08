// Updated permissionUtils.js
/** Compare permission UUIDs from JWT vs AllPermissions without type mismatch (string vs number). */
export function permissionIdsInclude(permissionIDs, targetPermissionId) {
  if (targetPermissionId == null || targetPermissionId === "") {
    return false;
  }
  const ids = Array.isArray(permissionIDs) ? permissionIDs : [];
  return ids.some((id) => String(id) === String(targetPermissionId));
}

export function getPermissionCode(module, name) {
  try {
    const allPermissions = JSON.parse(localStorage.getItem('AllPermissions'));
    if (!allPermissions || !Array.isArray(allPermissions) || allPermissions.length === 0) {
      return null;
    }
    const rows = allPermissions;
    
    const found = rows.find(
      perm =>
        perm.Module?.toLowerCase().trim() === module.toLowerCase().trim() &&
        perm.Name?.toLowerCase().trim() === name.toLowerCase().trim()
    );
    
    return found ? found.PermissionID : null;
  } catch (error) {
  
    return null;
  }
}

export function hasPermissionId(permissionCode) {
  try {
    const allPermissions = JSON.parse(localStorage.getItem('AllPermissions'));
    const permissionIDs = JSON.parse(localStorage.getItem('PermissionIDs'));

    // If AllPermissions hasn't loaded yet, don't block the user
    if (!allPermissions || !Array.isArray(allPermissions) || allPermissions.length === 0) {
      return true;
    }

    const rows = allPermissions;

    const matchingPermission = rows.find(
      (p) => String(p.PermissionID) === String(permissionCode)
    );

    // Permission not found in master list — allow (unknown permission = unrestricted)
    if (!matchingPermission) return false;

    return permissionIdsInclude(permissionIDs, matchingPermission.PermissionID);
  } catch {
    return false;
  }
}

/**
 * Check if a feature code is enabled for the current user.
 * Uses EnabledFeatureCodes from login response stored in localStorage.
 * Returns true if no feature codes are stored (backward compatible).
 */
export function isFeatureCodeEnabled(featureCode) {
  try {
    const codes = JSON.parse(localStorage.getItem("EnabledFeatureCodes"));
    if (!codes || !Array.isArray(codes) || codes.length === 0) return true;
    return codes.includes(featureCode);
  } catch {
    return true;
  }
}

/**
 * Get all enabled feature codes.
 */
export function getEnabledFeatureCodes() {
  try {
    const codes = JSON.parse(localStorage.getItem("EnabledFeatureCodes"));
    return Array.isArray(codes) ? codes : [];
  } catch {
    return [];
  }
}
