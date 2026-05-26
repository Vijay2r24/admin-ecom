import {
  APP_ROUTES,
  MODULES,
  PERMISSIONS,
  PRODUCT_SETUP_TAB,
} from "../contants/constants";
import { getPermissionCode, hasPermissionId } from "./permissionUtils";

/** Product Setup tab key → view permission (module + name). */
export const PRODUCT_SETUP_TAB_VIEW_PERMISSIONS = {
  [PRODUCT_SETUP_TAB.BRANDS]: {
    module: MODULES.PRODUCT_SETUP,
    permission: PERMISSIONS.VIEW_BRANDS,
  },
  [PRODUCT_SETUP_TAB.CATEGORIES]: {
    module: MODULES.PRODUCT_SETUP,
    permission: PERMISSIONS.VIEW_CATEGORIES,
  },
  [PRODUCT_SETUP_TAB.ATTRIBUTE_TYPES]: {
    module: MODULES.PRODUCT_SETUP,
    permission: PERMISSIONS.VIEW_ATTRIBUTE_TYPES,
  },
  [PRODUCT_SETUP_TAB.COLORS]: {
    module: MODULES.PRODUCT_SETUP,
    permission: PERMISSIONS.VIEW_COLOURS,
  },
  [PRODUCT_SETUP_TAB.ATTRIBUTES]: {
    module: MODULES.PRODUCT_SETUP,
    permission: PERMISSIONS.VIEW_ATTRIBUTES,
  },
  [PRODUCT_SETUP_TAB.SPECIFICATION_TYPES]: {
    module: MODULES.PRODUCT_SETUP,
    permission: PERMISSIONS.VIEW_SPECIFICATION_TYPE_DETAILS,
  },
};

export function getProductSetupTabViewPermissionCode(tabKey) {
  const entry = PRODUCT_SETUP_TAB_VIEW_PERMISSIONS[tabKey];
  if (!entry) return null;
  return getPermissionCode(entry.module, entry.permission);
}

export function hasProductSetupTabViewPermission(tabKey) {
  const code = getProductSetupTabViewPermissionCode(tabKey);
  if (!code) return false;
  return hasPermissionId(code);
}

/** True when the role has at least one Product Setup view permission. */
export function hasAnyProductSetupViewPermission() {
  return Object.keys(PRODUCT_SETUP_TAB_VIEW_PERMISSIONS).some(
    hasProductSetupTabViewPermission
  );
}

export function isProductSetupPath(pathname) {
  if (!pathname) return false;
  return (
    pathname === APP_ROUTES.BROWSE ||
    pathname.startsWith(`${APP_ROUTES.BROWSE}/`)
  );
}
