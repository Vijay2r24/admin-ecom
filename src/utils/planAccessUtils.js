import {
  WINDOW_CUSTOM_EVENTS,
  PRODUCT_DETAILS_TAB,
} from "../contants/constants";
import { getPermissionCode, permissionIdsInclude } from "./permissionUtils";

const SUBSCRIPTION_READ_ONLY_LS = "subscriptionReadOnly";

export function markSubscriptionReadOnlyMode() {
  try {
    localStorage.setItem(SUBSCRIPTION_READ_ONLY_LS, "1");
  } catch {
    /* ignore */
  }
  window.dispatchEvent(
    new CustomEvent(WINDOW_CUSTOM_EVENTS.SUBSCRIPTION_READ_ONLY_CHANGED)
  );
}

export function clearSubscriptionReadOnlyMode() {
  try {
    localStorage.removeItem(SUBSCRIPTION_READ_ONLY_LS);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(
    new CustomEvent(WINDOW_CUSTOM_EVENTS.SUBSCRIPTION_READ_ONLY_CHANGED)
  );
}

export function isSubscriptionReadOnlyMode() {
  try {
    return localStorage.getItem(SUBSCRIPTION_READ_ONLY_LS) === "1";
  } catch {
    return false;
  }
}

/**
 * Maps sidebar hrefs to tokens returned in login `AllowedFeatures`.
 * Comparison is case-insensitive. If `AllowedFeatures` is missing or empty, no plan gating is applied.
 * Align these token strings with your API’s `AllowedFeatures` values.
 */
export const PLAN_FEATURE_TOKEN_BY_HREF = {
  "/dashboard": "dashboard",
  "/orders": "orders",
  "/browse": "products",
  "/productList": "products",
  "/InventoryList": "inventory",
  "/stores": "stores",
  "/users": "users",
  "/userRoles": "roles",
  "/banners": "banners",
  "/notifications": "notifications",
  "/bulk-import": "bulk_import",
  "/bulk-images": "bulk_images",
  "/payments": "payments",
  "/theme-settings": "tenant_settings",
  "/subscription": "subscription",
};

/** Tenant admin (role name "admin") still sees plan-gated nav for upgrade; role users rely on permissions + plan. */
export function isTenantAdminRole() {
  try {
    const raw = localStorage.getItem("userDetails");
    if (raw) {
      const u = JSON.parse(raw);
      const fromProfile = (u?.RoleName ?? u?.roleName ?? "")
        .toString()
        .toLowerCase()
        .trim();
      if (fromProfile === "admin") {
        return true;
      }
    }
    const sessionRole = (localStorage.getItem("sessionRoleName") || "")
      .toString()
      .toLowerCase()
      .trim();
    return sessionRole === "admin";
  } catch {
    return false;
  }
}

export function isPlanExpiredFromLoginPayload(data) {
  if (!data || typeof data !== "object") {
    return false;
  }
  if (data.IsPlanExpired === true || data.PlanIsExpired === true) {
    return true;
  }
  if (data.IsPlanActive === false || data.SubscriptionIsActive === false) {
    return true;
  }
  const exp =
    data.PlanExpiryDate ||
    data.SubscriptionExpiryDate ||
    data.PlanExpiresAt ||
    data.SubscriptionExpiresAt;
  if (exp) {
    const t = new Date(exp).getTime();
    if (!Number.isNaN(t) && t < Date.now()) {
      return true;
    }
  }
  return false;
}

export function isPlanExpiredFromSubscriptionStorage() {
  try {
    const sub = JSON.parse(localStorage.getItem("subscription"));
    if (!sub) {
      return false;
    }
    if (sub.isPlanExpired === true || sub.planIsActive === false) {
      return true;
    }
    if (sub.planExpiresAt) {
      const t = new Date(sub.planExpiresAt).getTime();
      if (!Number.isNaN(t) && t < Date.now()) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

export function isHrefAllowedBySubscriptionPlan(
  href,
  allowedFeatures,
  ignorePlanRestrictions = false
) {
  if (ignorePlanRestrictions) {
    return true;
  }
  if (!Array.isArray(allowedFeatures) || allowedFeatures.length === 0) {
    return true;
  }
  const token = PLAN_FEATURE_TOKEN_BY_HREF[href];
  if (!token) {
    return true;
  }
  const want = String(token).toLowerCase().trim();
  return allowedFeatures.some(
    (f) => String(f).toLowerCase().trim() === want
  );
}

/** Product Setup (/browse) — per tab. Broad `products` in AllowedFeatures unlocks all tabs. */
export const PLAN_FEATURE_TOKEN_BY_PRODUCT_SETUP_TAB = {
  brands: "product_setup_brands",
  categories: "product_setup_categories",
  attributeTypes: "product_setup_attribute_types",
  colors: "product_setup_colors",
  attributes: "product_setup_attributes",
  specificationTypes: "product_setup_specification_types",
};

export function isProductSetupTabAllowedByPlan(
  tabKey,
  allowedFeatures,
  ignorePlanRestrictions = false
) {
  if (ignorePlanRestrictions) {
    return true;
  }
  if (!Array.isArray(allowedFeatures) || allowedFeatures.length === 0) {
    return true;
  }
  const granular = PLAN_FEATURE_TOKEN_BY_PRODUCT_SETUP_TAB[tabKey];
  const set = new Set(
    allowedFeatures.map((f) => String(f).toLowerCase().trim())
  );
  if (set.has("products")) {
    return true;
  }
  if (!granular) {
    return true;
  }
  return set.has(String(granular).toLowerCase().trim());
}

/** Product details page — per main tab. Broad `products` unlocks all. */
export const PLAN_FEATURE_TOKEN_BY_PRODUCT_DETAILS_TAB = {
  [PRODUCT_DETAILS_TAB.VARIANTS]: "product_details_variants",
  [PRODUCT_DETAILS_TAB.INVENTORY]: "product_details_inventory",
  [PRODUCT_DETAILS_TAB.SPECS]: "product_details_specifications",
};

export function isProductDetailTabAllowedByPlan(
  tabKey,
  allowedFeatures,
  ignorePlanRestrictions = false
) {
  if (ignorePlanRestrictions) {
    return true;
  }
  if (!Array.isArray(allowedFeatures) || allowedFeatures.length === 0) {
    return true;
  }
  const granular = PLAN_FEATURE_TOKEN_BY_PRODUCT_DETAILS_TAB[tabKey];
  const set = new Set(
    allowedFeatures.map((f) => String(f).toLowerCase().trim())
  );
  if (set.has("products")) {
    return true;
  }
  if (!granular) {
    return true;
  }
  return set.has(String(granular).toLowerCase().trim());
}

export function getSubscriptionFeaturesFromStorage() {
  try {
    const sub = JSON.parse(localStorage.getItem("subscription"));
    return Array.isArray(sub?.features) ? sub.features : [];
  } catch {
    return [];
  }
}

/** True if API payload (user profile, login, etc.) includes subscription/plan fields. */
export function subscriptionPayloadHasPlanFields(data) {
  if (!data || typeof data !== "object") {
    return false;
  }
  const check = (o) =>
    o &&
    typeof o === "object" &&
    (o.SubscriptionPlanID != null ||
      o.PlanName != null ||
      Array.isArray(o.AllowedFeatures) ||
      o.PlanExpiryDate != null ||
      o.SubscriptionExpiryDate != null ||
      o.PlanExpiresAt != null ||
      o.SubscriptionExpiresAt != null ||
      o.IsPlanActive != null ||
      o.SubscriptionIsActive != null ||
      o.IsPlanExpired != null ||
      o.PlanIsExpired != null);

  if (check(data)) {
    return true;
  }
  if (data.Tenant && typeof data.Tenant === "object") {
    return check(data.Tenant);
  }
  return false;
}

/**
 * Persists subscription to `localStorage` using the same shape as `Login.jsx`.
 * Reuse when login succeeds or when `getUserById` (or similar) returns updated plan fields.
 *
 * @param {object} data — login response or user profile payload (may include nested `Tenant`)
 * @param {{ silentPlanToast?: boolean, fromLogin?: boolean }} [options] — `fromLogin: true` always persists (login payload); profile sync only runs when plan fields exist unless `fromLogin`
 * @returns {boolean} whether subscription was written
 */
export function applySubscriptionFromLoginPayload(data, options = {}) {
  if (!data || typeof data !== "object") {
    return false;
  }
  const src =
    data.Tenant && typeof data.Tenant === "object"
      ? { ...data.Tenant, ...data }
      : data;

  if (!options.fromLogin && !subscriptionPayloadHasPlanFields(src)) {
    return false;
  }

  let prev = null;
  try {
    prev = JSON.parse(localStorage.getItem("subscription"));
  } catch {
    prev = null;
  }

  const subscriptionData = {
    planID: src.SubscriptionPlanID || "free_tier",
    planName: src.PlanName || "Basic",
    features: src.AllowedFeatures || [],
    planExpiresAt:
      src.PlanExpiryDate ||
      src.SubscriptionExpiryDate ||
      src.PlanExpiresAt ||
      src.SubscriptionExpiresAt ||
      null,
    planIsActive:
      src.IsPlanActive !== false && src.SubscriptionIsActive !== false,
    isPlanExpired:
      src.IsPlanExpired === true || src.PlanIsExpired === true || false,
  };
  if (subscriptionData.planExpiresAt) {
    const expTs = new Date(subscriptionData.planExpiresAt).getTime();
    if (!Number.isNaN(expTs) && expTs < Date.now()) {
      subscriptionData.isPlanExpired = true;
      subscriptionData.planIsActive = false;
    }
  }

  try {
    localStorage.setItem("subscription", JSON.stringify(subscriptionData));
  } catch {
    return false;
  }

  const changed =
    !prev ||
    prev.planID !== subscriptionData.planID ||
    prev.planName !== subscriptionData.planName ||
    JSON.stringify(prev.features || []) !==
      JSON.stringify(subscriptionData.features || []);

  if (!subscriptionData.isPlanExpired && subscriptionData.planIsActive !== false) {
    clearSubscriptionReadOnlyMode();
  }

  window.dispatchEvent(
    new CustomEvent(WINDOW_CUSTOM_EVENTS.SUBSCRIPTION_STORAGE_CHANGED, {
      detail: {
        planChanged: changed,
        planName: subscriptionData.planName,
        silent: !!options.silentPlanToast,
      },
    })
  );

  return true;
}

export function dispatchSubscriptionStorageChanged(detail = {}) {
  window.dispatchEvent(
    new CustomEvent(WINDOW_CUSTOM_EVENTS.SUBSCRIPTION_STORAGE_CHANGED, {
      detail,
    })
  );
}

/**
 * Same leaf order as `Sidebar.jsx` (dashboard first). Used for post-login redirect and
 * `ProtectedRoute` fallbacks when a module is not allowed.
 */
export const APP_HOME_HREF_ORDER = [
  "/dashboard",
  "/orders",
  "/browse",
  "/productList",
  "/InventoryList",
  "/stores",
  "/users",
  "/userRoles",
  "/banners",
  "/notifications",
  "/bulk-import",
  "/bulk-images",
  "/payments",
  "/theme-settings",
  "/subscription",
];

/** Mirrors `Sidebar` `menuPermissionCode` (same module/name strings as `getPermissionCode`). */
export function getMenuPermissionCodeForHref(href) {
  switch (href) {
    case "/dashboard":
      return getPermissionCode("Dashboard Management", "View Dashboard");
    case "/orders":
    case "/payments":
      return getPermissionCode("Order Management", "View Orders");
    case "/browse":
    case "/productList":
      return getPermissionCode("Product Management", "View Products");
    case "/InventoryList":
      return getPermissionCode("Inventory Management", "View Inventories");
    case "/stores":
      return getPermissionCode("Store Management", "View Stores");
    case "/users":
      return getPermissionCode("User Management", "View Users");
    case "/userRoles":
      return getPermissionCode("Role Management", "View Roles");
    case "/notifications":
      return getPermissionCode("Notification Management", "Send Notification");
    case "/banners":
      return getPermissionCode("Banner Management", "View Banners");
    case "/bulk-import":
      return getPermissionCode("Bulk Import Management", "View Bulk Import");
    case "/bulk-images":
      return getPermissionCode(
        "Bulk Import Management",
        "Upload Bulk Import Images"
      );
    case "/theme-settings":
    case "/tenant-settings":
      return getPermissionCode(
        "Tenant Settings Management",
        "View Tenant Settings"
      );
    default:
      return null;
  }
}

/**
 * First sidebar leaf href the current session may open (plan + permissions), same rules as Sidebar `isAllowed`.
 * Tenant admin: first plan-allowed href in order. Subscription/upgrade UI is tenant-admin-only elsewhere.
 */
export function getFirstAccessibleHrefForSession() {
  const planFeatures = getSubscriptionFeaturesFromStorage();
  const ignorePlanForAdmin = isTenantAdminRole();
  let permissionIDs = [];
  let allPermissions = [];
  try {
    permissionIDs = JSON.parse(localStorage.getItem("PermissionIDs") || "[]");
  } catch {
    permissionIDs = [];
  }
  try {
    allPermissions = JSON.parse(localStorage.getItem("AllPermissions") || "[]");
  } catch {
    allPermissions = [];
  }
  const allowedPermissionCodes = allPermissions
    .filter((perm) => permissionIdsInclude(permissionIDs, perm.PermissionID))
    .map((perm) => perm.PermissionID);

  const hrefAllowed = (href) => {
    if (
      !isHrefAllowedBySubscriptionPlan(
        href,
        planFeatures,
        ignorePlanForAdmin
      )
    ) {
      return false;
    }
    if (href === "/subscription" && !isTenantAdminRole()) {
      return false;
    }
    if (isTenantAdminRole()) {
      return true;
    }
    const code = getMenuPermissionCodeForHref(href);
    if (!code) {
      return true;
    }
    return permissionIdsInclude(allowedPermissionCodes, code);
  };

  for (const href of APP_HOME_HREF_ORDER) {
    if (hrefAllowed(href)) {
      return href;
    }
  }
  return null;
}
