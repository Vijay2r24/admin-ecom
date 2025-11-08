// Updated permissionUtils.js
export function getPermissionCode(module, name) {
  try {
    const allPermissions = JSON.parse(localStorage.getItem('AllPermissions'));
    const rows = allPermissions || []; // Remove .data?.rows since your data is direct array
    
    const found = rows.find(
      perm =>
        perm.Module?.toLowerCase().trim() === module.toLowerCase().trim() &&
        perm.Name?.toLowerCase().trim() === name.toLowerCase().trim()
    );
    
    // Return PermissionID as Code since Code field doesn't exist
    return found ? found.PermissionID : null;
  } catch {
    return null;
  }
}

export function hasPermissionId(permissionCode) {
  try {
    const allPermissions = JSON.parse(localStorage.getItem('AllPermissions'));
    const permissionIDs = JSON.parse(localStorage.getItem('PermissionIDs'));
    const rows = allPermissions || [];

    const matchingPermission = rows.find(p => p.PermissionID === permissionCode);

    if (!matchingPermission) return false;

    return Array.isArray(permissionIDs) && permissionIDs.includes(matchingPermission.PermissionID);
  } catch {
    return false;
  }
}