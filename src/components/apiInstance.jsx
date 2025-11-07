import axios from "axios";
import Swal from "sweetalert2";
import { BASE_URL } from "../contants/apiRoutes";
import { showEmsg } from "../utils/ShowEmsg";
import { STATUS } from "../contants/constants";
 
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});
 
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token"); // or your token logic
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
 
const INACTIVE_USER_MESSAGE =
  "Your access permissions have been updated. Kindly <br/> log in again to proceed.";
const DEFAULT_ERROR_MESSAGE = "An unexpected error occurred. Please try again.";
 
// Function to show logout notification
const showLogoutNotification = (
  message,
  fallbackText = INACTIVE_USER_MESSAGE
) => {
  const html = `
<div style="display:flex;flex-direction:column;gap:8px;text-align:left;">
<p style="margin:0;">${fallbackText}</p>
      ${
        message
          ? `<p style="margin:0;color:#dc2626;font-weight:600;">Error: ${message}</p>`
          : ""
      }
<p style="margin:0;font-size:14px;color:#1f2937;">Auto logout in <span data-swal-timer-countdown>10</span> seconds.</p>
</div>
  `;
 
  let timerInterval;
 
  Swal.fire({
    html: html,
    icon: "warning",
    showConfirmButton: true,
    confirmButtonText: "Logout",
    showCancelButton: false,
    allowOutsideClick: false,
    allowEscapeKey: false,
    timer: 10000,
    timerProgressBar: true,
    width: "32rem",
    customClass: {
      confirmButton: "btn btn-primary",
    },
    buttonsStyling: false,
    didOpen: () => {
      const container = Swal.getHtmlContainer();
      const countdownEl = container?.querySelector("[data-swal-timer-countdown]");
 
      timerInterval = setInterval(() => {
        const timerLeft = Swal.getTimerLeft();
        if (!timerLeft || !countdownEl) {
          return;
        }
        countdownEl.textContent = Math.ceil(timerLeft / 1000).toString();
      }, 200);
    },
    willClose: () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    },
  }).then((result) => {
    if (result.isConfirmed) {
      localStorage.clear();
      window.location.href = "/"; // Always navigate to home page
    }
  });
};
 
api.interceptors.response.use(
  (response) => {
    // If server returns a "FAILURE" status inside success response
    if (response.data?.status === STATUS.FAILURE.toLocaleUpperCase()) {
      showLogoutNotification(response.data?.message);
      return Promise.reject(response); // stop further processing
    }
 
    return response;
  },
  (error) => {
    // Also catch error responses (like 403)
    const apiMessage =
      error.response?.data?.message || error.message || DEFAULT_ERROR_MESSAGE;
 
    if (error.response?.data?.message === "User is Inactive") {
      showLogoutNotification(apiMessage);
    } else {
      showEmsg(apiMessage, "error");
    }
    return Promise.reject(error);
  }
);
 
export default api