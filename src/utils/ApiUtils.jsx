import axios from "axios";
import Swal from "sweetalert2";
import { BASE_URL } from "../contants/apiRoutes";
import { showEmsg } from "../utils/ShowEmsg";
import {
  API_CUSTOM_CODES,
  MESSAGES,
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

const INACTIVE_USER_MESSAGE = MESSAGES.INACTIVE_USER_MESSAGE;
const DEFAULT_ERROR_MESSAGE = MESSAGES.DEFAULT_ERROR_MESSAGE;

const handleLogout = () => {
  localStorage.clear();
  window.location.href = "/";
};

/* ---------------- BLOCK POPUP ON LOGIN PAGE ---------------- */
const isLoginPage = () => {
  const path = window.location.pathname.toLowerCase();
  return path === "/" || path === "/login";
};

const isUpgradePlanPage = () =>
  window.location.pathname.toLowerCase() === "/upgrade-plan";

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
  if (isLoginPage() || isUpgradePlanPage()) {
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
  // Trigger IdleLogout behavior instead of SweetAlert2 popup
  
  // Create a custom event to trigger IdleLogout countdown
  const logoutEvent = new CustomEvent('triggerIdleLogout', { 
    detail: { message, fallbackText } 
  });
  window.dispatchEvent(logoutEvent);
  
  return;
  
  // Original SweetAlert2 code commented out
  /*
  const html = `
    <div style="display:flex;flex-direction:column;gap:8px;text-align:left;">
      <p style="margin:0;">${fallbackText}</p>
      ${message
      ? `<p style="margin:0;color:#dc2626;font-weight:600;">Error: ${message}</p>`
      : ""
    }
      <p style="margin:0;font-size:14px;color:#1f2937;">
        Auto logout in <span data-swal-timer-countdown>10</span> seconds.
      </p>
    </div>
  `;

  let timerInterval;

  Swal.fire({
    html,
    icon: STATUS.WARNING,
    confirmButtonText: "Logout Now",
    allowOutsideClick: false,
    allowEscapeKey: false,
    timer: TOAST_DURATION.TO_LONG,
    timerProgressBar: true,
    width: "32rem",
    customClass: { confirmButton: "btn btn-primary" },
    buttonsStyling: false,

    didOpen: () => {
      const container = Swal.getHtmlContainer();
      const countdownEl = container?.querySelector("[data-swal-timer-countdown]");

      timerInterval = setInterval(() => {
        const timerLeft = Swal.getTimerLeft();
        if (!timerLeft || !countdownEl) return;
        countdownEl.textContent = Math.ceil(timerLeft / 1000);
      }, 100);
    },

    willClose: () => clearInterval(timerInterval),
  }).then((result) => {
    if (result.dismiss === Swal.DismissReason.timer || result.isConfirmed) {
      handleLogout();
    }
  });
  */
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

  const instance = axios.create({
    baseURL: BASE_URL,
    signal: controller.signal,
    headers: {
      "Content-Type": isFormData ? "multipart/form-data" : "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  /* ------------------------ REQUEST INTERCEPTOR ------------------------ */
  instance.interceptors.request.use((config) => {
    const lsToken = localStorage.getItem("token");
    if (lsToken) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${lsToken}`;
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
            console.error("User inactive/deactivated - triggering IdleLogout");
            const logoutEvent = new CustomEvent('triggerIdleLogout', { 
              detail: { message: msg, fallbackText: "Account inactive - session timeout" } 
            });
            window.dispatchEvent(logoutEvent);
          }
        } else {
          if (shouldDispatchPlanExpiredLogoutFromMessage(msg)) {
            if (!isLoginPage()) {
              showEmsg(i18n.t("SUBSCRIPTION.TOAST_PLAN_EXPIRED_SIGN_OUT"), "error", 6500);
            }
            dispatchPlanExpiredLogout();
            return Promise.reject(new Error(msg));
          }
          if (shouldSilentRedirectToUpgradePlanFromMessage(msg) && redirectToUpgradePlanSilently()) {
            if (!isLoginPage()) {
              showEmsg(i18n.t("SUBSCRIPTION.TOAST_PLAN_FORBIDDEN_UPGRADE"), "warning", 5000);
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
              showEmsg(body ? `${hint} — ${body}` : hint, "warning", 6500);
            }
            return Promise.reject(new Error(msg));
          }
          showEmsg(msg || DEFAULT_ERROR_MESSAGE, "error");
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

      const httpStatus = error?.response?.status;
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

        if (!isUpgradePlanPage()) {
          showEmsg(i18n.t("SUBSCRIPTION.TOAST_HTTP_403_PLAN"), "warning", 5000);
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
        msg = error?.response?.data?.message || 
               error?.message || 
               DEFAULT_ERROR_MESSAGE;
        customCode = error?.response?.data?.customCode;
      } catch (e) {
        msg = DEFAULT_ERROR_MESSAGE;
      }

      const normalized = msg.toLowerCase();

      if (shouldDispatchPlanExpiredLogoutFromMessage(msg)) {
        if (!isLoginPage()) {
          showEmsg(i18n.t("SUBSCRIPTION.TOAST_PLAN_EXPIRED_SIGN_OUT"), "error", 6500);
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
          showEmsg(body ? `${hint} — ${body}` : hint, "warning", 6500);
        }
      } else if (
        shouldSilentRedirectToUpgradePlanFromMessage(msg) &&
        redirectToUpgradePlanSilently()
      ) {
        if (!isLoginPage()) {
          showEmsg(i18n.t("SUBSCRIPTION.TOAST_PLAN_FORBIDDEN_UPGRADE"), "warning", 5000);
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