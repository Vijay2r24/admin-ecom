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
    const permissionIDs = JSON.parse(localStorage.getItem('PermissionIDs'));
    const rows = allPermissions || [];
    
    
    
    const found = rows.find(
      perm =>
        perm.Module?.toLowerCase().trim() === module.toLowerCase().trim() &&
        perm.Name?.toLowerCase().trim() === name.toLowerCase().trim()
    );
    
    if (found) {
      const hasPermission = permissionIDs && permissionIDs.includes(found.PermissionID);
      
    } else {
      
    }
    
    return found ? found.PermissionID : null;
  } catch (error) {
  
    return null;
  }
}

export function hasPermissionId(permissionCode) {
  try {
    const allPermissions = JSON.parse(localStorage.getItem('AllPermissions'));
    const permissionIDs = JSON.parse(localStorage.getItem('PermissionIDs'));
    const rows = allPermissions || [];

    const matchingPermission = rows.find(
      (p) => String(p.PermissionID) === String(permissionCode)
    );

    if (!matchingPermission) return false;

    return permissionIdsInclude(permissionIDs, matchingPermission.PermissionID);
  } catch {
    return false;
  }
}