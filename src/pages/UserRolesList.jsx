<<<<<<< Updated upstream
import { useState, useEffect, useCallback } from "react";
import { UserPlus, Shield } from "lucide-react";
import Toolbar from "../components/Toolbar";
import { useNavigate } from "react-router-dom";
import Pagination from "../components/Pagination";
import ActionButtons from "../components/ActionButtons";
import NotFoundMessage from "../components/NotFoundMessage";
import { useTranslation } from "react-i18next";
import { useTitle } from "../context/TitleContext";
import { SKELETON_TYPES } from "../contants/constants";
import Switch from "../components/Switch";
import FullscreenErrorPopup from "../components/FullscreenErrorPopup";
import { UPDATE_ROLE_STATUS } from "../contants/apiRoutes";
import { showEmsg } from "../utils/ShowEmsg";
import { ToastContainer } from "react-toastify";
import {
  ITEMS_PER_PAGE,
  STATUS,
  STATUS_OPTIONS,
  FILTERS,
  PERMISSIONS,
  FILTER_VALUES,
} from "../contants/constants.jsx";
import Loader from "../components/Loader";
import SkeletonLoader from "../components/SkeletonLoader";
import { hideLoaderWithDelay } from "../utils/loaderUtils";
import { getPermissionCode, hasPermissionId } from "../utils/permissionUtils";
import { useCreateAccess } from "../hooks/useCreateAccess";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchResource,
  updateStatusById,
} from "../store/slices/allDataSlice.jsx";

const UserRolesList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { setTitle } = useTitle();

  // Redux selectors
  const {
    data: contextRoles = [],
    loading: bLoading,
    error: nError,
    total,
  } = useSelector(
    (state) =>
      state.allData.resources.roles || {
        data: [],
        loading: false,
        error: null,
        total: 0,
      }
  );

  const [sSearchTerm, setSearchTerm] = useState("");
  const [sViewMode, setViewMode] = useState("table");
  const [nCurrentPage, setCurrentPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState(FILTER_VALUES.ALL);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [tableScrollTop, setTableScrollTop] = useState(0); 
  const itemsPerPage = ITEMS_PER_PAGE;
  const nTotalPages = Math.ceil(total / itemsPerPage);
  const [bSubmitting, setSubmitting] = useState(false);
  const [statusPopup, setStatusPopup] = useState({
    open: false,
    roleId: null,
    newStatus: null,
  });
  const [roles, setRoles] = useState([]);
  const [bFilterLoading, setFilterLoading] = useState(false);
  const[initialLoading, setInitialLoading] = useState(true);

  const permissionIdForEdit = getPermissionCode(
    PERMISSIONS.ROLE_MANAGEMENT,
    PERMISSIONS.EDIT_ROLE
  );
  const hasEditPermission = hasPermissionId(permissionIdForEdit);

  // Create access — permission + limit check
  const addRolePermissionCode = getPermissionCode(PERMISSIONS.ROLE_MANAGEMENT, PERMISSIONS.ADD_ROLE);
  const { canCreate: canAddRole, disabledReason: addRoleDisabledReason } =
    useCreateAccess(addRolePermissionCode, {
      noPermissionMsg: t("ROLES.NO_CREATE_PERMISSION", "You do not have permission to add roles."),
      limitReachedMsg: t("ROLES.LIMIT_REACHED", "You have reached your role creation limit."),
    });

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleTableScroll = useCallback((e) => {
    setTableScrollTop(e.target.scrollTop);
  }, []);

  const statusOptions = STATUS_OPTIONS.map((opt) => ({
    value: opt.value,
    label: t(opt.labelKey),
  }));

  const isAdminRole = (role) => {
    const roleName = (role.rolename || role.RoleName || "")
      .toLowerCase()
      .trim();
    return roleName === "admin";
  };

  const handleFilterChange = (e, filterName) => {
    setFilterLoading(true);
    if (filterName === FILTERS.STATUS) {
      setSelectedStatus(e.target.value);
      setCurrentPage(1);
    }
  };

  const additionalFilters = [
    {
      label: t("COMMON.STATUS"),
      name: FILTERS.STATUS,
      value: selectedStatus,
      options: statusOptions,
    },
  ];

  useEffect(() => {
    // Show loader initially
    setInitialLoading(true);
    
    // Initial fetch for roles
    const filterParams = {
      pageNumber: nCurrentPage,
      pageSize: itemsPerPage,
      searchText: sSearchTerm,
    };

    if (selectedStatus && selectedStatus !== "all") {
      filterParams.IsActive =
        selectedStatus === "true" || selectedStatus === true;
    }

    const fetchData = async () => {
      try {
        await dispatch(fetchResource({ key: "roles", params: filterParams }));
      } finally {
        setFilterLoading(false);
      }
    };

    fetchData();
    
    // Hide initial loader after a minimum time to ensure it's visible
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 800); // Minimum 800ms to show loader
    
    return () => clearTimeout(timer);
  }, [dispatch]);

  // Update initial loading when actual loading completes
  useEffect(() => {
    if (!bLoading && initialLoading) {
      setInitialLoading(false);
    }
  }, [bLoading, initialLoading]);

  useEffect(() => {
    const filterParams = {
      pageNumber: nCurrentPage,
      pageSize: itemsPerPage,
      searchText: sSearchTerm,
    };

    if (selectedStatus && selectedStatus !== FILTER_VALUES.ALL) {
      filterParams.IsActive =
        selectedStatus === "true" || selectedStatus === true;
    }

    const fetchData = async () => {
      try {
        await dispatch(fetchResource({ key: "roles", params: filterParams }));
      } finally {
        setFilterLoading(false);
      }
    };

    fetchData();
  }, [nCurrentPage, sSearchTerm, selectedStatus, dispatch, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [sSearchTerm]);

  useEffect(() => {
    setTitle(t("USER_ROLES_LIST.TITLE"));
    return () => setTitle("");
  }, [setTitle, t]);

  useEffect(() => {
    setRoles(contextRoles);
  }, [contextRoles]);

  const paginatedRoles = roles || [];

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, nTotalPages));
  };

  const handlePageClick = (page) => {
    setCurrentPage(page);
  };


  const handleEdit = (roleId, roleName, status) => {
    if (!hasEditPermission) {
      showEmsg(t("COMMON.NO_EDIT_PERMISSION"), STATUS.ERROR);
      return;
    }
    if (isAdminRole({ RoleName: roleName })) {
      showEmsg(t("USER_ROLES_LIST.ADMIN_EDIT_DISABLED"), STATUS.ERROR);
      return;
    }
    navigate(`/edit-UserRole/${roleId}`, {
      state: {
        roleId,
        roleName,
        status,
      },
    });
  };

  const handleStatusChange = (roleId, isActive, roleName) => {
    if (isAdminRole({ RoleName: roleName })) {
      showEmsg(t("USER_ROLES_LIST.ADMIN_STATUS_DISABLED"), STATUS.ERROR);
      return;
    }
    setStatusPopup({ open: true, roleId, newStatus: !isActive });
  };

  const handleStatusConfirm = async () => {
    setSubmitting(true);
    const { roleId, newStatus } = statusPopup;

    try {
      const result = await dispatch(
        updateStatusById({
          key: "roles",
          id: roleId,
          newStatus,
          apiRoute: UPDATE_ROLE_STATUS,
          idField: "RoleID",
        })
      ).unwrap();

      showEmsg(result.message, STATUS.SUCCESS);

      const filterParams = {
        pageNumber: nCurrentPage,
        pageSize: itemsPerPage,
        searchText: sSearchTerm,
      };
      if (selectedStatus !== FILTER_VALUES.ALL) {
        filterParams.IsActive =
          selectedStatus === "true" || selectedStatus === true;
      }

      await dispatch(fetchResource({ key: "roles", params: filterParams }));
    } catch (err) {
      showEmsg(err.error || t("COMMON.API_ERROR"), STATUS.ERROR);
    } finally {
      setStatusPopup({ open: false, roleId: null, newStatus: null });
      hideLoaderWithDelay(setSubmitting);
    }
  };

  const handleStatusPopupClose = () => {
    setStatusPopup({ open: false, roleId: null, newStatus: null });
  };

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-2 min-h-screen bg-gray-50">
      
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
        showFilterDropdown={showFilterDropdown}
        setShowFilterDropdown={setShowFilterDropdown}
        additionalFilters={additionalFilters}
        handleFilterChange={handleFilterChange}
        searchPlaceholder={t("USER_ROLES_LIST.SEARCH_PLACEHOLDER")}
        isBrowsePage={false}
        onCreate={() => { if (canAddRole) navigate("/addUserRole"); }}
        createLabel={t("USER_ROLES_LIST.ADD_ROLE")}
        disableCreate={!canAddRole}
        disableCreateReason={addRoleDisabledReason}
        actionType="ROLE"
      />
      {sViewMode === "table" ? (
        <div className="table-container-floating">
          <div
            className="table-wrapper-floating"
            onScroll={handleTableScroll}
          >
            <table className="table-base">
              <thead
                className={`table-head-floating ${
                  tableScrollTop > 10 ? "table-head-floating-shadow" : ""
                }`}
              >
                <tr>
                  <th scope="col" className="table-head-cell-floating text-left align-middle">
                    {t("USER_ROLES_LIST.TABLE.ROLE_NAME")}
                  </th>
                  <th scope="col" className="table-head-cell-floating hidden sm:table-cell text-center align-middle">
                    {t("COMMON.STATUS")}
                  </th>
                  <th scope="col" className="table-head-cell-floating text-center align-middle">
                    {t("COMMON.ACTIONS")}
                  </th>
                </tr>
              </thead>
              <tbody className="table-body">
                {bLoading || bFilterLoading ? (
                  <SkeletonLoader type={SKELETON_TYPES.USER_ROLES_TABLE} rows={6} />
                ) : nError ? (
                  <tr>
                    <td colSpan={3} className="text-center py-4 text-muted">
                      {t("USER_ROLES_LIST.NO_ROLES_FOUND")}
                    </td>
                  </tr>
                ) : paginatedRoles.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-4 text-muted">
                      {t("USER_ROLES_LIST.NO_ROLES_FOUND")}
                    </td>
                  </tr>
                ) : (
                  paginatedRoles.map((role) => {
                    const roleName = role.rolename || role.RoleName || "";
                    const isAdmin = isAdminRole(role);

                    return (
                      <tr key={role.roleid || role.RoleID} className="table-row">
                        <td className="table-cell text-left align-middle">
                          <div className="flex justify-start items-center">
                            <Shield className="h-4 w-4 mr-2 text-gray-400" />
                            <div className="flex items-left space-x-2">
                              <span
                                className={`status-badge ${
                                  isAdmin
                                    ? "bg-red-100 text-red-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                <span className="ellipsis-text">
                                  {roleName}
                                </span>
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="table-cell text-center align-middle">
                          {isAdmin ? (
                            <div className="flex justify-center items-center space-x-2">
                              <span className="w-4 h-4 bg-green-500 rounded-full"></span>
                              <span className="text-sm text-gray-500">
                                {t("LOCKED")}
                              </span>
                            </div>
                          ) : (
                            <div className="flex justify-center items-center">
                              <Switch
                                checked={role.IsActive === true}
                                onChange={() =>
                                  handleStatusChange(
                                    role.roleid || role.RoleID,
                                    role.IsActive === true,
                                    roleName
                                  )
                                }
                                disabled={isAdmin}
                              />
                            </div>
                          )}
                        </td>

                        <td className="table-cell text-center align-middle">
                          <div className="flex justify-center items-center">
                            <ActionButtons
                              id={role.roleid || role.RoleID}
                              onEdit={() =>
                              handleEdit(role.RoleID, roleName, role.IsActive)
                              }
                              disableEdit={isAdminRole({ RoleName: roleName }) || !hasEditPermission}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
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
              height: showFilterDropdown 
                ? 'calc(100vh - 280px)' 
                : 'calc(100vh - 180px)'
            }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
          {roles.map((role) => {
            const roleName = role.rolename || role.RoleName || "";
            const isAdmin = isAdminRole(role);

            return (
              <div
                key={role.roleid || role.RoleID}
                className={`bg-white shadow-md rounded-lg p-6 flex flex-col transition-all duration-200 ${
                  isAdmin ? "border-l-4 border-red-500" : ""
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <Shield
                        className={`h-4 w-4 mr-2 ${
                          isAdmin ? "text-red-500" : "text-gray-400"
                        }`}
                      />
                      <span
                        className={`status-badge ${
                          isAdmin
                            ? "bg-red-100 text-red-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {roleName}
                      </span>
                    </div>
                    <p className="text-secondary text-sm">
                      {t("USER_ROLES_LIST.TABLE.ROLE_ID")}:{" "}
                      {role.roleid || role.RoleID}
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span
                      className={`px-3 py-1 text-sm font-medium rounded-full ${
                        role.IsActive === true
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {role.IsActive === true
                        ? t("COMMON.ACTIVE")
                        : t("COMMON.INACTIVE")}
                    </span>
                    {isAdmin && (
                      <span className="text-xs text-red-600 mt-1 font-medium">
                        {t("LOCKED")}
                      </span>
                    )}
                  </div>
                </div>
                <ActionButtons
                  id={role.roleid || role.RoleID}
                  onEdit={() =>
                    handleEdit(role.RoleID, roleName, role.IsActive)
                  }
                  disableEdit={isAdmin || !hasEditPermission}
                />
              </div>
            );
          })}
          {roles.length === 0 && (
            <NotFoundMessage message={t("USER_ROLES_LIST.NO_ROLES_FOUND")} />
          )}
            </div>
          </div>
        </div>
      )}
      {bLoading || bFilterLoading ? (
        <SkeletonLoader type="pagination" />
      ) : (
        <Pagination
          currentPage={nCurrentPage}
          totalPages={nTotalPages}
          totalItems={total}
          itemsPerPage={itemsPerPage}
          handlePrevPage={handlePrevPage}
          handleNextPage={handleNextPage}
          handlePageClick={handlePageClick}
        />
      )}
      {statusPopup.open && (
        <FullscreenErrorPopup
          message={t("USER_ROLES_LIST.STATUS_CONFIRM_MESSAGE", {
            status: statusPopup.newStatus
              ? t("COMMON.ACTIVE")
              : t("COMMON.INACTIVE"),
          })}
          onClose={handleStatusPopupClose}
          onConfirm={handleStatusConfirm}
        />
      )}
    </div>
  );
};

export default UserRolesList; 

=======
import { useState, useEffect, useCallback } from "react";
import { UserPlus, Shield } from "lucide-react";
import Toolbar from "../components/Toolbar";
import { useNavigate } from "react-router-dom";
import Pagination from "../components/Pagination";
import ActionButtons from "../components/ActionButtons";
import NotFoundMessage from "../components/NotFoundMessage";
import { useTranslation } from "react-i18next";
import { useTitle } from "../context/TitleContext";
import { SKELETON_TYPES } from "../contants/constants";
import Switch from "../components/Switch";
import FullscreenErrorPopup from "../components/FullscreenErrorPopup";
import { UPDATE_ROLE_STATUS } from "../contants/apiRoutes";
import { showEmsg } from "../utils/ShowEmsg";
import { ToastContainer } from "react-toastify";
import {
  ITEMS_PER_PAGE,
  STATUS,
  STATUS_OPTIONS,
  FILTERS,
  PERMISSIONS,
} from "../contants/constants.jsx";
import Loader from "../components/Loader";
import SkeletonLoader from "../components/SkeletonLoader";
import EmptyState from "../components/EmptyState";
import { hideLoaderWithDelay } from "../utils/loaderUtils";
import { getPermissionCode, hasPermissionId } from "../utils/permissionUtils";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchResource,
  updateStatusById,
} from "../store/slices/allDataSlice.jsx";

const UserRolesList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { setTitle } = useTitle();

  // Redux selectors
  const {
    data: contextRoles = [],
    loading: bLoading,
    error: nError,
    total,
  } = useSelector(
    (state) =>
      state.allData.resources.roles || {
        data: [],
        loading: false,
        error: null,
        total: 0,
      }
  );

  const [sSearchTerm, setSearchTerm] = useState("");
  const [initialLoading, setInitialLoading] = useState(true); // Add initial loading state
  const [sViewMode, setViewMode] = useState("table");
  const [nCurrentPage, setCurrentPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [tableScrollTop, setTableScrollTop] = useState(0); 
  const itemsPerPage = ITEMS_PER_PAGE;
  const nTotalPages = Math.ceil(total / itemsPerPage);
  const [bSubmitting, setSubmitting] = useState(false);
  const [statusPopup, setStatusPopup] = useState({
    open: false,
    roleId: null,
    newStatus: null,
  });
  const [roles, setRoles] = useState([]);
  const [bFilterLoading, setFilterLoading] = useState(false);


  const permissionIdForEdit = getPermissionCode(
    PERMISSIONS.ROLE_MANAGEMENT,
    PERMISSIONS.EDIT_ROLE
  );
  const hasEditPermission = hasPermissionId(permissionIdForEdit);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleTableScroll = useCallback((e) => {
    setTableScrollTop(e.target.scrollTop);
  }, []);

  const statusOptions = STATUS_OPTIONS.map((opt) => ({
    value: opt.value,
    label: t(opt.labelKey),
  }));

  const isAdminRole = (role) => {
    const roleName = (role.rolename || role.RoleName || "")
      .toLowerCase()
      .trim();
    return roleName === "admin";
  };

  const handleFilterChange = (e, filterName) => {
    setFilterLoading(true);
    if (filterName === FILTERS.STATUS) {
      setSelectedStatus(e.target.value);
      setCurrentPage(1);
    }
  };

  const additionalFilters = [
    {
      label: t("COMMON.STATUS"),
      name: FILTERS.STATUS,
      value: selectedStatus,
      options: statusOptions,
    },
  ];

  useEffect(() => {
    // Show loader initially
    setInitialLoading(true);
    
    // Initial fetch for roles
    const filterParams = {
      pageNumber: nCurrentPage,
      pageSize: itemsPerPage,
      searchText: sSearchTerm,
    };

    if (selectedStatus && selectedStatus !== "all") {
      filterParams.IsActive =
        selectedStatus === "true" || selectedStatus === true;
    }

    const fetchData = async () => {
      try {
        await dispatch(fetchResource({ key: "roles", params: filterParams }));
      } finally {
        setFilterLoading(false);
      }
    };

    fetchData();
    
    // Hide initial loader after a minimum time to ensure it's visible
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 800); // Minimum 800ms to show loader
    
    return () => clearTimeout(timer);
  }, [dispatch]);

  // Update initial loading when actual loading completes
  useEffect(() => {
    if (!bLoading && initialLoading) {
      setInitialLoading(false);
    }
  }, [bLoading, initialLoading]);

  useEffect(() => {
    const filterParams = {
      pageNumber: nCurrentPage,
      pageSize: itemsPerPage,
      searchText: sSearchTerm,
    };

    if (selectedStatus && selectedStatus !== "all") {
      filterParams.IsActive =
        selectedStatus === "true" || selectedStatus === true;
    }

    const fetchData = async () => {
      try {
        await dispatch(fetchResource({ key: "roles", params: filterParams }));
      } finally {
        setFilterLoading(false);
      }
    };

    fetchData();
  }, [nCurrentPage, sSearchTerm, selectedStatus, dispatch, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [sSearchTerm]);

  useEffect(() => {
    setTitle(t("USER_ROLES_LIST.TITLE"));
    return () => setTitle("");
  }, [setTitle, t]);

  useEffect(() => {
    setRoles(contextRoles);
  }, [contextRoles]);

  const paginatedRoles = roles || [];

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, nTotalPages));
  };

  const handlePageClick = (page) => {
    setCurrentPage(page);
  };


  const handleEdit = (roleId, roleName, status) => {
    if (!hasEditPermission) {
      showEmsg(t("COMMON.NO_EDIT_PERMISSION"), STATUS.ERROR);
      return;
    }
    if (isAdminRole({ RoleName: roleName })) {
      showEmsg(t("USER_ROLES_LIST.ADMIN_EDIT_DISABLED"), STATUS.ERROR);
      return;
    }
    navigate(`/edit-UserRole/${roleId}`, {
      state: {
        roleId,
        roleName,
        status,
      },
    });
  };

  const handleStatusChange = (roleId, isActive, roleName) => {
    if (isAdminRole({ RoleName: roleName })) {
      showEmsg(t("USER_ROLES_LIST.ADMIN_STATUS_DISABLED"), STATUS.ERROR);
      return;
    }
    setStatusPopup({ open: true, roleId, newStatus: !isActive });
  };

  const handleStatusConfirm = async () => {
    setSubmitting(true);
    const { roleId, newStatus } = statusPopup;

    try {
      const result = await dispatch(
        updateStatusById({
          key: "roles",
          id: roleId,
          newStatus,
          apiRoute: UPDATE_ROLE_STATUS,
          idField: "RoleID",
        })
      ).unwrap();

      showEmsg(result.message, STATUS.SUCCESS);

      const filterParams = {
        pageNumber: nCurrentPage,
        pageSize: itemsPerPage,
        searchText: sSearchTerm,
      };
      if (selectedStatus !== "all") {
        filterParams.IsActive =
          selectedStatus === "true" || selectedStatus === true;
      }

      await dispatch(fetchResource({ key: "roles", params: filterParams }));
    } catch (err) {
      showEmsg(err.error || t("COMMON.API_ERROR"), STATUS.ERROR);
    } finally {
      setStatusPopup({ open: false, roleId: null, newStatus: null });
      hideLoaderWithDelay(setSubmitting);
    }
  };

  const handleStatusPopupClose = () => {
    setStatusPopup({ open: false, roleId: null, newStatus: null });
  };

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-2 min-h-screen bg-gray-50">
      
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
        showFilterDropdown={showFilterDropdown}
        setShowFilterDropdown={setShowFilterDropdown}
        additionalFilters={additionalFilters}
        handleFilterChange={handleFilterChange}
        searchPlaceholder={t("USER_ROLES_LIST.SEARCH_PLACEHOLDER")}
        isBrowsePage={false}
        onCreate={() => navigate("/addUserRole")}
        createLabel={t("USER_ROLES_LIST.ADD_ROLE")}
      />
      {sViewMode === "table" ? (
        <div className="table-container-floating">
          <div
            className="table-wrapper-floating"
            onScroll={handleTableScroll}
          >
            <table className="table-base">
              <thead
                className={`table-head-floating ${
                  tableScrollTop > 10 ? "table-head-floating-shadow" : ""
                }`}
              >
                <tr>
                  <th scope="col" className="table-head-cell-floating text-left align-middle">
                    {t("USER_ROLES_LIST.TABLE.ROLE_NAME")}
                  </th>
                  <th scope="col" className="table-head-cell-floating hidden sm:table-cell text-center align-middle">
                    {t("COMMON.STATUS")}
                  </th>
                  <th scope="col" className="table-head-cell-floating text-center align-middle">
                    {t("COMMON.ACTIONS")}
                  </th>
                </tr>
              </thead>
              <tbody className="table-body">
                {initialLoading || bLoading || bFilterLoading ? (
                  <SkeletonLoader type={SKELETON_TYPES.USER_ROLES_TABLE} rows={6} />
                ) : nError ? (
                  <tr>
                    <td colSpan={3}>
                      <EmptyState type="error" title={t("USER_ROLES_LIST.NO_ROLES_FOUND")} compact />
                    </td>
                  </tr>
                ) : paginatedRoles.length === 0 ? (
                  <tr>
                    <td colSpan={3}>
                      <EmptyState type="roles" title={t("USER_ROLES_LIST.NO_ROLES_FOUND")} description="Try adjusting your search or filters." compact />
                    </td>
                  </tr>
                ) : (
                  paginatedRoles.map((role) => {
                    const roleName = role.rolename || role.RoleName || "";
                    const isAdmin = isAdminRole(role);

                    return (
                      <tr key={role.roleid || role.RoleID} className="table-row">
                        <td className="table-cell text-left align-middle">
                          <div className="flex justify-start items-center">
                            <Shield className="h-4 w-4 mr-2 text-gray-400" />
                            <div className="flex items-left space-x-2">
                              <span
                                className={`status-badge ${
                                  isAdmin
                                    ? "bg-red-100 text-red-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                <span className="ellipsis-text">
                                  {roleName}
                                </span>
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="table-cell text-center align-middle">
                          {isAdmin ? (
                            <div className="flex justify-center items-center space-x-2">
                              <span className="w-4 h-4 bg-green-500 rounded-full"></span>
                              <span className="text-sm text-gray-500">
                                {t("LOCKED")}
                              </span>
                            </div>
                          ) : (
                            <div className="flex justify-center items-center">
                              <Switch
                                checked={role.IsActive === true}
                                onChange={() =>
                                  handleStatusChange(
                                    role.roleid || role.RoleID,
                                    role.IsActive === true,
                                    roleName
                                  )
                                }
                                disabled={isAdmin}
                              />
                            </div>
                          )}
                        </td>

                        <td className="table-cell text-center align-middle">
                          <div className="flex justify-center items-center">
                            <ActionButtons
                              id={role.roleid || role.RoleID}
                              onEdit={() =>
                              handleEdit(role.RoleID, roleName, role.IsActive)
                              }
                              disableEdit={isAdminRole({ RoleName: roleName }) || !hasEditPermission}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
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
              height: showFilterDropdown 
                ? 'calc(100vh - 280px)' 
                : 'calc(100vh - 180px)'
            }}
          >
            {initialLoading || bLoading ? (
              <div className="p-4">
                <SkeletonLoader type={SKELETON_TYPES.USER_ROLES_GRID} rows={6} />
              </div>
            ) : roles.length === 0 ? (
              <EmptyState type="roles" title={t("USER_ROLES_LIST.NO_ROLES_FOUND")} description="Try adjusting your search or filters." compact />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
                {roles.map((role) => {
            const roleName = role.rolename || role.RoleName || "";
            const isAdmin = isAdminRole(role);

            return (
              <div
                key={role.roleid || role.RoleID}
                className={`bg-white shadow-md rounded-lg p-6 flex flex-col transition-all duration-200 ${
                  isAdmin ? "border-l-4 border-red-500" : ""
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <Shield
                        className={`h-4 w-4 mr-2 ${
                          isAdmin ? "text-red-500" : "text-gray-400"
                        }`}
                      />
                      <span
                        className={`status-badge ${
                          isAdmin
                            ? "bg-red-100 text-red-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {roleName}
                      </span>
                    </div>
                    <p className="text-secondary text-sm">
                      {t("USER_ROLES_LIST.TABLE.ROLE_ID")}:{" "}
                      {role.roleid || role.RoleID}
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span
                      className={`px-3 py-1 text-sm font-medium rounded-full ${
                        role.IsActive === true
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {role.IsActive === true
                        ? t("COMMON.ACTIVE")
                        : t("COMMON.INACTIVE")}
                    </span>
                    {isAdmin && (
                      <span className="text-xs text-red-600 mt-1 font-medium">
                        {t("LOCKED")}
                      </span>
                    )}
                  </div>
                </div>
                <ActionButtons
                  id={role.roleid || role.RoleID}
                  onEdit={() =>
                    handleEdit(role.RoleID, roleName, role.IsActive)
                  }
                  disableEdit={isAdmin || !hasEditPermission}
                />
              </div>
            );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      {initialLoading || bLoading || bFilterLoading ? (
        <SkeletonLoader type="pagination" />
      ) : (
        <Pagination
          currentPage={nCurrentPage}
          totalPages={nTotalPages}
          totalItems={total}
          itemsPerPage={itemsPerPage}
          handlePrevPage={handlePrevPage}
          handleNextPage={handleNextPage}
          handlePageClick={handlePageClick}
        />
      )}
      {statusPopup.open && (
        <FullscreenErrorPopup
          message={t("USER_ROLES_LIST.STATUS_CONFIRM_MESSAGE", {
            status: statusPopup.newStatus
              ? t("COMMON.ACTIVE")
              : t("COMMON.INACTIVE"),
          })}
          onClose={handleStatusPopupClose}
          onConfirm={handleStatusConfirm}
        />
      )}
    </div>
  );
};

export default UserRolesList; 

>>>>>>> Stashed changes
