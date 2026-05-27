import {
  APP_ROUTES,
  MODULES,
  PERMISSIONS,
  PLAN_FEATURE_API_LABEL,
  PLAN_FEATURE_TOKEN,
  PLAN_LIMIT_LOGIN_FIELDS_BY_RESOURCE,
  PLAN_LIMIT_RESOURCE,
  PRODUCT_DETAILS_TAB,
  PRODUCT_SETUP_TAB,
  SUBSCRIPTION_PLAN,
  WINDOW_CUSTOM_EVENTS,
} from "../contants/constants";
import { getPermissionCode, permissionIdsInclude } from "./permissionUtils";
import { hasAnyProductSetupViewPermission } from "./productSetupPermissionUtils";

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
    if (localStorage.getItem(USER_CREATE_LIMIT_BLOCKED_LS) === "1") {
      return true;
    }
  } catch {
    /* ignore */
  }
  return isPlanResourceCreateLimitBlocked(
    PLAN_LIMIT_RESOURCE.USERS,
    PLAN_FEATURE_TOKEN.USERS
  );
}

/**
 * Maps sidebar hrefs to tokens returned in login `AllowedFeatures`.
 * Comparison is case-insensitive.
 * Align these token strings with your API's `AllowedFeatures` values.
 */
export const PLAN_FEATURE_TOKEN_BY_HREF = {
  [APP_ROUTES.DASHBOARD]: PLAN_FEATURE_TOKEN.DASHBOARD,
  [APP_ROUTES.ORDERS]: PLAN_FEATURE_TOKEN.ORDERS,
  [APP_ROUTES.BROWSE]: PLAN_FEATURE_TOKEN.PRODUCTS,
  [APP_ROUTES.PRODUCT_LIST]: PLAN_FEATURE_TOKEN.PRODUCTS,
  [APP_ROUTES.INVENTORY_LIST]: PLAN_FEATURE_TOKEN.INVENTORY,
  [APP_ROUTES.STORES]: PLAN_FEATURE_TOKEN.STORES,
  [APP_ROUTES.USERS]: PLAN_FEATURE_TOKEN.USERS,
  [APP_ROUTES.USER_ROLES]: PLAN_FEATURE_TOKEN.ROLES,
  [APP_ROUTES.BANNERS]: PLAN_FEATURE_TOKEN.BANNERS,
  [APP_ROUTES.NOTIFICATIONS]: PLAN_FEATURE_TOKEN.NOTIFICATIONS,
  [APP_ROUTES.BULK_IMPORT]: PLAN_FEATURE_TOKEN.BULK_IMPORT,
  [APP_ROUTES.BULK_IMAGES]: PLAN_FEATURE_TOKEN.BULK_IMAGES,
  [APP_ROUTES.PAYMENTS]: PLAN_FEATURE_TOKEN.PAYMENTS,
  [APP_ROUTES.THEME_SETTINGS]: PLAN_FEATURE_TOKEN.TENANT_SETTINGS,
  [APP_ROUTES.SUBSCRIPTION]: PLAN_FEATURE_TOKEN.SUBSCRIPTION,
};

/**
 * Maps human-readable feature names (as returned by plan catalog API)
 * to the internal tokens used in PLAN_FEATURE_TOKEN_BY_HREF.
 * Keys are lowercase / trimmed.
 */
export const FEATURE_NAME_TO_TOKEN = {
  dashboard: PLAN_FEATURE_TOKEN.DASHBOARD,
  "dashboard access": PLAN_FEATURE_TOKEN.DASHBOARD,
  "dashboard module": PLAN_FEATURE_TOKEN.DASHBOARD,
  orders: PLAN_FEATURE_TOKEN.ORDERS,
  "order management": PLAN_FEATURE_TOKEN.ORDERS,
  "order access": PLAN_FEATURE_TOKEN.ORDERS,
  products: PLAN_FEATURE_TOKEN.PRODUCTS,
  "product management": PLAN_FEATURE_TOKEN.PRODUCTS,
  "product access": PLAN_FEATURE_TOKEN.PRODUCTS,
  "product list": PLAN_FEATURE_TOKEN.PRODUCTS,
  inventory: PLAN_FEATURE_TOKEN.INVENTORY,
  "product inventory": PLAN_FEATURE_TOKEN.INVENTORY,
  "inventory management": PLAN_FEATURE_TOKEN.INVENTORY,
  "inventory access": PLAN_FEATURE_TOKEN.INVENTORY,
  stores: PLAN_FEATURE_TOKEN.STORES,
  "store management": PLAN_FEATURE_TOKEN.STORES,
  "store access": PLAN_FEATURE_TOKEN.STORES,
  users: PLAN_FEATURE_TOKEN.USERS,
  "user management": PLAN_FEATURE_TOKEN.USERS,
  "user access": PLAN_FEATURE_TOKEN.USERS,
  roles: PLAN_FEATURE_TOKEN.ROLES,
  "role management": PLAN_FEATURE_TOKEN.ROLES,
  "user roles": PLAN_FEATURE_TOKEN.ROLES,
  "role access": PLAN_FEATURE_TOKEN.ROLES,
  banners: PLAN_FEATURE_TOKEN.BANNERS,
  "banner management": PLAN_FEATURE_TOKEN.BANNERS,
  "banner access": PLAN_FEATURE_TOKEN.BANNERS,
  notifications: PLAN_FEATURE_TOKEN.NOTIFICATIONS,
  "notification management": PLAN_FEATURE_TOKEN.NOTIFICATIONS,
  "notification access": PLAN_FEATURE_TOKEN.NOTIFICATIONS,
  "bulk import": PLAN_FEATURE_TOKEN.BULK_IMPORT,
  bulk_import: PLAN_FEATURE_TOKEN.BULK_IMPORT,
  "bulk import management": PLAN_FEATURE_TOKEN.BULK_IMPORT,
  "bulk images": PLAN_FEATURE_TOKEN.BULK_IMAGES,
  bulk_images: PLAN_FEATURE_TOKEN.BULK_IMAGES,
  "bulk image management": PLAN_FEATURE_TOKEN.BULK_IMAGES,
  "product setup brands": PLAN_FEATURE_TOKEN.PRODUCT_SETUP_BRANDS,
  "product setup categories": PLAN_FEATURE_TOKEN.PRODUCT_SETUP_CATEGORIES,
  "product setup attribute types": PLAN_FEATURE_TOKEN.PRODUCT_SETUP_ATTRIBUTE_TYPES,
  "product setup colors": PLAN_FEATURE_TOKEN.PRODUCT_SETUP_COLORS,
  "product setup attributes": PLAN_FEATURE_TOKEN.PRODUCT_SETUP_ATTRIBUTES,
  "product setup specification types": PLAN_FEATURE_TOKEN.PRODUCT_SETUP_SPECIFICATION_TYPES,
  "product setup specifications": PLAN_FEATURE_TOKEN.PRODUCT_SETUP_SPECIFICATION_TYPES,
  payments: PLAN_FEATURE_TOKEN.PAYMENTS,
  "payment management": PLAN_FEATURE_TOKEN.PAYMENTS,
  "payment access": PLAN_FEATURE_TOKEN.PAYMENTS,
  "tenant settings": PLAN_FEATURE_TOKEN.TENANT_SETTINGS,
  tenant_settings: PLAN_FEATURE_TOKEN.TENANT_SETTINGS,
  "theme settings": PLAN_FEATURE_TOKEN.TENANT_SETTINGS,
  "application settings": PLAN_FEATURE_TOKEN.TENANT_SETTINGS,
  [PLAN_FEATURE_API_LABEL.VIEW_NOTIFICATION]: PLAN_FEATURE_TOKEN.VIEW_NOTIFICATIONS,
  [PLAN_FEATURE_API_LABEL.VIEW_NOTIFICATIONS]: PLAN_FEATURE_TOKEN.VIEW_NOTIFICATIONS,
  [PLAN_FEATURE_TOKEN.VIEW_NOTIFICATIONS]: PLAN_FEATURE_TOKEN.VIEW_NOTIFICATIONS,
  view_notification: PLAN_FEATURE_TOKEN.VIEW_NOTIFICATIONS,
  "send notification": PLAN_FEATURE_TOKEN.NOTIFICATIONS,
  "send notifications": PLAN_FEATURE_TOKEN.NOTIFICATIONS,
};

/** @deprecated Use {@link PLAN_FEATURE_TOKEN.NOTIFICATIONS}. */
export const NOTIFICATIONS_MODULE_TOKEN = PLAN_FEATURE_TOKEN.NOTIFICATIONS;

/**
 * Normalizes one API/catalog feature string to a canonical plan token.
 * "View Notification(s)" from login must not unlock the notifications management module.
 */
export function normalizePlanFeatureToken(raw) {
  if (raw == null || raw === "") return null;

  const name = String(raw)
    .toLowerCase()
    .trim()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");

  const moduleTokens = new Set(Object.values(PLAN_FEATURE_TOKEN_BY_HREF));
  if (moduleTokens.has(name)) return name;

  if (FEATURE_NAME_TO_TOKEN[name]) {
    return FEATURE_NAME_TO_TOKEN[name];
  }

  if (
    name === PLAN_FEATURE_API_LABEL.VIEW_NOTIFICATION ||
    name === PLAN_FEATURE_API_LABEL.VIEW_NOTIFICATIONS ||
    name.replace(/_/g, " ") === PLAN_FEATURE_TOKEN.VIEW_NOTIFICATIONS ||
    (name.startsWith(PLAN_FEATURE_API_LABEL.VIEW_PREFIX) &&
      name.includes(PLAN_FEATURE_API_LABEL.NOTIFICATION_KEYWORD))
  ) {
    return PLAN_FEATURE_TOKEN.VIEW_NOTIFICATIONS;
  }

  if (!name.startsWith(PLAN_FEATURE_API_LABEL.VIEW_PREFIX)) {
    for (const [key, tok] of Object.entries(FEATURE_NAME_TO_TOKEN)) {
      if (key.startsWith(PLAN_FEATURE_API_LABEL.VIEW_PREFIX)) continue;
      if (name.includes(key)) return tok;
    }
  }

  return name;
}

/** Deduplicated canonical tokens for subscription storage and plan checks. */
export function normalizePlanFeatureTokens(rawFeatures) {
  if (!Array.isArray(rawFeatures)) return [];
  const out = [];
  for (const raw of rawFeatures) {
    const token = normalizePlanFeatureToken(raw);
    if (token && !out.includes(token)) out.push(token);
  }
  return out;
}

/** True when the push notifications management module is included in the current plan. */
export function isNotificationsModuleAllowedByPlan() {
  try {
    const sub = JSON.parse(localStorage.getItem("subscription"));
    if (!sub) return true;
    const features = Array.isArray(sub.features) ? sub.features : [];
    const hasFeatureGating = Boolean(sub.hasFeatureGating);
    if (!hasFeatureGating && features.length === 0) return true;
    const want = PLAN_FEATURE_TOKEN.NOTIFICATIONS;
    return features.some((f) => String(f).toLowerCase().trim() === want);
  } catch {
    return true;
  }
}

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
  [PRODUCT_SETUP_TAB.BRANDS]: PLAN_FEATURE_TOKEN.PRODUCT_SETUP_BRANDS,
  [PRODUCT_SETUP_TAB.CATEGORIES]: PLAN_FEATURE_TOKEN.PRODUCT_SETUP_CATEGORIES,
  [PRODUCT_SETUP_TAB.ATTRIBUTE_TYPES]:
    PLAN_FEATURE_TOKEN.PRODUCT_SETUP_ATTRIBUTE_TYPES,
  [PRODUCT_SETUP_TAB.COLORS]: PLAN_FEATURE_TOKEN.PRODUCT_SETUP_COLORS,
  [PRODUCT_SETUP_TAB.ATTRIBUTES]: PLAN_FEATURE_TOKEN.PRODUCT_SETUP_ATTRIBUTES,
  [PRODUCT_SETUP_TAB.SPECIFICATION_TYPES]:
    PLAN_FEATURE_TOKEN.PRODUCT_SETUP_SPECIFICATION_TYPES,
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
  if (set.has(PLAN_FEATURE_TOKEN.PRODUCTS)) {
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
  if (set.has(PLAN_FEATURE_TOKEN.PRODUCTS)) {
    return true;
  }
  if (!granular) {
    return true;
  }
  return set.has(String(granular).toLowerCase().trim());
}

function getSubscriptionFromStorage() {
  try {
    return JSON.parse(localStorage.getItem("subscription"));
  } catch {
    return null;
  }
}

export function getSubscriptionFeaturesFromStorage() {
  const sub = getSubscriptionFromStorage();
  return Array.isArray(sub?.features) ? sub.features : [];
}

function parseCatalogFeatureLimitValue(featureRow) {
  const val =
    featureRow?.SubscriptionPlanFeature?.FeatureValue ??
    featureRow?.featureValue ??
    featureRow?.FeatureValue ??
    featureRow?.value;

  if (val === SUBSCRIPTION_PLAN.FEATURE_VALUE_TRUE) {
    return { enabled: true, limit: null };
  }
  if (val === SUBSCRIPTION_PLAN.FEATURE_VALUE_FALSE) {
    return { enabled: false, limit: null };
  }
  if (
    typeof val === "string" &&
    val.toLowerCase().trim() === SUBSCRIPTION_PLAN.UNLIMITED_LABEL.toLowerCase()
  ) {
    return { enabled: true, limit: SUBSCRIPTION_PLAN.UNLIMITED_VALUE };
  }

  const num = Number(val);
  if (!Number.isNaN(num)) {
    return { enabled: num !== 0, limit: num };
  }

  return { enabled: true, limit: null };
}

/** Maps catalog / API feature labels to a plan limit resource key. */
function inferPlanLimitResourceFromFeatureName(name) {
  const n = String(name).toLowerCase().trim();
  if (!n) return null;

  if (n.includes("user") && !n.includes("role")) {
    return PLAN_LIMIT_RESOURCE.USERS;
  }
  if (n.includes("store")) {
    return PLAN_LIMIT_RESOURCE.STORES;
  }
  if (n.includes("banner")) {
    return PLAN_LIMIT_RESOURCE.BANNERS;
  }
  if (
    (n.includes("product") && !n.includes("group") && !n.includes("setup")) ||
    n.includes("product list")
  ) {
    return PLAN_LIMIT_RESOURCE.PRODUCTS;
  }

  return null;
}

/**
 * Reads enabled module tokens and numeric caps from a plan catalog feature list.
 */
export function extractPlanCatalogBundle(rawFeatures) {
  if (!Array.isArray(rawFeatures)) {
    return { tokens: [], limits: {} };
  }

  const tokens = [];
  const limits = {};

  for (const f of rawFeatures) {
    const { enabled, limit } = parseCatalogFeatureLimitValue(f);
    if (!enabled) continue;

    const nameRaw =
      f.FeatureName || f.featureName || f.Feature || f.feature || f.text || f.name || "";
    const token = normalizePlanFeatureToken(nameRaw);
    if (token && !tokens.includes(token)) {
      tokens.push(token);
    }

    const resourceKey = inferPlanLimitResourceFromFeatureName(nameRaw);
    if (resourceKey != null && limit != null && limits[resourceKey] == null) {
      limits[resourceKey] = limit;
    }

    if (
      resourceKey === PLAN_LIMIT_RESOURCE.PRODUCTS &&
      !tokens.includes(PLAN_FEATURE_TOKEN.PRODUCTS)
    ) {
      tokens.push(PLAN_FEATURE_TOKEN.PRODUCTS);
    }
  }

  return { tokens, limits };
}

/** Broad `products` module token unlocks product setup / details sub-features. */
function isProductFamilyFeatureToken(token) {
  const t = String(token).toLowerCase().trim();
  return (
    t === PLAN_FEATURE_TOKEN.PRODUCTS ||
    t.startsWith("product_setup_") ||
    t.startsWith("product_details_")
  );
}

/** Whether a plan feature token is included in the current subscription. */
export function isFeatureTokenAllowedByPlan(featureToken) {
  const sub = getSubscriptionFromStorage();
  if (!sub) return true;

  const features = normalizePlanFeatureTokens(
    Array.isArray(sub.features) ? sub.features : []
  );
  const hasFeatureGating = Boolean(sub.hasFeatureGating);

  if (!hasFeatureGating && features.length === 0) return true;

  const want = String(featureToken).toLowerCase().trim();
  if (features.some((f) => String(f).toLowerCase().trim() === want)) {
    return true;
  }

  const hasProductsModule = features.some(
    (f) => String(f).toLowerCase().trim() === PLAN_FEATURE_TOKEN.PRODUCTS
  );
  if (hasProductsModule && isProductFamilyFeatureToken(want)) {
    return true;
  }

  return false;
}

export function getPlanResourceLimit(resourceKey) {
  const sub = getSubscriptionFromStorage();
  if (!sub?.planLimits || sub.planLimits[resourceKey] == null) {
    return null;
  }
  const num = Number(sub.planLimits[resourceKey]);
  return Number.isNaN(num) ? null : num;
}

export function getPlanResourceUsage(resourceKey) {
  const sub = getSubscriptionFromStorage();
  if (!sub?.usage || sub.usage[resourceKey] == null) {
    return null;
  }
  const num = Number(sub.usage[resourceKey]);
  return Number.isNaN(num) ? null : num;
}

export function updatePlanResourceUsage(resourceKey, count) {
  let sub = getSubscriptionFromStorage() || {};
  sub.usage = {
    ...(sub.usage || {}),
    [resourceKey]: Math.max(0, Number(count) || 0),
  };

  try {
    localStorage.setItem("subscription", JSON.stringify(sub));
  } catch {
    return;
  }

  const limit = getPlanResourceLimit(resourceKey);
  if (
    limit != null &&
    (limit === SUBSCRIPTION_PLAN.UNLIMITED_VALUE ||
      limit < 0 ||
      sub.usage[resourceKey] < limit)
  ) {
    clearUserCreateLimitBlocked();
  }

  dispatchSubscriptionStorageChanged({ usageUpdated: resourceKey });
}

export function isPlanResourceUnlimited(resourceKey) {
  const limit = getPlanResourceLimit(resourceKey);
  if (limit == null) return false;
  return limit === SUBSCRIPTION_PLAN.UNLIMITED_VALUE || limit < 0;
}

/** True when usage has reached a known numeric cap (not used for product-setup sub-modules). */
export function isPlanResourceCreateLimitBlocked(resourceKey, featureToken = null) {
  if (isSubscriptionReadOnlyMode()) return true;

  if (featureToken != null && !isFeatureTokenAllowedByPlan(featureToken)) {
    return true;
  }

  if (isPlanResourceUnlimited(resourceKey)) {
    return false;
  }

  const limit = getPlanResourceLimit(resourceKey);
  if (limit == null) {
    return false;
  }

  const usage = getPlanResourceUsage(resourceKey);
  if (usage != null && usage >= limit) {
    return true;
  }

  return false;
}

/** True when product creation is blocked by plan module access or numeric cap. */
export function isProductCreateLimitBlocked() {
  return isPlanResourceCreateLimitBlocked(
    PLAN_LIMIT_RESOURCE.PRODUCTS,
    PLAN_FEATURE_TOKEN.PRODUCTS
  );
}

function extractPlanLimitsFromLoginPayload(src) {
  const limits = {};
  if (!src || typeof src !== "object") return limits;

  for (const [resourceKey, fields] of Object.entries(
    PLAN_LIMIT_LOGIN_FIELDS_BY_RESOURCE
  )) {
    for (const field of fields) {
      if (src[field] == null || src[field] === "") continue;
      const num = Number(src[field]);
      if (!Number.isNaN(num)) {
        limits[resourceKey] = num;
        break;
      }
    }
  }

  return limits;
}

function mergePlanLimits(existing, incoming) {
  return { ...(existing || {}), ...(incoming || {}) };
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

  const features = normalizePlanFeatureTokens(
    Array.isArray(sub.features) ? sub.features : []
  );
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
    ? normalizePlanFeatureTokens(rawFeatures)
    : hasFeatureGating && Array.isArray(prev?.features)
      ? normalizePlanFeatureTokens(prev.features)
      : [];

  const loginLimits = extractPlanLimitsFromLoginPayload(src);
  const subscriptionData = {
    planID: src.SubscriptionPlanID || src.PlanID || src.planID || "free_tier",
    planName: src.PlanName || src.planName || "Basic",
    features,
    hasFeatureGating,
    planLimits: mergePlanLimits(prev?.planLimits, loginLimits),
    usage: prev?.usage || {},
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
  return extractPlanCatalogBundle(rawFeatures).tokens;
}

/**
 * Stores plan features from a catalog API response for the current user's plan.
 * Call this after login when AllowedFeatures is not in the login payload.
 *
 * @param {string} planName - The user's current plan name (e.g. "Basic")
 * @param {any} catalogResponseData - Raw response payload from GET_ALL_SUBSCRIPTION_PLAN_FEATURES
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

    const bundle = extractPlanCatalogBundle(rawFeatures);

    let sub;
    try {
      sub = JSON.parse(localStorage.getItem("subscription")) || {};
    } catch {
      sub = {};
    }

    const mergedFeatures = normalizePlanFeatureTokens([
      ...(Array.isArray(sub.features) ? sub.features : []),
      ...bundle.tokens,
    ]);

    sub.features = mergedFeatures;
    sub.planLimits = mergePlanLimits(sub.planLimits, bundle.limits);
    sub.hasFeatureGating = true;

    localStorage.setItem("subscription", JSON.stringify(sub));
    dispatchSubscriptionStorageChanged({ planLimitsFromCatalog: true });

    if (isPlanResourceUnlimited(PLAN_LIMIT_RESOURCE.PRODUCTS)) {
      clearUserCreateLimitBlocked();
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Same leaf order as `Sidebar.jsx` (dashboard first). Used for post-login redirect and
 * `ProtectedRoute` fallbacks when a module is not allowed.
 */
export const APP_HOME_HREF_ORDER = [
  APP_ROUTES.DASHBOARD,
  APP_ROUTES.ORDERS,
  APP_ROUTES.BROWSE,
  APP_ROUTES.PRODUCT_LIST,
  APP_ROUTES.INVENTORY_LIST,
  APP_ROUTES.STORES,
  APP_ROUTES.USERS,
  APP_ROUTES.USER_ROLES,
  APP_ROUTES.BANNERS,
  APP_ROUTES.NOTIFICATIONS,
  APP_ROUTES.BULK_IMPORT,
  APP_ROUTES.BULK_IMAGES,
  APP_ROUTES.PAYMENTS,
  APP_ROUTES.THEME_SETTINGS,
  APP_ROUTES.SUBSCRIPTION,
];

/** Mirrors `Sidebar` `menuPermissionCode` (same module/name strings as `getPermissionCode`). */
export function getMenuPermissionCodeForHref(href) {
  switch (href) {
    case APP_ROUTES.DASHBOARD:
      return getPermissionCode(MODULES.DASHBOARD, PERMISSIONS.VIEW_DASHBOARD);
    case APP_ROUTES.ORDERS:
    case APP_ROUTES.PAYMENTS:
      return getPermissionCode(MODULES.ORDER, PERMISSIONS.VIEW_ORDERS);
    case APP_ROUTES.PRODUCT_LIST:
      return getPermissionCode(MODULES.PRODUCT, PERMISSIONS.VIEW_PRODUCTS);
    case APP_ROUTES.INVENTORY_LIST:
      return getPermissionCode(MODULES.INVENTORY, PERMISSIONS.VIEW_INVENTORY);
    case APP_ROUTES.STORES:
      return getPermissionCode(MODULES.STORE, PERMISSIONS.VIEW_STORE);
    case APP_ROUTES.USERS:
      return getPermissionCode(MODULES.USER, PERMISSIONS.VIEW_USER);
    case APP_ROUTES.USER_ROLES:
      return getPermissionCode(MODULES.ROLE, PERMISSIONS.VIEW_ROLE);
    case APP_ROUTES.NOTIFICATIONS:
      return getPermissionCode(
        MODULES.NOTIFICATION_MANAGEMENT,
        PERMISSIONS.VIEW_NOTIFICATIONS
      );
    case APP_ROUTES.BANNERS:
      return getPermissionCode(MODULES.BANNER, PERMISSIONS.VIEW_BANNERS);
    case APP_ROUTES.BULK_IMPORT:
      return getPermissionCode(MODULES.BULK_IMPORT, PERMISSIONS.VIEW_BULK_IMPORT);
    case APP_ROUTES.BULK_IMAGES:
      return getPermissionCode(
        MODULES.BULK_IMPORT,
        PERMISSIONS.UPLOAD_BULK_IMPORT_IMAGES
      );
    case APP_ROUTES.THEME_SETTINGS:
      return getPermissionCode(
        MODULES.TENANT_SETTINGS,
        PERMISSIONS.VIEW_TENANT_SETTINGS
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

  const planFeatures = normalizePlanFeatureTokens(
    Array.isArray(sub?.features) ? sub.features : []
  );
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
    if (href === APP_ROUTES.SUBSCRIPTION) return isAdmin;

    // Product Setup: requires at least one tab view permission (all roles)
    if (href === APP_ROUTES.BROWSE && !hasAnyProductSetupViewPermission()) {
      return false;
    }

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
  if (isAdmin) return APP_ROUTES.SUBSCRIPTION;
  return null;
}
