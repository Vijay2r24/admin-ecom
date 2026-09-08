import axios from "axios";
import { BASE_URL } from "../contants/apiRoutes";
import { showEmsg } from "../utils/ShowEmsg";
import {
  API_CUSTOM_CODES,
  MESSAGES,
  NOTIFICATION_TYPES,
  STATUS,
  TOAST_DURATION,
  WINDOW_CUSTOM_EVENTS,
} from "../contants/constants";
import {
  isTenantAdminRole,
  markSubscriptionReadOnlyMode,
  markUserCreateLimitBlocked,
} from "./planAccessUtils";
import i18n from "../i18n.js";

/* ------------------------------------------------------------------
   LOGOUT + NOTIFICATION FUNCTIONS
------------------------------------------------------------------ */

const DEFAULT_ERROR_MESSAGE = MESSAGES.DEFAULT_ERROR_MESSAGE;


/* ---------------- BLOCK POPUP ON LOGIN PAGE ---------------- */
const isLoginPage = () => {
  const path = window.location.pathname.toLowerCase();
  return path === "/" || path === "/login";
};

const isUpgradePlanPage = () =>
  window.location.pathname.toLowerCase() === "/upgrade-plan";

/** Pages where a 403 from a data API should NOT trigger upgrade-plan redirect.
 *  These pages are themselves allowed by plan but call sub-APIs that may be restricted. */
const isDashboardPage = () =>
  window.location.pathname.toLowerCase() === "/dashboard";

/** HTTP 200 body failure sometimes carries plan/forbidden text instead of HTTP 403 */
const shouldSilentRedirectToUpgradePlanFromMessage = (message) => {
  const m = (message || "").toLowerCase();
  return m.includes("403") || m.includes("forbidden");
};

const shouldDispatchPlanExpiredLogoutFromMessage = (message) => {
  const m = (message || "").toLowerCase();
  return (
    m.includes("plan expired") ||
    m.includes("subscription expired") ||
    (m.includes("plan") && m.includes("expir")) ||
    (m.includes("subscription") && m.includes("expir"))
  );
};

const dispatchPlanExpiredLogout = () => {
  if (isLoginPage()) {
    return;
  }
  window.dispatchEvent(
    new CustomEvent(WINDOW_CUSTOM_EVENTS.PLAN_EXPIRED_LOGOUT)
  );
};

const isCustomCode = (value, code) =>
  value != null && Number(value) === Number(code);

const normalizeApiMessage = (message) => (message || "").toLowerCase();

export const getApiResponseStatus = (data) =>
  data?.status ?? data?.STATUS ?? data?.Status;

export const getApiResponseMessage = (data, fallback = "") =>
  data?.message || data?.MESSAGE || data?.Message || fallback;

export const isApiResponseSuccess = (data) => {
  const status = getApiResponseStatus(data);
  return status?.toUpperCase() === STATUS.SUCCESS.toUpperCase();
};

/** Heuristic when backend does not send `customCode` for quota / seat / usage caps */
const isLikelyPlanOrSubscriptionLimitMessage = (message) => {
  const m = normalizeApiMessage(message);
  return (
    m.includes("limit reached") ||
    m.includes("maximum") ||
    m.includes("max limit") ||
    m.includes("max user") ||
    m.includes("max users") ||
    m.includes("quota") ||
    m.includes("exceeded your") ||
    m.includes("exceeds the") ||
    m.includes("not allowed for your plan") ||
    m.includes("upgrade your plan") ||
    m.includes("plan does not allow")
  );
};

const toastSubscriptionReadOnly = (msg) => {
  const n = normalizeApiMessage(msg);
  let headingKey = "SUBSCRIPTION.TOAST_READ_ONLY_HEADING";
  if (n.includes("grace")) {
    headingKey = "SUBSCRIPTION.TOAST_READ_ONLY_GRACE_HEADING";
  } else if (n.includes("renew") || n.includes("read only") || n.includes("read-only")) {
    headingKey = "SUBSCRIPTION.TOAST_READ_ONLY_RENEW_HEADING";
  }
  const heading = i18n.t(headingKey);
  const body = (msg || "").trim();
  showEmsg(body ? `${heading} — ${body}` : heading, "warning", 6500);
};

const redirectToUpgradePlanSilently = () => {
  if (isLoginPage() || isUpgradePlanPage() || isDashboardPage()) {
    return false;
  }
  if (!isTenantAdminRole()) {
    return false;
  }
  window.dispatchEvent(
    new CustomEvent(WINDOW_CUSTOM_EVENTS.NAVIGATE_UPGRADE_PLAN)
  );
  return true;
};

const showLogoutNotification = (message, fallbackText = INACTIVE_USER_MESSAGE) => {
  const logoutEvent = new CustomEvent('triggerIdleLogout', { 
    detail: { message, fallbackText } 
  });
  window.dispatchEvent(logoutEvent);
};

/* ------------------------------------------------------------------
   ABORT CONTROLLER STORE — Prevent duplicate API calls
------------------------------------------------------------------ */

const abortControllers = new Map();

/* ------------------------------------------------------------------
   SINGLE FACTORY — NOW THIS REPLACES **api**
------------------------------------------------------------------ */

const oCreateApiInstance = (token = null, isFormData = false, key = "") => {
  const controller = new AbortController();

  // cancel previous request with same key
  if (key) {
    const prev = abortControllers.get(key);
    if (prev) prev.abort();

    abortControllers.set(key, controller);
  }
const createApiInstance = (token, isFormData) => {
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      'Content-Type': isFormData ? 'multipart/form-data' : 'application/json',
      Accept: 'application/json',
      'tenant-domain': TENANT_DOMAIN,
      ...(token && {Authorization: `Bearer ${token}`}),
    },
  });
};
 
  // For local development, use the tenant domain from env, for production use the actual hostname
  const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const tenantDomain = isLocalhost
    ? (import.meta.env.VITE_TENANT_DOMAIN || "ecommerce-qa.admin.b2yinfy.com")
    : window.location.hostname;

  const instance = axios.create({
    baseURL: BASE_URL,
    signal: controller.signal,
    headers: {
      "Content-Type": isFormData ? "multipart/form-data" : "application/json",
      "tenant-domain": tenantDomain,
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  /* ------------------------ REQUEST INTERCEPTOR ------------------------ */
  instance.interceptors.request.use((config) => {
    const lsToken = localStorage.getItem("token");
    if (lsToken) {
      config.headers["Authorization"] = `Bearer ${lsToken}`;
    }

    // Ensure tenant-domain is consistently set for both localhost and production
    const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const currentTenantDomain = isLocalhost
      ? (import.meta.env.VITE_TENANT_DOMAIN || "ecommerce-qa.admin.b2yinfy.com")
      : window.location.hostname;
    
    config.headers["tenant-domain"] = currentTenantDomain;

    // Debug logging for login issues
    if (config.url?.includes('/adminlogin')) {
    
    }

    return config;
  });

  /* ------------------------ RESPONSE INTERCEPTOR ------------------------ */
  instance.interceptors.response.use(
    (response) => {
      // Clean up abort controller on successful response
      if (key) {
        abortControllers.delete(key);
      }

      // Debug logging for login responses
      if (response.config?.url?.includes('/adminlogin')) {
        
      }

      const status = (response?.data?.status ?? "").toString().toLowerCase();
      const failure = STATUS.FAILURE.toLowerCase();
      const msg = response?.data?.message || "";
      const normalized = msg.toLowerCase();
      const customCode = response?.data?.customCode;

      if (status === failure) {
        if (isCustomCode(customCode, API_CUSTOM_CODES.SUBSCRIPTION_READ_ONLY)) {
          markSubscriptionReadOnlyMode();
          if (!isLoginPage()) {
            toastSubscriptionReadOnly(msg);
          }
          return Promise.reject(new Error(msg));
        }
        // Check for permission denied response with customCode 1001
        if (
          isCustomCode(customCode, API_CUSTOM_CODES.PERMISSION_DENIED) ||
          normalized.includes("permission")
        ) {
          if (!isLoginPage()) {
  
            const logoutEvent = new CustomEvent('triggerIdleLogout', { 
              detail: { message: msg, fallbackText: "Permission denied - session timeout" } 
            });
            window.dispatchEvent(logoutEvent);
          }
        } else if (
          normalized.includes("inactive") ||
          normalized.includes("deactivated") ||
          normalized.includes("account has been deactivated")
        ) {
          if (!isLoginPage()) {
           
            const logoutEvent = new CustomEvent('triggerIdleLogout', { 
              detail: { message: msg, fallbackText: "Account inactive - session timeout" } 
            });
            window.dispatchEvent(logoutEvent);
          }
        } else {
          if (shouldDispatchPlanExpiredLogoutFromMessage(msg)) {
            if (!isLoginPage()) {
              showEmsg(i18n.t("SUBSCRIPTION.TOAST_PLAN_EXPIRED_SIGN_OUT"), NOTIFICATION_TYPES.ERROR, 6500);
            }
            dispatchPlanExpiredLogout();
            return Promise.reject(new Error(msg));
          }
          if (shouldSilentRedirectToUpgradePlanFromMessage(msg) && redirectToUpgradePlanSilently()) {
            if (!isLoginPage()) {
              showEmsg(i18n.t("SUBSCRIPTION.TOAST_PLAN_FORBIDDEN_UPGRADE"), NOTIFICATION_TYPES.WARNING,5000);
            }
            return Promise.reject(new Error(msg));
          }
          if (
            isCustomCode(customCode, API_CUSTOM_CODES.PLAN_OR_SUBSCRIPTION_LIMIT) ||
            isLikelyPlanOrSubscriptionLimitMessage(msg)
          ) {
            // Mark the create limit as blocked so useCreateAccess disables buttons
            markUserCreateLimitBlocked();
            if (!isLoginPage()) {
              const hint = i18n.t("SUBSCRIPTION.TOAST_PLAN_LIMIT_HEADING");
              const body = (msg || "").trim();
              showEmsg(body ? `${hint} — ${body}` : hint, NOTIFICATION_TYPES.WARNING, 6500);
            }
            return Promise.reject(new Error(msg));
          }
          showEmsg(msg || DEFAULT_ERROR_MESSAGE, NOTIFICATION_TYPES.ERROR);
        }
        // Don't show toast here - let components handle their own error display
        return Promise.reject(new Error(msg));
      }

      return response;
    },

    (error) => {
      // Clean up abort controller on error response
      if (key) {
        abortControllers.delete(key);
      }

      // Debug logging for login errors
      if (error.config?.url?.includes('/adminlogin')) {
        
      }

      const httpStatus = error?.response?.status;

      // 500 Internal Server Error — show a single clear toast
      if (httpStatus >= 500) {
        const serverMsg = error?.response?.data?.message;
        showEmsg(
          serverMsg || i18n.t("COMMON.SERVER_ERROR"),
          NOTIFICATION_TYPES.ERROR,
          4000
        );
        return Promise.reject(error);
      }

      if (httpStatus === 403 && !isLoginPage()) {
        const errCustomCode = error?.response?.data?.customCode;
        const errMsg = error?.response?.data?.message || "";
        const errNormalized = errMsg.toLowerCase();

        // Deactivated account → trigger logout sticker
        if (
          errNormalized.includes("deactivated") ||
          errNormalized.includes("inactive") ||
          errNormalized.includes("account has been deactivated")
        ) {
          const logoutEvent = new CustomEvent('triggerIdleLogout', {
            detail: { message: errMsg || "Your account has been deactivated. Please contact an administrator." }
          });
          window.dispatchEvent(logoutEvent);
          return Promise.reject(error);
        }

        // Permission denied (customCode 1001) → trigger logout sticker
        if (
          isCustomCode(errCustomCode, API_CUSTOM_CODES.PERMISSION_DENIED) ||
          errNormalized.includes("does not have permission")
        ) {
          const logoutEvent = new CustomEvent('triggerIdleLogout', {
            detail: { message: errMsg || "You do not have permission. Please log out and log in again." }
          });
          window.dispatchEvent(logoutEvent);
          return Promise.reject(error);
        }

        if (!isUpgradePlanPage() && !isDashboardPage()) {
          showEmsg(i18n.t("SUBSCRIPTION.TOAST_HTTP_403_PLAN"), NOTIFICATION_TYPES.WARNING, 5000);
          redirectToUpgradePlanSilently();
        }
        return Promise.reject(error);
      }

      // COMPLETE SILENT HANDLING OF ABORT/CANCEL EVENTS
      if (axios.isCancel(error)) {
        // Return a special promise that never resolves or rejects
        // This completely silences the error for the caller
        return new Promise(() => { }); // Hung promise - never settles
      }

      // Safe error message extraction
      let msg = DEFAULT_ERROR_MESSAGE;
      let customCode = null;
      try {
        // If no response at all (API down / network error), use a clear message
        if (!error?.response) {
          msg = i18n.t("COMMON.ERROR_MESSAGE");
        } else {
          msg = error?.response?.data?.message || 
                 error?.message || 
                 DEFAULT_ERROR_MESSAGE;
        }
        customCode = error?.response?.data?.customCode;
      } catch {
        msg = DEFAULT_ERROR_MESSAGE;
      }

      const normalized = msg.toLowerCase();

      if (shouldDispatchPlanExpiredLogoutFromMessage(msg)) {
        if (!isLoginPage()) {
          showEmsg(i18n.t("SUBSCRIPTION.TOAST_PLAN_EXPIRED_SIGN_OUT"), NOTIFICATION_TYPES.ERROR, 6500);
        }
        dispatchPlanExpiredLogout();
        return Promise.reject(error);
      }

      if (isCustomCode(customCode, API_CUSTOM_CODES.SUBSCRIPTION_READ_ONLY)) {
        markSubscriptionReadOnlyMode();
        if (!isLoginPage()) {
          toastSubscriptionReadOnly(msg);
        }
        return Promise.reject(error);
      }

      // Check for permission denied responses
      if (
        isCustomCode(customCode, API_CUSTOM_CODES.PERMISSION_DENIED) ||
        normalized.includes("permission")
      ) {
        if (!isLoginPage()) {
          const logoutEvent = new CustomEvent('triggerIdleLogout', { 
            detail: { message: msg, fallbackText: "Permission denied - session timeout" } 
          });
          window.dispatchEvent(logoutEvent);
        }
      } else if (
        normalized.includes("inactive") ||
        normalized.includes("deactivated") ||
        normalized.includes("account has been deactivated")
      ) {
        if (!isLoginPage()) {
          const logoutEvent = new CustomEvent('triggerIdleLogout', { 
            detail: { message: msg, fallbackText: "Account inactive - session timeout" } 
          });
          window.dispatchEvent(logoutEvent);
        }
      } else if (
        isCustomCode(customCode, API_CUSTOM_CODES.PLAN_OR_SUBSCRIPTION_LIMIT) ||
        isLikelyPlanOrSubscriptionLimitMessage(msg)
      ) {
        // Mark the create limit as blocked so useCreateAccess disables buttons
        markUserCreateLimitBlocked();
        if (!isLoginPage()) {
          const hint = i18n.t("SUBSCRIPTION.TOAST_PLAN_LIMIT_HEADING");
          const body = (msg || "").trim();
          showEmsg(body ? `${hint} — ${body}` : hint, NOTIFICATION_TYPES.WARNING, 6500);
        }
      } else if (
        shouldSilentRedirectToUpgradePlanFromMessage(msg) &&
        redirectToUpgradePlanSilently()
      ) {
        if (!isLoginPage()) {
          showEmsg(i18n.t("SUBSCRIPTION.TOAST_PLAN_FORBIDDEN_UPGRADE"), NOTIFICATION_TYPES.WARNING, 5000);
        }
      } else {
        // Don't show toast here - let components handle their own error display
      }
      // Don't show toast here - let components handle their own error display

      return Promise.reject(error);
    }
  );

  return instance;
};

/* ------------------------------------------------------------------
   API FUNCTIONS WITH COMPLETE ABORT SILENCING
------------------------------------------------------------------ */

// Helper function to handle API calls with silent abort handling
const makeApiCall = async (apiCall) => {
  try {
    return await apiCall();
  } catch (error) {
    // If it's an abort error, completely silence it by not rejecting
    if (axios.isCancel(error)) {
      // Return a special object or just return undefined silently
      return undefined;
    }
    // For non-abort errors, re-throw so caller can handle
    throw error;
  }
};

export const apiGet = async (endpoint, oParams = {}, token = null, responseType = "json") => {
  return makeApiCall(async () => {
    const api = oCreateApiInstance(token, false, `${endpoint}-${Date.now()}`);
    const response = await api.get(endpoint, { params: oParams, responseType });
    return response;
  });
};

export const apiPost = async (
  endpoint,
  data,
  token = null,
  isFormData = false,
  responseType = "json"
) => {
  return makeApiCall(async () => {
    const api = oCreateApiInstance(token, isFormData, `${endpoint}-${Date.now()}`);
    const response = await api.post(endpoint, data, { responseType });
    return response;
  });
};

export const apiPut = async (endpoint, data, token = null, isFormData = false) => {
  return makeApiCall(async () => {
    const api = oCreateApiInstance(token, isFormData, `${endpoint}-${Date.now()}`);
    const response = await api.put(endpoint, data);
    return response;
  });
};

export const apiPatch = async (endpoint, data, token = null, isFormData = false) => {
  return makeApiCall(async () => {
    const api = oCreateApiInstance(token, isFormData, `${endpoint}-${Date.now()}`);
    const response = await api.patch(endpoint, data);
    return response;
  });
};

export const apiDelete = async (endpoint, token = null) => {
  return makeApiCall(async () => {
    const api = oCreateApiInstance(token, false, `${endpoint}-${Date.now()}`);
    const response = await api.delete(endpoint);
    return response;
  });
};

// Utility function to cancel specific API call
export const cancelApiCall = (key) => {
  const controller = abortControllers.get(key);
  if (controller) {
    controller.abort();
    abortControllers.delete(key);
  }
};

// Utility function to cancel all pending API calls
export const cancelAllApiCalls = () => {
  abortControllers.forEach((controller, key) => {
    controller.abort();
    abortControllers.delete(key);
  });
};

// Check if a request was aborted
export const isAbortedError = (error) => {
  return axios.isCancel(error);
};
