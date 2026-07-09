
﻿import React, { useState, useEffect, useCallback } from "react";
import { MapPin, Phone, Mail, Building } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Toolbar from "../components/Toolbar";
import Pagination from "../components/Pagination";
import ActionButtons from "../components/ActionButtons";
import { useTranslation } from "react-i18next";
import { useTitle } from "../context/TitleContext";
import { SKELETON_TYPES } from "../contants/constants";
import Switch from "../components/Switch";
import { UPDATE_STORE_STATUS, DELETE_STORE } from "../contants/apiRoutes";
import { showEmsg } from "../utils/ShowEmsg";
import FullscreenErrorPopup from "../components/FullscreenErrorPopup";
import EmptyState from "../components/EmptyState";
import { ToastContainer } from "react-toastify";
import { ITEMS_PER_PAGE, STATUS, STATUS_OPTIONS, MODULES, PERMISSIONS, FILTER_VALUES } from "../contants/constants";
import { apiDelete } from "../utils/ApiUtils";
import Loader from "../components/Loader";
import SkeletonLoader from "../components/SkeletonLoader";
import { hideLoaderWithDelay } from "../utils/loaderUtils";
import { getPermissionCode, hasPermissionId } from "../utils/permissionUtils";
import { useCreateAccess } from "../hooks/useCreateAccess";
import { fetchResource, updateStatusById } from "../store/slices/allDataSlice";
import { exportStoreReport } from "../store/slices/exportSlice";

const Stores = () => {
  const { t } = useTranslation();
  const { setBackButton, setTitle } = useTitle();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const storesData = useSelector(
    (state) =>
      state.allData.resources.stores || { data: [], total: 0, loading: false }
  );

  const aStores = storesData.data || [];

  // FIX: Updated pagination extraction to match actual API response structure
  const totalItems = storesData.totalRecords || storesData.total || 0;
  const currentPageFromAPI = storesData.currentPage || 1;
  const totalPagesFromAPI =
    storesData.totalPages || Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;

  const storesLoading = storesData.loading;

  const [sSearchTerm, setSearchTerm] = useState("");
  const [bShowFilterDropdown, setShowFilterDropdown] = useState(false);
  const defaultFilters = {
    status: FILTER_VALUES.ALL,
    startDate: "",
    endDate: "",
  };
  const [oFilters, setFilters] = useState(defaultFilters);
  const [bSubmitting, setSubmitting] = useState(false);
  const [bFilterLoading, setFilterLoading] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [tableScrollTop, setTableScrollTop] = useState(0); // For floating header

  const permissionIdForDelete = getPermissionCode(
    "Store Management",
    "Delete User"
  );
  const hasDeletePermission = hasPermissionId(permissionIdForDelete);

  // Permission check for Edit Store
  const permissionIdForEdit = getPermissionCode(
    "Store Management",
    "Edit Store"
  );
  const hasEditPermission = hasPermissionId(permissionIdForEdit);

  // Permission check for Generate Store Report
  const permissionIdForExport = getPermissionCode(
    MODULES.STORE,
    PERMISSIONS.GENERATE_STORE_REPORT
  );
  const hasExportPermission = hasPermissionId(permissionIdForExport);

  // Create access â€” permission + limit check
  const addStorePermissionCode = getPermissionCode(MODULES.STORE, PERMISSIONS.ADD_STORE);
  const { canCreate: canAddStore, disabledReason: addStoreDisabledReason } =
    useCreateAccess(addStorePermissionCode, {
      noPermissionMsg: t("STORES.NO_CREATE_PERMISSION"),
      limitReachedMsg: t("STORES.LIMIT_REACHED", "You have reached your store creation limit. Please upgrade your plan."),
    });

  const statusOptions = STATUS_OPTIONS.map((opt) => ({
    value: opt.value,
    label: t(opt.labelKey),
  }));

  const aAdditionalFilters = [
    {
      label: t("COMMON.STATUS"),
      name: "status",
      value: oFilters.status,
      options: statusOptions,
    },
  ];

  const [statusPopup, setStatusPopup] = useState({
    open: false,
    storeId: null,
    newStatus: null,
  });

  const [deletePopup, setDeletePopup] = useState({
    open: false,
    storeId: null,
  });

  const itemsPerPage = ITEMS_PER_PAGE;

  // FIX: Use pagination data from API or calculate fallback
  const totalPages = totalPagesFromAPI;
  const [viewMode, setViewMode] = useState("table");

  // FIX: Sync currentPage with API response or use local state
  const [currentPage, setCurrentPage] = useState(currentPageFromAPI);

  // Hide body scrollbar when component mounts
  useEffect(() => {
    document.body.style.overflow = 'hidden';

    // Re-enable scrollbar when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleEdit = (StoreID) => {
    // Check permission before editing
    if (!hasEditPermission) {
      showEmsg(t("COMMON.NO_PERMISSION"), STATUS.ERROR);
      return;
    }
    navigate(`/editStore/${StoreID}`);
  };

  const handleDelete = (storeId) => {
    if (!hasDeletePermission) {
      showEmsg(t("COMMON.NO_DELETE_PERMISSION"), STATUS.ERROR);
      return;
    }
    setDeletePopup({ open: true, storeId });
  };

  const handleClearFilters = () => {
    setFilters(defaultFilters);
    setCurrentPage(1);
  };

  const handleFilterChange = (e, filterName) => {
    if (initialLoadComplete) {
      setFilterLoading(true);
    }

    if (filterName === "dateRange") {
      const dateValue = e.target.value;
      setFilters((prevFilters) => ({
        ...prevFilters,
        startDate: dateValue?.startDate || "",
        endDate: dateValue?.endDate || "",
      }));
    } else {
      const { name, value } = e.target;
      setFilters((prev) => ({
        ...prev,
        [filterName || name]: value,
      }));
    }
    setCurrentPage(1);
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handlePageClick = (page) => {
    setCurrentPage(page);
  };

  const handleStatusChange = (storeId, isActive) => {
    setStatusPopup({ open: true, storeId, newStatus: !isActive });
  };

  const handleStatusConfirm = async () => {
    setSubmitting(true);
    const { storeId, newStatus } = statusPopup;

    try {
      const result = await dispatch(
        updateStatusById({
          key: "stores",
          id: storeId,
          newStatus,
          apiRoute: UPDATE_STORE_STATUS,
          idField: "StoreID",
        })
      ).unwrap();

      showEmsg(result.message, STATUS.SUCCESS);
      setStatusPopup({ open: false, storeId: null, newStatus: null });

      const isActiveFilter =
        oFilters.status === FILTER_VALUES.ALL ? undefined : oFilters.status === "true";

      // Refresh the stores list after status update
      dispatch(
        fetchResource({
          key: "stores",
          params: {
            pageNumber: currentPage,
            pageSize: itemsPerPage,
            searchText: sSearchTerm,
            IsActive: isActiveFilter,
          },
        })
      );
    } catch (err) {
      showEmsg(err.error || t("COMMON.API_ERROR"), STATUS.ERROR);
    } finally {
      hideLoaderWithDelay(setSubmitting);
    }
  };

  const handleStatusPopupClose = () => {
    setStatusPopup({ open: false, storeId: null, newStatus: null });
  };

  const handleDeleteConfirm = async () => {
    setSubmitting(true);
    const { storeId } = deletePopup;
    try {
      const token = localStorage.getItem("token");
      const oResponse = await apiDelete(`${DELETE_STORE}/${storeId}`, token);
      const backendMessage = oResponse.data.MESSAGE;
      showEmsg(backendMessage, STATUS.SUCCESS);

      const isActiveFilter =
        oFilters.status === FILTER_VALUES.ALL ? undefined : oFilters.status === "true";

      // Refresh the stores list after deletion
      dispatch(
        fetchResource({
          key: "stores",
          params: {
            pageNumber: currentPage,
            pageSize: itemsPerPage,
            searchText: sSearchTerm,
            IsActive: isActiveFilter,
          },
        })
      );

      setDeletePopup({ open: false, storeId: null });
    } catch (err) {
      const errorMessage = err?.response?.data?.MESSAGE;
      showEmsg(errorMessage || t("COMMON.API_ERROR"), STATUS.ERROR);
      setDeletePopup({ open: false, storeId: null });
    }
    hideLoaderWithDelay(setSubmitting);
  };

  const handleDeletePopupClose = () => {
    setDeletePopup({ open: false, storeId: null });
  };

  // Handle table scroll for floating header
  const handleTableScroll = useCallback((e) => {
    setTableScrollTop(e.target.scrollTop);
  }, []);

  // Helper function to format dates for API
  const formatDateForAPI = (date) => {
    if (!date) return undefined;

    // If it's a dayjs object
    if (date.isValid && date.isValid()) {
      return date.toISOString();
    }

    // If it's already a string
    if (typeof date === "string") {
      return date;
    }

    // If it's a Date object
    if (date instanceof Date) {
      return date.toISOString();
    }

    return undefined;
  };

  const handleExportStores = async () => {
    // Check permission before exporting
    if (!hasExportPermission) {
      return;
    }
    
    setExportLoading(true);
    try {
      // Format dates for API
      const startDate = formatDateForAPI(oFilters.startDate);
      const endDate = formatDateForAPI(oFilters.endDate);
      const isActiveFilter =
        oFilters.status === FILTER_VALUES.ALL ? undefined : oFilters.status === "true";

      await dispatch(
        exportStoreReport({
          searchText: sSearchTerm,
          startDate: startDate,
          endDate: endDate,
          isActive: isActiveFilter,
        })
      ).unwrap();
    } catch (error) {
      showEmsg(error?.message || t("COMMON.API_ERROR"), STATUS.ERROR);
    } finally {
      setExportLoading(false);
    }
  };

  useEffect(() => {
    const fetchStoresData = async () => {
      try {
        const isActiveFilter =
          oFilters.status === FILTER_VALUES.ALL ? undefined : oFilters.status === "true";

        await dispatch(
          fetchResource({
            key: "stores",
            params: {
              pageNumber: currentPage,
              pageSize: itemsPerPage,
              searchText: sSearchTerm,
              IsActive: isActiveFilter,
            },
          })
        ).unwrap();
      } catch (err) {
        showEmsg(err.error || t("COMMON.API_ERROR"), STATUS.ERROR);
      } finally {
        setFilterLoading(false);
        if (!initialLoadComplete) {
          setInitialLoadComplete(true);
        }
      }
    };

    fetchStoresData();
    setTitle(t("STORES.HEADING"));

    return () => {
      setBackButton(null);
      setTitle("");
    };
  }, [
    currentPage,
    itemsPerPage,
    sSearchTerm,
    oFilters.status,
    setBackButton,
    setTitle,
    t,
    dispatch,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [sSearchTerm, oFilters]);

  // Helper function to get status text
  const getStatusText = (isActive) => {
    return isActive ? t("COMMON.ACTIVE") : t("COMMON.INACTIVE");
  };

  return (
    <div
      className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-2 h-screen bg-gray-50 flex flex-col"
    >

      <ToastContainer />
      {bSubmitting && (
        <div className="global-loader-overlay">
          <Loader />
        </div>
      )}
      <Toolbar
        searchTerm={sSearchTerm}
        setSearchTerm={setSearchTerm}
        viewMode={viewMode}
        setViewMode={setViewMode}
        showFilterDropdown={bShowFilterDropdown}
        setShowFilterDropdown={setShowFilterDropdown}
        additionalFilters={aAdditionalFilters}
        handleFilterChange={handleFilterChange}
        searchPlaceholder={t("STORES.SEARCH_PLACEHOLDER")}
        onClearFilters={handleClearFilters}
        isBrowsePage={false}
        onExport={handleExportStores}
        exportLabel={exportLoading ? t("COMMON.EXPORTING") : t("COMMON.EXPORT")}
        exportDisabled={!hasExportPermission}
        onCreate={() => { if (canAddStore) navigate("/add-store"); }}
        createLabel={t("STORES.ADD_STORE")}
        actionType="STORE"
        disableCreate={!canAddStore}
        disableCreateReason={addStoreDisabledReason}
      />

      {viewMode === "table" ? (
        <div className="table-container-floating">
          <div
            className="table-wrapper-floating"
            onScroll={handleTableScroll}
          >
            <table className="table-base">
              {/* Floating Header */}
              <thead
                className={`table-head-floating ${tableScrollTop > 10 ? "table-head-floating-shadow" : ""
                  }`}
              >
                <tr>
                  <th
                    scope="col"
                    className="table-head-cell-floating text-left w-2/5"
                  >
                    {t("STORES.STORE_DETAILS")}
                  </th>
                  <th
                    scope="col"
                    className="table-head-cell-floating text-center w-1/5"
                  >
                    {t("STORES.CONTACT")}
                  </th>
                  <th
                    scope="col"
                    className="table-head-cell-floating text-center w-1/5"
                  >
                    {t("COMMON.STATUS")}
                  </th>
                  <th
                    scope="col"
                    className="table-head-cell-floating text-center w-1/5"
                  >
                    {t("COMMON.ACTIONS")}
                  </th>
                </tr>
              </thead>

              <tbody className="table-body">
                {bFilterLoading || storesLoading ? (
                  <SkeletonLoader type={SKELETON_TYPES.STORE_TABLE} rows={6} />
                ) : aStores.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <EmptyState
                        type="empty-box"
                        title={t("STORES.NO_STORES_FOUND")}
                        compact
                      />
                    </td>
                  </tr>
                ) : (
                  aStores.map((store) => (
                    <tr key={store.StoreID} className="table-row">
                      {/* Store Details - Highlighted main text */}
                      <td className="table-cell w-2/5 text-left">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-custom-bg/10 rounded-lg flex items-center justify-center">
                            <Building className="h-5 w-5 text-custom-bg" />
                          </div>
                          <div className="ml-4">
                            {/* Highlighted main text for Store Name */}
                            <div className="table-cell-text ellipsis-text font-medium text-gray-900">
                              {store.StoreName}
                            </div>
                            {/* Subtext for Address */}
                            <div className="table-cell-subtext flex items-center">
                              <MapPin className="h-4 w-4 mr-1" />
                              <span className="ellipsis-text">
                                {store.AddressLine1}
                                {store.AddressLine2 &&
                                  `, ${store.AddressLine2}`}
                                {store.City?.CityName &&
                                  `, ${store.City.CityName}`}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact - Highlighted main text */}
                      <td className="table-cell w-1/5 text-left">
                        <div className="flex flex-col items-start space-y-1 w-full">
                          {/* Highlighted main text for Phone */}
                          <div className="table-cell-text flex items-center font-medium text-gray-900">
                            <Phone className="h-4 w-4 mr-1 text-gray-400" />
                            <span className="ellipsis-text">
                              {store.CountryCode ? `${store.CountryCode} ${store.PhoneNumber}` : store.PhoneNumber}
                            </span>
                          </div>
                          {/* Subtext for Email */}
                          <div className="table-cell-subtext flex items-center">
                            <Mail className="h-4 w-4 mr-1 text-gray-400" />
                            <span className="ellipsis-text">
                              {store.Email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="table-cell w-1/5 text-center">
                        <div className="flex justify-center">
                          <Switch
                            checked={store.IsActive}
                            onChange={() =>
                              handleStatusChange(store.StoreID, store.IsActive)
                            }
                          />
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="table-cell w-1/5 text-center">
                        <ActionButtons
                          id={store.StoreID}
                          onEdit={handleEdit}
                          onDelete={hasDeletePermission ? handleDelete : null}
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
              height: bShowFilterDropdown 
                ? 'calc(100vh - 280px)' 
                : 'calc(100vh - 180px)'
            }}
          >
          {bFilterLoading || storesLoading ? (
            <SkeletonLoader type={SKELETON_TYPES.STORE_GRID} rows={6} className="p-4" />
          ) : aStores.length === 0 ? (
            <EmptyState
              type="empty-box"
              title={t("STORES.NO_STORES_FOUND")}
              compact
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
            {aStores.map((store) => (
              <div
                key={store.StoreID}
                className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 flex flex-col gap-4 hover:shadow-xl transition-shadow duration-200"
              >
                <div className="flex items-center gap-4 pb-2 border-b border-gray-100">
                  <div className="flex-shrink-0 h-12 w-12 bg-custom-bg/10 rounded-lg flex items-center justify-center">
                    <Building className="h-6 w-6 text-custom-bg" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* Highlighted main text for Store Name */}
                    <div className="text-lg font-bold text-gray-900 ellipsis-text">
                      {store.StoreName}
                    </div>
                    {/* Subtext for Address */}
                    <div className="text-xs text-gray-500 flex items-center mt-1">
                      <MapPin className="h-4 w-4 mr-1 shrink-0" />
                      <span className="ellipsis-text">
                        {store.AddressLine1}
                        {store.AddressLine2 && `, ${store.AddressLine2}`}
                        {store.City?.CityName && `, ${store.City.CityName}`}
                        {store.Zipcode && `, ${store.Zipcode}`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 text-sm">
                  {/* Highlighted main text for Phone */}
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="font-medium text-gray-900 ellipsis-text">
                      {store.CountryCode ? `${store.CountryCode} ${store.PhoneNumber}` : store.PhoneNumber}
                    </span>
                  </div>
                  {/* Subtext for Email */}
                  <div className="flex items-center gap-2 text-gray-500">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="ellipsis-text">{store.Email}</span>
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span
                    className={`status-badge ${store.IsActive ? "status-active" : "status-inactive"
                      }`}
                  >
                    {getStatusText(store.IsActive)}
                  </span>
                  <Switch
                    checked={store.IsActive}
                    onChange={() =>
                      handleStatusChange(store.StoreID, store.IsActive)
                    }
                  />
                </div>
              </div>
            ))
          }
            </div>
          )}
          </div>
        </div>
      )}

      {statusPopup.open && (
        <FullscreenErrorPopup
          open={statusPopup.open}
          message={
            statusPopup.newStatus
              ? t("STORES.STATUS_CONFIRM_ACTIVE")
              : t("STORES.STATUS_CONFIRM_INACTIVE")
          }
          onClose={handleStatusPopupClose}
          onConfirm={handleStatusConfirm}
        />
      )}

      {deletePopup.open && (
        <FullscreenErrorPopup
          open={deletePopup.open}
          message={t("STORES.DELETE_CONFIRM_MESSAGE")}
          onClose={handleDeletePopupClose}
          onConfirm={handleDeleteConfirm}
        />
      )}

      {/* FIX: Pass correct pagination props */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 z-10">
        {bFilterLoading || storesLoading ? (
          <SkeletonLoader type="pagination" />
        ) : (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            handlePrevPage={handlePrevPage}
            handleNextPage={handleNextPage}
            handlePageClick={handlePageClick}
          />
        )}
      </div>
    </div>
  );
};

export default Stores;
