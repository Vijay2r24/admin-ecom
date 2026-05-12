import {
  WINDOW_CUSTOM_EVENTS,
  PRODUCT_DETAILS_TAB,
} from "../contants/constants";
import { getPermissionCode, permissionIdsInclude } from "./permissionUtils";

const SUBSCRIPTION_READ_ONLY_LS = "subscriptionReadOnly";
const USER_CREATE_LIMIT_BLOCKED_LS = "userCreateLimitBlocked";

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

export function markUserCreateLimitBlocked() {
  try {
    localStorage.setItem(USER_CREATE_LIMIT_BLOCKED_LS, "1");
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(
      new CustomEvent(
        WINDOW_CUSTOM_EVENTS.USER_CREATE_LIMIT_CHANGED || "userCreateLimitChanged"
      )
    );
  } catch { /* ignore */ }
}

export function clearUserCreateLimitBlocked() {
  try {
    localStorage.removeItem(USER_CREATE_LIMIT_BLOCKED_LS);
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(
      new CustomEvent(
        WINDOW_CUSTOM_EVENTS.USER_CREATE_LIMIT_CHANGED || "userCreateLimitChanged"
      )
    );
  } catch { /* ignore */ }
}

export function isUserCreateLimitBlocked() {
  try {
    return localStorage.getItem(USER_CREATE_LIMIT_BLOCKED_LS) === "1";
  } catch {
    return false;
  }
}

/**
 * Maps sidebar hrefs to tokens returned in login `AllowedFeatures`.
 * Comparison is case-insensitive.
 * Align these token strings with your API's `AllowedFeatures` values.
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

/**
 * Maps human-readable feature names (as returned by plan catalog API)
 * to the internal tokens used in PLAN_FEATURE_TOKEN_BY_HREF.
 * Keys are lowercase / trimmed.
 */
export const FEATURE_NAME_TO_TOKEN = {
  dashboard: "dashboard",
  "dashboard access": "dashboard",
  "dashboard module": "dashboard",
  orders: "orders",
  "order management": "orders",
  "order access": "orders",
  products: "products",
  "product management": "products",
  "product access": "products",
  "product list": "products",
  inventory: "inventory",
  "product inventory": "inventory",
  "inventory management": "inventory",
  "inventory access": "inventory",
  stores: "stores",
  "store management": "stores",
  "store access": "stores",
  users: "users",
  "user management": "users",
  "user access": "users",
  roles: "roles",
  "role management": "roles",
  "user roles": "roles",
  "role access": "roles",
  banners: "banners",
  "banner management": "banners",
  "banner access": "banners",
  notifications: "notifications",
  "notification management": "notifications",
  "notification access": "notifications",
  "bulk import": "bulk_import",
  bulk_import: "bulk_import",
  "bulk import management": "bulk_import",
  "bulk images": "bulk_images",
  bulk_images: "bulk_images",
  "bulk image management": "bulk_images",
  payments: "payments",
  "payment management": "payments",
  "payment access": "payments",
  "tenant settings": "tenant_settings",
  tenant_settings: "tenant_settings",
  "theme settings": "tenant_settings",
  "application settings": "tenant_settings",
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

/** Same merge as `applySubscriptionFromLoginPayload` — plan fields may live on `Tenant`. */
function mergePlanPayloadSource(data) {
  if (!data || typeof data !== "object") {
    return null;
  }
  return data.Tenant && typeof data.Tenant === "object"
    ? { ...data, ...data.Tenant }
    : data;
}

function getSubscriptionExpiryTimestampMs(src) {
  if (!src || typeof src !== "object") {
    return null;
  }
  const exp =
    src.PlanExpiryDate ||
    src.SubscriptionExpiryDate ||
    src.PlanExpiresAt ||
    src.SubscriptionExpiresAt;
  if (exp == null || exp === "") {
    return null;
  }
  const t = new Date(exp).getTime();
  return Number.isNaN(t) ? null : t;
}

export function isPlanExpiredFromLoginPayload(data) {
  const src = mergePlanPayloadSource(data);
  if (!src) {
    return false;
  }

  const expMs = getSubscriptionExpiryTimestampMs(src);
  if (expMs != null) {
    if (expMs >= Date.now()) {
      return false;
    }
    return true;
  }

  if (src.IsPlanExpired === true || src.PlanIsExpired === true) {
    return true;
  }
  if (src.IsPlanActive === false || src.SubscriptionIsActive === false) {
    return true;
  }
  return false;
}

export function isPlanExpiredFromSubscriptionStorage() {
  try {
    const sub = JSON.parse(localStorage.getItem("subscription"));
    if (!sub) {
      return false;
    }
    if (sub.planExpiresAt) {
      const t = new Date(sub.planExpiresAt).getTime();
      if (!Number.isNaN(t) && t >= Date.now()) {
        return false;
      }
      if (!Number.isNaN(t) && t < Date.now()) {
        return true;
      }
    }
    if (sub.isPlanExpired === true || sub.planIsActive === false) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Checks if an href is allowed by the subscription plan.
 * When allowedFeatures is empty AND there is no explicit feature gating, everything is allowed.
 * Use `isPathnameRestrictedByPlan` for the authoritative plan restriction check.
 */
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

/**
 * Maps any application pathname (including sub-routes) to the canonical
 * sidebar href used for plan-feature checking.
 */
export function getEffectivePlanHref(pathname) {
  if (!pathname) return null;

  // 1. Direct match against known plan-gated top-level hrefs
  if (PLAN_FEATURE_TOKEN_BY_HREF[pathname]) return pathname;

  // 2. Sub-route → parent map (longest-prefix wins, checked in order)
  const subToParent = [
    ["/add-user", "/users"],
    ["/editUser", "/users"],
    ["/add-store", "/stores"],
    ["/editStore", "/stores"],
    ["/addUserRole", "/userRoles"],
    ["/edit-UserRole", "/userRoles"],
    ["/Addproduct", "/productList"],
    ["/edit-product", "/productList"],
    ["/productdetails", "/productList"],
    ["/AddVariants", "/productList"],
    ["/addProductVariants", "/productList"],
    ["/InventoryList", "/InventoryList"],
    ["/browse", "/browse"],
    ["/banners-create", "/banners"],
    ["/activeBanners", "/banners"],
    ["/payment-details", "/payments"],
    ["/order-details", "/orders"],
    ["/notifications", "/notifications"],
    ["/bulk-import", "/bulk-import"],
    ["/bulk-images", "/bulk-images"],
    ["/theme-settings", "/theme-settings"],
    ["/tenant-settings", "/theme-settings"],
  ];

  for (const [prefix, parentHref] of subToParent) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      return parentHref;
    }
  }

  return null;
}

/**
 * Returns true when the given pathname is blocked by the current subscription plan.
 *
 * Behaviour:
 *  - No subscription stored → no restriction (legacy / no-plan mode)
 *  - `hasFeatureGating = true` (API explicitly sent feature list) → always
 *    check features; even an empty list means nothing is allowed
 *  - `hasFeatureGating` absent/false and features empty → no restriction
 */
export function isPathnameRestrictedByPlan(pathname) {
  const effectiveHref = getEffectivePlanHref(pathname);
  if (!effectiveHref) return false;

  let sub;
  try {
    sub = JSON.parse(localStorage.getItem("subscription"));
  } catch {
    sub = null;
  }
  if (!sub) return false;

  const features = Array.isArray(sub.features) ? sub.features : [];
  const hasFeatureGating = Boolean(sub.hasFeatureGating);

  // Legacy / no-plan mode: no explicit feature list → no restriction
  if (!hasFeatureGating && features.length === 0) return false;

  // Direct token check — avoids isHrefAllowedBySubscriptionPlan's empty-array bypass
  const token = PLAN_FEATURE_TOKEN_BY_HREF[effectiveHref];
  if (!token) return false; // This href has no plan token → unrestricted

  const want = token.toLowerCase().trim();
  return !features.some((f) => String(f).toLowerCase().trim() === want);
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
      Array.isArray(o.allowedFeatures) ||
      Array.isArray(o.AllowedModules) ||
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
 * @param {{ silentPlanToast?: boolean, fromLogin?: boolean }} [options]
 * @returns {boolean} whether subscription was written
 */
export function applySubscriptionFromLoginPayload(data, options = {}) {
  if (!data || typeof data !== "object") {
    return false;
  }
  const src =
    data.Tenant && typeof data.Tenant === "object"
      ? { ...data, ...data.Tenant }
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

  // Try every field name the backend might use for allowed module tokens.
  const rawFeatures =
    src.AllowedFeatures ??
    src.AllowedModules ??
    src.allowedFeatures ??
    src.allowedModules ??
    src.PlanFeatures ??
    src.planFeatures ??
    null;

  // `hasFeatureGating` is true when the API explicitly sent a feature list
  // (even empty array). When rawFeatures is null, preserve any gating set
  // by storePlanFeaturesFromCatalog so a second apply call doesn't wipe it.
  const apiSentFeatures = Array.isArray(rawFeatures);
  const hasFeatureGating = apiSentFeatures || Boolean(prev?.hasFeatureGating);
  const features = apiSentFeatures
    ? rawFeatures
    : hasFeatureGating && Array.isArray(prev?.features)
      ? prev.features
      : [];

  const subscriptionData = {
    planID: src.SubscriptionPlanID || src.PlanID || src.planID || "free_tier",
    planName: src.PlanName || src.planName || "Basic",
    features,
    hasFeatureGating,
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

  const expMs = getSubscriptionExpiryTimestampMs(src);
  if (expMs != null) {
    if (expMs < Date.now()) {
      subscriptionData.isPlanExpired = true;
      subscriptionData.planIsActive = false;
    } else {
      subscriptionData.isPlanExpired = false;
      subscriptionData.planIsActive =
        src.IsPlanActive !== false && src.SubscriptionIsActive !== false;
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
  clearUserCreateLimitBlocked();

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
 * Converts plan catalog features into module access tokens.
 * Returns only features where enabled = true.
 */
export function extractEnabledTokensFromCatalogFeatures(rawFeatures) {
  if (!Array.isArray(rawFeatures)) return [];
  const allTokenValues = new Set(Object.values(PLAN_FEATURE_TOKEN_BY_HREF));
  const result = [];

  for (const f of rawFeatures) {
    const enabled =
      f.IsEnabled !== undefined
        ? Boolean(f.IsEnabled)
        : f.isEnabled !== undefined
          ? Boolean(f.isEnabled)
          : f.enabled !== undefined
            ? Boolean(f.enabled)
            : true;
    if (!enabled) continue;

    const nameRaw =
      f.FeatureName || f.featureName || f.Feature || f.feature || f.text || f.name || "";
    const name = String(nameRaw).toLowerCase().trim();

    // Direct lookup in FEATURE_NAME_TO_TOKEN
    const token = FEATURE_NAME_TO_TOKEN[name];
    if (token && !result.includes(token)) {
      result.push(token);
      continue;
    }

    // If name IS already a known token value, use it directly
    if (allTokenValues.has(name) && !result.includes(name)) {
      result.push(name);
      continue;
    }

    // Substring match (e.g. "Show Dashboard Total Orders" contains "dashboard")
    for (const [key, tok] of Object.entries(FEATURE_NAME_TO_TOKEN)) {
      if (name.includes(key) && !result.includes(tok)) {
        result.push(tok);
        break;
      }
    }
  }
  return result;
}

/**
 * Stores plan features from a catalog API response for the current user's plan.
 * Call this after login when AllowedFeatures is not in the login payload.
 *
 * @param {string} planName - The user's current plan name (e.g. "Basic")
 * @param {any} catalogResponseData - Raw response payload from GET_SUBSCRIPTION_PLAN_FEATURES
 * @returns {boolean} true if features were stored
 */
export function storePlanFeaturesFromCatalog(planName, catalogResponseData) {
  try {
    if (!planName || !catalogResponseData) return false;

    // Flatten all plans from the response regardless of shape
    const flatList = [];
    const tryAdd = (arr) => {
      if (Array.isArray(arr)) arr.forEach((p) => flatList.push(p));
    };
    tryAdd(catalogResponseData.monthlyPlans);
    tryAdd(catalogResponseData.yearlyPlans);
    tryAdd(catalogResponseData.plans);
    tryAdd(catalogResponseData.data);
    if (Array.isArray(catalogResponseData)) tryAdd(catalogResponseData);

    if (flatList.length === 0) return false;

    const normalizedPlan = planName.toLowerCase().trim();
    const matchedPlan = flatList.find(
      (p) =>
        (p.PlanName || p.planName || p.name || "").toLowerCase().trim() ===
        normalizedPlan
    );

    if (!matchedPlan) return false;

    const rawFeatures =
      matchedPlan.Features ||
      matchedPlan.features ||
      matchedPlan.PlanFeatures ||
      matchedPlan.planFeatures ||
      [];

    const allowedTokens = extractEnabledTokensFromCatalogFeatures(rawFeatures);

    let sub;
    try {
      sub = JSON.parse(localStorage.getItem("subscription")) || {};
    } catch {
      sub = {};
    }

    // Only update if there's no explicit AllowedFeatures from the login API
    if (!sub.hasFeatureGating) {
      sub.features = allowedTokens;
      sub.hasFeatureGating = true;
      localStorage.setItem("subscription", JSON.stringify(sub));
      return true;
    }
    return false;
  } catch {
    return false;
  }
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
 * Checks if an href is plan-allowed, respecting the hasFeatureGating flag.
 * Unlike isHrefAllowedBySubscriptionPlan, this does NOT have an empty-array bypass
 * when hasFeatureGating is active.
 */
function isHrefAllowedByPlanWithGating(href, features, hasFeatureGating) {
  if (!hasFeatureGating && features.length === 0) return true; // Legacy: no restriction
  const token = PLAN_FEATURE_TOKEN_BY_HREF[href];
  if (!token) return true; // No token for this href → unrestricted
  const want = token.toLowerCase().trim();
  return features.some((f) => String(f).toLowerCase().trim() === want);
}

/**
 * First sidebar leaf href the current session may open (plan + permissions).
 * For admin: respects plan restrictions (so redirect after login goes to a plan-allowed page).
 * For non-admin: checks both plan and permissions.
 */
export function getFirstAccessibleHrefForSession() {
  let sub;
  try {
    sub = JSON.parse(localStorage.getItem("subscription"));
  } catch {
    sub = null;
  }

  const planFeatures = Array.isArray(sub?.features) ? sub.features : [];
  const hasFeatureGating = Boolean(sub?.hasFeatureGating);
  const isAdmin = isTenantAdminRole();

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
    // Subscription page: admin only
    if (href === "/subscription") return isAdmin;

    // Plan restriction check — applies to both admin and non-admin
    if (!isHrefAllowedByPlanWithGating(href, planFeatures, hasFeatureGating)) {
      return false;
    }

    // Admin bypasses role-permission checks
    if (isAdmin) return true;

    // Non-admin: also check role-based permissions
    const code = getMenuPermissionCodeForHref(href);
    if (!code) return true;
    return permissionIdsInclude(allowedPermissionCodes, code);
  };

  for (const href of APP_HOME_HREF_ORDER) {
    if (hrefAllowed(href)) {
      return href;
    }
  }

  // If admin has no plan-allowed pages (all restricted), allow subscription page
  if (isAdmin) return "/subscription";
  return null;
}
