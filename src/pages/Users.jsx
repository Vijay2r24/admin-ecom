import { useState, useEffect, useCallback } from "react";
import { Mail, Phone, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Toolbar from "../components/Toolbar";
import Pagination from "../components/Pagination";
import ActionButtons from "../components/ActionButtons";
import { useTranslation } from "react-i18next";
import { USER_ACTIVE_STATUS } from "../contants/apiRoutes";
import { useTitle } from "../context/TitleContext";
import { ITEMS_PER_PAGE, STATUS, STATUS_OPTIONS, MODULES, PERMISSIONS, SKELETON_TYPES } from "../contants/constants";
import FullscreenErrorPopup from "../components/FullscreenErrorPopup";
import { showEmsg } from "../utils/ShowEmsg";
import { ToastContainer } from "react-toastify";
import Switch from "../components/Switch";
import { Image } from "lucide-react";
import Loader from "../components/Loader";
import SkeletonLoader from "../components/SkeletonLoader";
import { hideLoaderWithDelay } from "../utils/loaderUtils";
import { getPermissionCode, hasPermissionId } from "../utils/permissionUtils";
import { useCreateAccess } from "../hooks/useCreateAccess";

import { useDispatch, useSelector } from "react-redux";
import { fetchResource, updateStatusById } from "../store/slices/allDataSlice";

const Users = () => {
  const navigate = useNavigate();
  const [sSearchTerm, setSearchTerm] = useState("");
  const { t } = useTranslation();
  const { setTitle } = useTitle();
  const [sViewMode, setViewMode] = useState("table");
  const [nCurrentPage, setCurrentPage] = useState(1);
  const [sShowFilterDropdown, setShowFilterDropdown] = useState(false);
  const [bSubmitting, setSubmitting] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState(null);
  const [tableScrollTop, setTableScrollTop] = useState(0); // For floating header
  const [initialLoading, setInitialLoading] = useState(true); // Add initial loading state
  const itemsPerPage = ITEMS_PER_PAGE;

  const dispatch = useDispatch();

  const usersState = useSelector(
    (state) => state.allData.resources.users || {}
  );

  // Extract data with proper pagination handling
  const {
    data: usersData = [],
    total = 0,
    loading,
    error,
    pagination = {},
  } = usersState;

  // Use API pagination data when available, otherwise calculate locally
  const actualTotal = pagination.totalRecords || total;
  const nTotalPages =
    pagination.totalPages || Math.ceil((actualTotal || 0) / itemsPerPage);
  const currentPageSize = pagination.pageSize || itemsPerPage;

  const rolesState = useSelector(
    (state) => state.allData.resources.roles || {}
  );
  const { data: aRoles = [] } = rolesState;

  const storesState = useSelector(
    (state) => state.allData.resources.stores || {}
  );
  const { data: aStores = [] } = storesState;

  const defaultFilters = {
    role: [],
    status: "all",
    store: [],
  };
  const [oFilters, setFilters] = useState(defaultFilters);

  const permissionIdForDelete = getPermissionCode(
    "User Management",
    "Delete User"
  );

  // Permission check for Edit User
  const permissionIdForEdit = getPermissionCode(
    MODULES.USER,
    PERMISSIONS.EDIT_USER
  );
  const hasEditPermission = hasPermissionId(permissionIdForEdit);

  // Create access — permission + limit check
  const addUserPermissionCode = getPermissionCode(MODULES.USER, PERMISSIONS.ADD_USER);
  const { canCreate: canAddUser, disabledReason: addUserDisabledReason } =
    useCreateAccess(addUserPermissionCode, {
      noPermissionMsg: t("USERS.NO_CREATE_PERMISSION", "You do not have permission to add users."),
      limitReachedMsg: t("USERS.LIMIT_REACHED", "You have reached your user creation limit. Please upgrade your plan."),
    });

  // Hide body scrollbar when component mounts
  useEffect(() => {
    document.body.style.overflow = 'hidden';

    // Re-enable scrollbar when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Handle table scroll for floating header
  const handleTableScroll = useCallback((e) => {
    setTableScrollTop(e.target.scrollTop);
  }, []);

  // Helper function to check if user has profile image
  const hasProfileImage = (user) => {
    if (!user || !user.ProfileImageUrl) return false;

    // Handle empty string
    if (typeof user.ProfileImageUrl === "string" && user.ProfileImageUrl.trim() === "") {
      return false;
    }

    // Handle string format
    if (typeof user.ProfileImageUrl === "string") {
      return true;
    }

    // Handle array format
    if (Array.isArray(user.ProfileImageUrl)) {
      if (user.ProfileImageUrl.length === 0) {
        return false;
      }
      
      // Check if any image has valid documentUrl
      const validImage = user.ProfileImageUrl.find(img => 
        img && img.documentUrl && img.documentUrl.trim() !== ""
      );
      
      return !!validImage;
    }

    // Handle object format (single image object)
    if (typeof user.ProfileImageUrl === "object" && user.ProfileImageUrl.documentUrl) {
      return true;
    }

    return false;
  };

  // Helper function to get profile image URL
  const getProfileImageUrl = (user) => {
    // Handle null, undefined, or empty ProfileImageUrl
    if (!user || !user.ProfileImageUrl) return null;

    // Handle empty string
    if (typeof user.ProfileImageUrl === "string" && user.ProfileImageUrl.trim() === "") {
      return null;
    }

    // Handle string format
    if (typeof user.ProfileImageUrl === "string") {
      return user.ProfileImageUrl;
    }

    // Handle array format
    if (Array.isArray(user.ProfileImageUrl)) {
      if (user.ProfileImageUrl.length === 0) {
        return null;
      }
      
      // Get the first image with valid documentUrl
      const validImage = user.ProfileImageUrl.find(img => 
        img && img.documentUrl && img.documentUrl.trim() !== ""
      );
      
      if (validImage) {
        return validImage.documentUrl;
      }
      
      // Fallback to first image if no valid one found
      const firstImage = user.ProfileImageUrl[0];
      if (firstImage && firstImage.documentUrl) {
        return firstImage.documentUrl;
      }
    }

    // Handle object format (single image object)
    if (typeof user.ProfileImageUrl === "object" && user.ProfileImageUrl.documentUrl) {
      return user.ProfileImageUrl.documentUrl;
    }

    return null;
  };

  // Helper function to get stores as comma-separated string
  const getStoresString = (user) => {
    if (!user.Stores || !Array.isArray(user.Stores)) return "";
    return user.Stores.map((store) => store.StoreName).join(", ");
  };

  // Updated buildApiParams function to match Stores component
  const buildApiParams = useCallback(() => {
    const params = {
      pageNumber: nCurrentPage,
      pageSize: itemsPerPage,
      ...(sSearchTerm ? { searchText: sSearchTerm } : {}),
      ...(Array.isArray(oFilters.role) && oFilters.role.length > 0 ? { roleId: oFilters.role } : {}),
      ...(Array.isArray(oFilters.store) && oFilters.store.length > 0 ? { storeId: oFilters.store } : {}),
    };

    // only include IsActive when it's NOT "all" and NOT empty
    if (oFilters.status && oFilters.status !== "all") {
      params.IsActive = oFilters.status;
    }

    return params;
  }, [nCurrentPage, itemsPerPage, sSearchTerm, oFilters]);

  const handleClearFilters = () => {
    setFilters(defaultFilters);
    setCurrentPage(1);
  };

  const handleFilterChange = (e, filterName) => {
    setFilters({
      ...oFilters,
      [filterName]: e.target.value,
    });
    setCurrentPage(1);
  };

  const roleOptions = Array.isArray(aRoles)
    ? aRoles.map((role) => ({
      value: role.RoleID,
      label: role.RoleName,
    }))
    : [];

  const statusOptions = STATUS_OPTIONS.map((opt) => ({
    value: opt.value,
    label: t(opt.labelKey),
  }));

  const storeOptions = Array.isArray(aStores)
    ? aStores.map((store) => ({
      value: store.StoreID,
      label: store.StoreName,
    }))
    : [];

  const handleDropdownInputChange = (inputValue, filterName) => {
    if (filterName === "role") {
      dispatch(
        fetchResource({ key: "roles", params: { searchText: inputValue } })
      );
    }
    if (filterName === "store") {
      dispatch(
        fetchResource({ key: "stores", params: { searchText: inputValue } })
      );
    }
  };

  const additionalFilters = [
    {
      label: t("USERS.FILTERS.USER_ROLE"),
      name: "role",
      value: oFilters.role,
      options: roleOptions,
      placeholder: t("USERS.FILTERS.USER_ROLE"),
      searchable: true,
      multiple: true,
      searchPlaceholder: t("COMMON.SEARCH_ROLE") || "Search role",
      onInputChange: (inputValue) =>
        handleDropdownInputChange(inputValue, "role"),
    },
    {
      label: t("USERS.FILTERS.STATUS"),
      name: "status",
      value: oFilters.status,
      options: statusOptions,
    },
    {
      label: t("COMMON.STORE"),
      name: "store",
      value: oFilters.store,
      options: storeOptions,
      placeholder: t("USERS.FILTERS.STORE"),
      searchable: true,
      multiple: true,
      searchPlaceholder: t("COMMON.SEARCH_STORE") || "Search store",
      onInputChange: (inputValue) =>
        handleDropdownInputChange(inputValue, "store"),
    },
  ];

  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () =>
    setCurrentPage((prev) => Math.min(prev + 1, nTotalPages));
  const handlePageClick = (page) => setCurrentPage(page);

  const handleEdit = (userId) => {
    // Check permission before editing
    if (!hasEditPermission) {
      showEmsg(t("COMMON.NO_PERMISSION"), STATUS.ERROR);
      return;
    }
    navigate(`/editUser/${userId}`);
  };

  const [statusPopup, setStatusPopup] = useState({
    open: false,
    userId: null,
    newStatus: null,
  });

  const handleStatusChange = (userId, newStatus) => {
    setStatusPopup({ open: true, userId, newStatus });
  };

  const handleStatusConfirm = async () => {
    setSubmitting(true);
    const { userId, newStatus } = statusPopup;
    try {
      const result = await dispatch(
        updateStatusById({
          key: "users",
          id: userId,
          newStatus,
          apiRoute: USER_ACTIVE_STATUS,
          idField: "UserID",
        })
      ).unwrap();

      showEmsg(result.message, STATUS.SUCCESS);

      // Re-fetch users to update table data
      const params = buildApiParams();
      dispatch(
        fetchResource({
          key: "users",
          params: params,
        })
      );
    } catch (err) {
      showEmsg(err.message || "Failed to update status", STATUS.ERROR);
    } finally {
      setStatusPopup({ open: false, userId: null, newStatus: null });
      hideLoaderWithDelay(setSubmitting);
    }
  };

  const handleStatusPopupClose = () =>
    setStatusPopup({ open: false, userId: null, newStatus: null });

  // Debounced API call on filter changes
  useEffect(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const timer = setTimeout(() => {
      const params = buildApiParams();
      dispatch(
        fetchResource({
          key: "users",
          params: params,
        })
      );
    }, 300); // 300ms debounce delay

    setDebounceTimer(timer);

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [
    nCurrentPage,
    itemsPerPage,
    sSearchTerm,
    oFilters,
    dispatch,
    buildApiParams,
  ]);

  useEffect(() => {
    setTitle(t("USERS.TITLE"));
  }, [setTitle, t]);

  // Initial fetch for roles and stores
  useEffect(() => {
    dispatch(fetchResource({ key: "roles" }));
    dispatch(fetchResource({ key: "stores" }));
  }, [dispatch]);

  // Handle initial loading state
  useEffect(() => {
    // Show loader initially
    setInitialLoading(true);
    
    // Initial fetch for users
    const params = buildApiParams();
    dispatch(fetchResource({
      key: "users",
      params: params,
    }));
    
    // Hide initial loader after a minimum time to ensure it's visible
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 800); // Minimum 800ms to show loader
    
    return () => clearTimeout(timer);
  }, [dispatch]);

  // Update initial loading when actual loading completes
  useEffect(() => {
    if (!loading && initialLoading) {
      setInitialLoading(false);
    }
  }, [loading, initialLoading]);

  // Fetch roles and stores when filter dropdown is shown
  useEffect(() => {
    if (sShowFilterDropdown) {
      dispatch(fetchResource({ key: "roles" }));
      dispatch(fetchResource({ key: "stores" }));
    }
  }, [sShowFilterDropdown, dispatch]);

  return (
    <div
      className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-2 h-screen bg-gray-50 flex flex-col"
    >
      {bSubmitting && (
        <div className="global-loader-overlay">
          <Loader />
        </div>
      )}
      <ToastContainer />
      <Toolbar
        searchTerm={sSearchTerm}
        setSearchTerm={setSearchTerm}
        viewMode={sViewMode}
        setViewMode={setViewMode}
        showFilterDropdown={sShowFilterDropdown}
        setShowFilterDropdown={setShowFilterDropdown}
        additionalFilters={additionalFilters}
        handleFilterChange={handleFilterChange}
        searchPlaceholder={t("USERS.SEARCH_PLACEHOLDER")}
        onClearFilters={handleClearFilters}
        isBrowsePage={false}
        onCreate={() => navigate("/add-user")}
        createLabel={t("USERS.ADD_USER")}
        actionType="USER"
      />

      {/* table view */}
      {sViewMode === "table" ? (
        <div className="table-container-floating">
          <div
            className="table-wrapper-floating"
            onScroll={handleTableScroll}
          >
            <table className="table-base">
              {/* Single Floating Header - Used for All States */}
              <thead
                className={`table-head-floating ${tableScrollTop > 10 ? "table-head-floating-shadow" : ""
                  }`}
              >
                <tr>
                  <th className="table-head-cell-floating text-left">
                    {t("COMMON.USER")}
                  </th>
                  <th className="table-head-cell-floating hidden sm:table-cell text-center">
                    {t("USERS.TABLE.CONTACT")}
                  </th>
                  <th className="table-head-cell-floating text-center">
                    {t("COMMON.ROLE")}
                  </th>
                  <th className="table-head-cell-floating text-center">
                    {t("COMMON.STATUS")}
                  </th>
                  <th className="table-head-cell-floating hidden sm:table-cell text-center">
                    {t("COMMON.ACTIONS")}
                  </th>
                </tr>
              </thead>

              {/* Conditional Body */}
              <tbody className="table-body">
                {loading || initialLoading ? (
                  <SkeletonLoader type={SKELETON_TYPES.USER_TABLE} rows={8} />
                ) : usersData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      {t("USERS.NO_USERS_FOUND")}
                    </td>
                  </tr>
                ) : (
                  usersData.map((user) => (
                    <tr key={user.UserID} className="table-row">
                      {/* User */}
                      <td className="table-cell text-left">
                        <div className="flex items-center">
                          {hasProfileImage(user) ? (
                            <img
                              className="h-10 w-10 rounded-full object-cover"
                              src={getProfileImageUrl(user)}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                                if (e.target.nextSibling) {
                                  e.target.nextSibling.style.display = 'flex';
                                }
                              }}
                              alt=""
                            />
                          ) : null}
                          {!hasProfileImage(user) && (
                            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                              <Image className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                          {hasProfileImage(user) && (
                            <div 
                              className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center" 
                              style={{ display: 'none' }}
                              onError={(e) => {
                                e.target.style.display = 'flex';
                                if (e.target.previousSibling) {
                                  e.target.previousSibling.style.display = 'none';
                                }
                              }}
                            >
                              <Image className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                          <div className="ml-4">
                            <div className="table-cell-text">
                              <span className="ellipsis-text">
                                {user.FirstName} {user.LastName}
                              </span>
                            </div>
                            <div className="table-cell-subtext sm:hidden text-xs font-semibold text-gray-900">
                              {user.Email}
                            </div>
                            <div className="table-cell-subtext lg:hidden">
                              {getStoresString(user)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="table-cell hidden sm:table-cell text-center">
                        <div className="flex flex-col items-center space-y-1">
                          <div className="flex flex-col items-start space-y-1 w-full max-w-[150px]">
                            {" "}
                            {/* adjust max-w as needed */}
                            <div className="table-cell-subtext flex items-center justify-start">
                              <Mail className="h-4 w-4 mr-2 text-gray-500" />
                              <span className="ellipsis-text text-xs font-semibold text-gray-900">
                                {user.Email}
                              </span>
                            </div>
                            <div className="table-cell-subtext flex items-center justify-start">
                              <Phone className="h-4 w-4 mr-2" />
                              {user.CountryCode ? `${user.CountryCode} ${user.PhoneNumber}` : user.PhoneNumber}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="table-cell text-center">
                        <div className="flex items-center justify-center">
                          <Shield className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="status-badge bg-blue-100 text-blue-800">
                            <span className="ellipsis-text">{user.RoleName}</span>
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="table-cell text-center">
                        <Switch
                          checked={user.IsActive}
                          onChange={(e) =>
                            handleStatusChange(user.UserID, e.target.checked)
                          }
                        />
                      </td>

                      {/* Actions */}
                      <td className="table-cell text-center">
                        <ActionButtons
                          id={user.UserID}
                          viewLink={`/editUser/${user.UserID}`}
                          disableEdit={!hasEditPermission}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <div 
            className="h-full overflow-y-auto scrollbar-hide"
            style={{
              height: sShowFilterDropdown 
                ? 'calc(100vh - 280px)' 
                : 'calc(100vh - 180px)'
            }}
          >
            {loading || initialLoading ? (
              <div className="p-4">
                <SkeletonLoader type={SKELETON_TYPES.USER_GRID} rows={6} />
              </div>
            ) : usersData.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                {t("USERS.NO_USERS_FOUND")}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
                {usersData.map((user) => (
                  <div
                    key={user.UserID}
                    className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 flex flex-col gap-4 hover:shadow-xl transition-shadow duration-200"
                  >
                    <div className="flex items-center gap-4 pb-2 border-b border-gray-100">
                      <div className="flex-shrink-0 h-12 w-12 bg-gray-100 rounded-full overflow-hidden">
                        {hasProfileImage(user) ? (
                          <img
                            className="h-full w-full object-cover"
                            src={getProfileImageUrl(user)}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                              if (e.target.nextSibling) {
                                e.target.nextSibling.style.display = 'flex';
                              }
                            }}
                            alt=""
                          />
                        ) : null}
                        {!hasProfileImage(user) && (
                          <div className="h-full w-full bg-gray-100 flex items-center justify-center">
                            <Image className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                        {hasProfileImage(user) && (
                          <div 
                            className="h-full w-full bg-gray-100 flex items-center justify-center" 
                            style={{ display: 'none' }}
                            onError={(e) => {
                              e.target.style.display = 'flex';
                              if (e.target.previousSibling) {
                                e.target.previousSibling.style.display = 'none';
                              }
                            }}
                          >
                            <Image className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-title font-bold text-gray-900">
                          {user.FirstName} {user.LastName}
                        </div>
                        <div className="text-secondary flex items-center mt-1">
                          <Shield className="h-4 w-4 mr-1" />
                          {user.RoleName}
                        </div>
                      </div>
                    </div>

                    <div className="text-sm text-gray-600">
                      <div className="font-medium mb-1">{t("COMMON.STORE")}:</div>
                      <div className="truncate">{getStoresString(user)}</div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <span
                        className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${user.IsActive ? "status-active" : "status-inactive"
                          }`}
                      >
                        {user.IsActive ? t("COMMON.ACTIVE") : t("COMMON.INACTIVE")}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-gray-500 border-t border-gray-100 pt-2">
                      <div className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        <span
                          className="truncate max-w-[120px] block text-xs font-semibold text-gray-900"
                          title={user.Email}
                        >
                          {user.Email}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 sm:ml-4">
                        <Phone className="h-4 w-4" />
                        <span>{user.PhoneNumber}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 mt-2">
                      <ActionButtons
                        id={user.UserID}
                        viewLink={`/editUser/${user.UserID}`}
                        disableEdit={!hasEditPermission}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="sticky bottom-0 bg-white border-t border-gray-200 z-10">
        {loading || initialLoading ? (
          <SkeletonLoader type="pagination" />
        ) : (
          <Pagination
            currentPage={nCurrentPage}
            totalPages={nTotalPages}
            totalItems={actualTotal}
            itemsPerPage={currentPageSize}
            handlePrevPage={handlePrevPage}
            handleNextPage={handleNextPage}
            handlePageClick={handlePageClick}
          />
        )}
      </div>

      {statusPopup.open && (
        <FullscreenErrorPopup
          message={`Are you sure you want to set this user as ${statusPopup.newStatus ? t("COMMON.ACTIVE") : t("COMMON.INACTIVE")
            }?`}
          onClose={handleStatusPopupClose}
          onConfirm={handleStatusConfirm}
        />
      )}
    </div>
  );
};

export default Users;