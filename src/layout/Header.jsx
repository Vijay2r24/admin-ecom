import React, { useRef, useState, useEffect } from "react";
import { Bell, Menu, Dot, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSelector, useDispatch } from "react-redux";
import { useTitle } from "../context/TitleContext";
import { useNotifications } from "../context/NotificationContext";
import { fetchUserDetails, clearUserDetails } from "../store/slices/allDataSlice";
import { logout } from "../store/slices/authSlice";
import IdleLogout from "../components/IdleLogout";
import user from "../../assets/images/user.jpg";



const Header = ({ onMenuClick }) => {
  const { t } = useTranslation();
  const { title, backButton } = useTitle();
  const { notifications, unreadCount, removeNotification, clearNotifications, hasUnreadNotifications, markAsRead } = useNotifications();
  const dispatch = useDispatch();
  const { userDetails } = useSelector((state) => state.allData);
  const { isLoggedIn } = useSelector((state) => state.auth);

  const [bShowNotifications, setShowNotifications] = useState(false);
  const bellRef = useRef();
  const dropdownRef = useRef();
  const [bShowProfileMenu, setbShowProfileMenu] = useState(false);
  const profileRef = useRef();
  const profileDropdownRef = useRef();
  const navigate = useNavigate();

  // Get user details from Redux store on component mount
  useEffect(() => {
    const storedUserDetails = localStorage.getItem("userDetails");
    if (storedUserDetails) {
      const parsedDetails = JSON.parse(storedUserDetails);
      // Only fetch if we don't have details in redux yet to save network calls
      if (!userDetails) {
        dispatch(fetchUserDetails(parsedDetails.UserID));
      }
    }
  }, [dispatch, userDetails]);

  // CHANGE: Updated logic to be consistent with ProfileDetails
  const getProfileImageUrl = () => {
    if (userDetails?.ProfileImageUrl && Array.isArray(userDetails.ProfileImageUrl) && userDetails.ProfileImageUrl.length > 0) {
      return userDetails.ProfileImageUrl[0].documentUrl;
    }
    return user;
  };

  const oUserDetails = userDetails || {};

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        bellRef.current &&
        !bellRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
    }
    if (bShowNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [bShowNotifications]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target) &&
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setbShowProfileMenu(false);
      }
    }
    if (bShowProfileMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [bShowProfileMenu]);

  const handleProfileMenuAction = (action) => {
    setbShowProfileMenu(false);
    setTimeout(() => {
      switch (action) {
        case "profile":
          navigate("/profile");
          break;
        case "logout":
          localStorage.removeItem("token");
          localStorage.removeItem("userDetails");
          dispatch(clearUserDetails());
          navigate("/");
          break;
        default:
          break;
      }
    }, 100);
  };

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between h-12 px-3 lg:px-4">
        <div className="flex items-center gap-2 lg:gap-4 flex-1">
          <div className="lg:hidden flex items-center">
            <button
              className="p-1.5 text-gray-600 hover:text-gray-900 focus:outline-none transition-colors rounded-md hover:bg-gray-100"
              onClick={onMenuClick}
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {backButton}


            {title && (
              <h1 className="text-sm font-semibold text-gray-900 truncate max-w-xs">
                {title}
              </h1>
            )}
          </div>
        </div>

        <div className="relative flex items-center gap-2">

          <IdleLogout isLoggedIn={isLoggedIn} onLogout={() => {
            localStorage.removeItem("token");
            localStorage.removeItem("userDetails");
            dispatch(clearUserDetails());
            dispatch(logout());
            navigate("/");
          }} />

          <button
            ref={bellRef}
            className="relative p-1.5 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
            onClick={() => {
              setShowNotifications((v) => !v);
              if (!bShowNotifications) {
                markAsRead(); // Mark as read when opening dropdown
              }
            }}
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {hasUnreadNotifications && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {bShowNotifications && (
            <div
              ref={dropdownRef}
              className="fixed right-3 sm:right-4 top-12 w-full max-w-xs sm:w-72 rounded-md shadow-lg border border-gray-200 z-50 bg-white animate-fade-in"
            >
              <div className="h-0.5 w-full bg-gradient-to-r from-blue-400 via-blue-300 to-blue-200 rounded-t-md" />
              <div className="p-2.5 border-b border-gray-200 font-semibold text-xs text-gray-800 flex items-center gap-2">
                <Bell className="h-4 w-4 text-blue-500" />
                {t("HEADER.NOTIFICATIONS")}
              </div>
              <ul className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                {notifications.length === 0 ? (
                  <li className="p-3 text-gray-500 text-xs">
                    {t("HEADER.NO_NOTIFICATIONS")}
                  </li>
                ) : (
                  notifications.map((notification) => (
                    <li
                      key={notification.id}
                      className="flex items-start gap-2.5 p-2.5 hover:bg-blue-50/60 transition-colors cursor-pointer relative group"
                    >
                      <Dot className={`h-4 w-4 mt-0.5 ${
                        notification.type === 'success' ? 'text-green-400' :
                        notification.type === 'error' ? 'text-red-400' :
                        notification.type === 'warning' ? 'text-yellow-400' :
                        'text-blue-400'
                      }`} />
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-gray-900">
                          {notification.title}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {notification.time}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNotification(notification.id);
                        }}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-gray-200 rounded"
                      >
                        <X className="h-3 w-3 text-gray-400" />
                      </button>
                    </li>
                  ))
                )}
              </ul>
              <div className="p-2 text-center border-t border-gray-200 bg-gray-50 rounded-b-md flex justify-between items-center">
                <a
                  href="/notifications"
                  className="text-blue-600 text-xs font-semibold hover:underline"
                >
                  {t("COMMON.VIEW_ALL")}
                </a>
                {notifications.length > 0 && (
                  <button
                    onClick={clearNotifications}
                    className="text-red-600 text-xs font-semibold hover:underline"
                  >
                    {t("COMMON.CLEAR_HISTORY")}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Profile Section */}
          <div className="relative flex items-center gap-1.5 pl-2 border-l border-gray-200 ml-2">
            <button
              ref={profileRef}
              className="flex items-center focus:outline-none group"
              onClick={() => setbShowProfileMenu((v) => !v)}
              aria-label="Profile menu"
            >
              <div className="relative">
                <img
                  className="h-7 w-7 rounded-full object-cover border-2 border-gray-200 group-hover:border-blue-200 transition-colors"
                  src={getProfileImageUrl()}
                  alt="Profile"
                  onError={(e) => {
                    e.target.src = user
                  }}
                />
                <div className="absolute bottom-0 right-0 h-2 w-2 bg-green-500 rounded-full border border-white"></div>
              </div>
              <div className="hidden sm:block text-left ml-2 z-50">
                <div className="text-xs font-semibold text-gray-900 truncate max-w-[120px] whitespace-nowrap overflow-hidden text-ellipsis">
                  {oUserDetails?.FirstName} {oUserDetails?.LastName}
                </div>
                <div className="text-xs text-gray-500 truncate max-w-[120px] whitespace-nowrap overflow-hidden text-ellipsis">
                  {oUserDetails?.RoleName}
                </div>
              </div>
            </button>

            {/* Profile Dropdown */}
            {bShowProfileMenu && (
              <div
                ref={profileDropdownRef}
                className="absolute right-0 top-11 w-52 rounded-md shadow-xl border border-gray-200 z-50 bg-white animate-fade-in overflow-hidden"
              >
                <div className="absolute -top-1.5 right-4 w-3 h-3 bg-white border-t border-l border-gray-200 rotate-45 z-10"></div>
                <div className="flex flex-col items-center pt-4 pb-2.5 px-3 border-b border-gray-200">
                  <img
                    className="h-12 w-12 rounded-full object-cover border border-gray-200 shadow-sm mb-1.5"
                    src={getProfileImageUrl()}
                    alt="Profile"
                    onError={(e) => {
                      e.target.src = user;
                    }}
                  />
                  <div className="text-xs font-semibold text-gray-900 text-center">
                    {oUserDetails?.FirstName} {oUserDetails?.LastName}
                  </div>
                  <div className="text-xs text-gray-500 mb-0.5">
                    {oUserDetails?.RoleName}
                  </div>
                </div>
                <div className="py-1">
                  <button
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors font-semibold"
                    onClick={() => handleProfileMenuAction("profile")}
                  >

                    <svg
                      className="w-3.5 h-3.5 text-blue-500"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    {t("HEADER.YOUR_PROFILE")}
                  </button>
                  <button
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors font-semibold"
                    onClick={() => handleProfileMenuAction("logout")}
                  >
                    <svg
                      className="w-3.5 h-3.5 text-red-500"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    {t("HEADER.LOGOUT")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;