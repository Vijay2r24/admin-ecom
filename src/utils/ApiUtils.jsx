import axios from "axios";
import Swal from "sweetalert2";
import { BASE_URL } from "../contants/apiRoutes";
import { showEmsg } from "../utils/ShowEmsg";
import { MESSAGES, STATUS, TOAST_DURATION } from "../contants/constants";

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

const showLogoutNotification = (message, fallbackText = INACTIVE_USER_MESSAGE) => {
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

      if (status === failure) {
        if (
          normalized.includes("inactive") ||
          normalized.includes("deactivated") ||
          normalized.includes("account has been deactivated")
        ) {
          if (!isLoginPage()) showLogoutNotification(msg);
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

      // COMPLETE SILENT HANDLING OF ABORT/CANCEL EVENTS
      if (axios.isCancel(error)) {
        // Return a special promise that never resolves or rejects
        // This completely silences the error for the caller
        return new Promise(() => { }); // Hung promise - never settles
      }

      // Safe error message extraction
      let msg = DEFAULT_ERROR_MESSAGE;
      try {
        msg = error?.response?.data?.message ||
          error?.message ||
          DEFAULT_ERROR_MESSAGE;
      } catch (e) {
        msg = DEFAULT_ERROR_MESSAGE;
      }

      const normalized = msg.toLowerCase();

      if (
        normalized.includes("inactive") ||
        normalized.includes("deactivated") ||
        normalized.includes("account has been deactivated")
      ) {
        if (!isLoginPage()) showLogoutNotification(msg);
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

export const apiGet = async (endpoint, oParams = {}, token = null) => {
  return makeApiCall(async () => {
    const api = oCreateApiInstance(token, false, endpoint);
    const response = await api.get(endpoint, { params: oParams });
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
    const api = oCreateApiInstance(token, isFormData, endpoint);
    const response = await api.post(endpoint, data, { responseType });
    return response;
  });
};

export const apiPut = async (endpoint, data, token = null, isFormData = false) => {
  return makeApiCall(async () => {
    const api = oCreateApiInstance(token, isFormData, endpoint);
    const response = await api.put(endpoint, data);
    return response;
  });
};

export const apiPatch = async (endpoint, data, token = null, isFormData = false) => {
  return makeApiCall(async () => {
    const api = oCreateApiInstance(token, isFormData, endpoint);
    const response = await api.patch(endpoint, data);
    return response;
  });
};

export const apiDelete = async (endpoint, token = null) => {
  return makeApiCall(async () => {
    const api = oCreateApiInstance(token, false, endpoint);
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