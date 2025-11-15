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
      ${
        message
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
   SINGLE FACTORY — NOW THIS REPLACES **api**
------------------------------------------------------------------ */

const oCreateApiInstance = (token = null, isFormData = false) => {
  const instance = axios.create({
    baseURL: BASE_URL,
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
    // SUCCESS RESPONSE
    (response) => {
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
          // BLOCK POPUP ON LOGIN PAGE
          if (!isLoginPage()) {
            showLogoutNotification(msg);
          }
        } else {
          showEmsg(msg || DEFAULT_ERROR_MESSAGE, "error");
        }

        return Promise.reject(new Error(msg));
      }

      return response;
    },

    // ERROR RESPONSE
    (error) => {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        DEFAULT_ERROR_MESSAGE;

      const normalized = msg.toLowerCase();

      if (
        normalized.includes("inactive") ||
        normalized.includes("deactivated") ||
        normalized.includes("account has been deactivated")
      ) {
        // BLOCK POPUP ON LOGIN PAGE
        if (!isLoginPage()) {
          showLogoutNotification(msg);
        }
      } else {
        showEmsg(msg, "error");
      }

      return Promise.reject(error);
    }
  );

  return instance;
};


/* ------------------------------------------------------------------
   BELOW — SAME AS YOUR ORIGINAL FUNCTIONS
------------------------------------------------------------------ */

export const apiGet = async (endpoint, oParams = {}, token = null) => {
  const api = oCreateApiInstance(token);
  return await api.get(endpoint, { params: oParams });
};

export const apiPost = async (
  endpoint,
  data,
  token = null,
  isFormData = false,
  responseType = "json"
) => {
  const api = oCreateApiInstance(token, isFormData);
  return await api.post(endpoint, data, { responseType });
};

export const apiPut = async (endpoint, data, token = null, isFormData = false) => {
  const api = oCreateApiInstance(token, isFormData);
  return await api.put(endpoint, data);
};

export const apiPatch = async (endpoint, data, token = null, isFormData = false) => {
  const api = oCreateApiInstance(token, isFormData);
  return await api.patch(endpoint, data);
};

export const apiDelete = async (endpoint, token = null) => {
  const api = oCreateApiInstance(token);
  return await api.delete(endpoint);
};
