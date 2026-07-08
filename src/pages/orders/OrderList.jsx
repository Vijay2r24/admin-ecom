import React, { useEffect, useState, useCallback } from "react";
import { Download } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Toolbar from "../../components/Toolbar";
import Pagination from "../../components/Pagination";
import { useTranslation } from "react-i18next";
import { apiGet } from "../../utils/ApiUtils";
import { GETALLORDERS_API } from "../../contants/apiRoutes";
import { useTitle } from "../../context/TitleContext";
import { SKELETON_TYPES } from "../../contants/constants";
import {
  DATE_FORMAT_OPTIONS,
  LOCALES,
  STATUS,
  MODULES,
  PERMISSIONS,
} from "../../contants/constants";
import Loader from "../../components/Loader";
import SkeletonLoader from "../../components/SkeletonLoader";
import EmptyState from "../../components/EmptyState";
import { fetchResource } from "../../store/slices/allDataSlice";
import { exportOrderReport } from "../../store/slices/exportSlice";
import { ToastContainer } from "react-toastify";
import { getPermissionCode, hasPermissionId } from "../../utils/permissionUtils";
import { showEmsg } from "../../utils/ShowEmsg";

const OrderList = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize state from URL parameters or defaults
  const [sSearchTerm, setSearchTerm] = useState(
    searchParams.get("search") || ""
  );
  const { t } = useTranslation();
  const [sFilterStatus, setFilterStatus] = useState(
    searchParams.get("status") || t("STATUS_VALUES.ALL")
  );
  const [bShowFilterDropdown, setShowFilterDropdown] = useState(false);
  const [sViewMode, setViewMode] = useState("table");
  const [nCurrentPage, setCurrentPage] = useState(
    Number(searchParams.get("page")) || 1
  );
  const [aOrders, setOrders] = useState([]);
  const [nTotalRecords, setTotalRecords] = useState(0);
  const [sTotalPages, setTotalPages] = useState("");
  const [nProductsPerPage, setProductsPerPage] = useState(10);
  const [bFilterLoading, setFilterLoading] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [exportLoading, setExportLoading] = useState(false);
  const [tableScrollTop, setTableScrollTop] = useState(0);

  // Redux hooks
  const dispatch = useDispatch();

  // --- 1. Select Stores from Redux ---
  const storesState = useSelector(
    (state) => state.allData.resources.stores || {}
  );
  const { data: aStores = [] } = storesState;

  const { paymentStatus, loadingPaymentStatus } = useSelector((state) => ({
    paymentStatus: state.allData.resources.paymentStatus?.data || [],
    loadingPaymentStatus:
      state.allData.resources.paymentStatus?.loading || false,
  }));

  // --- 2. Update Default Filters ---
  const defaultFilters = {
    paymentStatus: [], // Changed to array
    store: [],        // Changed to array
    startDate: null,
    endDate: null,
  };

  // Initialize filters from URL parameters
  const [oFilters, setFilters] = useState({
    ...defaultFilters,
    paymentStatus: searchParams.get("paymentStatus")
      ? searchParams.get("paymentStatus").split(",")
      : [],
    store: searchParams.get("store")
      ? searchParams.get("store").split(",")
      : [],
  });

  const navigate = useNavigate();
  const { setTitle } = useTitle();
  const [sError, setError] = useState(null);
  const [bLoading, setLoading] = useState(true);

  // Permission check for View Order Details
  const permissionIdForView = getPermissionCode(
    MODULES.ORDER,
    PERMISSIONS.VIEW_ORDER_DETAILS
  );
  const hasViewPermission = hasPermissionId(permissionIdForView);

  // Permission check for Generate Order Report
  const permissionIdForExport = getPermissionCode(
    MODULES.ORDER,
    PERMISSIONS.GENERATE_ORDER_REPORT
  );
  const hasExportPermission = hasPermissionId(permissionIdForExport);

  // Update URL parameters when filters change
  useEffect(() => {
    const params = {};

    if (sSearchTerm) params.search = sSearchTerm;
    if (sFilterStatus !== t("STATUS_VALUES.ALL")) params.status = sFilterStatus;

    // Convert arrays to comma-separated strings for URL
    if (Array.isArray(oFilters.paymentStatus) && oFilters.paymentStatus.length > 0)
      params.paymentStatus = oFilters.paymentStatus.join(",");

    // --- 3. Sync Store to URL ---
    if (Array.isArray(oFilters.store) && oFilters.store.length > 0)
      params.store = oFilters.store.join(",");

    if (nCurrentPage > 1) params.page = nCurrentPage.toString();

    // Handle date filters - convert to ISO string for URL
    if (oFilters.startDate) {
      const startDate = formatDateForAPI(oFilters.startDate);
      if (startDate) params.startDate = startDate;
    }
    if (oFilters.endDate) {
      const endDate = formatDateForAPI(oFilters.endDate);
      if (endDate) params.endDate = endDate;
    }

    setSearchParams(params, { replace: true });
  }, [sSearchTerm, sFilterStatus, oFilters, nCurrentPage, setSearchParams]);

  // Fetch filter options from Redux on component mount
  useEffect(() => {
    dispatch(fetchResource({ key: "paymentStatus" }));
    dispatch(fetchResource({ key: "stores" })); // Fetch stores
  }, [dispatch]);

  // Fetch stores when filter dropdown is shown 
  useEffect(() => {
    if (bShowFilterDropdown) {
      dispatch(fetchResource({ key: "stores" }));
    }
  }, [bShowFilterDropdown, dispatch]);

  const handleClearFilters = useCallback(() => {

    setSearchParams({}, { replace: true });

    // Reset all local state
    setSearchTerm("");
    setFilterStatus(t("STATUS_VALUES.ALL"));
    setFilters({
      paymentStatus: [],
      store: [],
      startDate: null,
      endDate: null,
    });
    setCurrentPage(1);
    setExpandedRows(new Set());
  }, [setSearchParams]);

  const handleFilterChange = useCallback(
    (e, filterName) => {
      if (initialLoadComplete) {
        setFilterLoading(true);
      }

      if (filterName === "dateRange") {
        // Handle date range picker - store the dayjs objects directly
        const dateValue = e.target.value;

        setFilters((prevFilters) => ({
          ...prevFilters,
          startDate: dateValue?.start || null,
          endDate: dateValue?.end || null,
        }));
      } else {
        // Handle other filters
        const value = e.target.value;
        setFilters((prevFilters) => ({
          ...prevFilters,
          [filterName]: value,
        }));
      }
      setCurrentPage(1);
    },
    [initialLoadComplete]
  );


  const handleDropdownInputChange = (inputValue, filterName) => {
    if (filterName === "store") {
      dispatch(
        fetchResource({ key: "stores", params: { searchText: inputValue } })
      );
    }
  };


  const storeOptions = [
    // Removed "All" option for multi-select
    ...(Array.isArray(aStores)
      ? aStores.map((store) => ({
        value: store.StoreID,
        label: store.StoreName,
      }))
      : []),
  ];

  const getPaymentStatusOptions = () => {
    if (loadingPaymentStatus) {
      return [{ value: "loading", label: t("COMMON.LOADING"), disabled: true }];
    }

    if (paymentStatus && paymentStatus.length > 0) {
      const options = paymentStatus.map((status) => ({
        value: status.PaymentStatusID,
        label: status.PaymentStatusName,
      }));

      // Removed "All" option for multi-select
      return options;
    }

    return [
      {
        value: "no-data",
        label: t("COMMON.NO_DATA_AVAILABLE"),
        disabled: true,
      },
    ];
  };


  const additionalFilters = [

    {
      label: t("ORDERS.FILTERS.PAYMENT_STATUS"),
      name: "paymentStatus",
      value: oFilters.paymentStatus,
      options: getPaymentStatusOptions(),
      multiple: true, // Enable multi-select
    },
    {
      label: t("COMMON.STORE"),
      name: "store",
      value: oFilters.store,
      options: storeOptions,
      placeholder: t("USERS.FILTERS.STORE"),
      searchable: true,
      searchPlaceholder: t("COMMON.SEARCH_STORE"),
      onInputChange: (inputValue) =>
        handleDropdownInputChange(inputValue, "store"),
      multiple: true, // Enable multi-select
    },
    {
      label: t("ORDERS.FILTERS.DATE_RANGE"),
      name: "dateRange",
      value: { start: oFilters.startDate, end: oFilters.endDate },
      type: "date",
    },
  ];

  const formatOrderDateTime = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString(LOCALES.ENGLISH_US, {
      year: DATE_FORMAT_OPTIONS.year,
      month: DATE_FORMAT_OPTIONS.month,
      day: DATE_FORMAT_OPTIONS.day,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatCurrency = (amount) => {
    if (!amount) return "N/A";
    return new Intl.NumberFormat(LOCALES.ENGLISH_INDIA, {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const toggleRowExpansion = (orderId) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const formatDateForAPI = (date) => {
    if (!date) return undefined;
    if (date.isValid && date.isValid()) {
      return date.toISOString();
    }
    if (typeof date === "string") {
      return date;
    }
    if (date instanceof Date) {
      return date.toISOString();
    }
    return undefined;
  };

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const fetchData = useCallback(async () => {
    try {
      if (initialLoadComplete) {
        setFilterLoading(true);
      } else {
        setLoading(true);
      }

      const token = localStorage.getItem("token");

      const startDate = formatDateForAPI(oFilters.startDate);
      const endDate = formatDateForAPI(oFilters.endDate);

      const params = {
        searchText: sSearchTerm,
        pageNumber: nCurrentPage,
        pageSize: nProductsPerPage,
        startDate: startDate,
        endDate: endDate,
      };

      // Only add storeId if specific stores are selected (not all stores)
      // If all stores are selected, don't pass the storeId parameter at all
      const allStoreIds = aStores.map(store => store.StoreID);
      const selectedStoreIds = Array.isArray(oFilters.store) ? oFilters.store : [];
      const areAllStoresSelected = selectedStoreIds.length > 0 && 
                                   selectedStoreIds.length === allStoreIds.length &&
                                   allStoreIds.every(id => selectedStoreIds.includes(id));

      if (!areAllStoresSelected && selectedStoreIds.length > 0) {
        params.storeId = selectedStoreIds;
      }

      // Only add paymentStatusId if payment statuses are specifically selected
      if (Array.isArray(oFilters.paymentStatus) && oFilters.paymentStatus.length > 0) {
        params.paymentStatusId = oFilters.paymentStatus;
      }

      // Remove undefined values from params
      Object.keys(params).forEach((key) => {
        if (params[key] === undefined) {
          delete params[key];
        }
      });

      const oResponse = await apiGet(GETALLORDERS_API, params, token);

      if (oResponse.data.status !== STATUS.SUCCESS.toLocaleUpperCase()) {
        setOrders([]);
        setTotalPages(0);
        setTotalRecords(0);
        setError(oResponse.data.message || t("COMMON.API_ERROR"));
      } else {
        const orders = oResponse.data.data || [];

        const formattedOrders = orders.map((order) => ({
          orderId: order.OrderID,
          orderRefId: order.OrderRefID,
          formattedOrderDate: formatOrderDateTime(order.OrderDate),
          totalAmount: order.TotalAmount,
          formattedTotalAmount: formatCurrency(order.TotalAmount),
          totalQuantity: order.totalQuantity,
          totalOrderItems: order.totalOrderItems,
          paymentStatus: order.PaymentStatusName || "N/A",
          paymentDate: order.PaymentDate,
          formattedPaymentDate: order.PaymentDate
            ? formatOrderDateTime(order.PaymentDate)
            : "N/A",
          customerName: `${order.FirstName} ${order.LastName}`.trim(),
          email: order.Email,
          phoneNumber: order.PhoneNumber,
          orderItems: order.orderItems || [],
          order: order,
        }));

        setOrders(formattedOrders);
        setTotalPages(oResponse.data.pagination?.totalPages || 0);
        setTotalRecords(oResponse.data.pagination?.totalRecords || 0);
        setError(null);
      }
    } catch (error) {
      setError(error?.response?.data?.message || t("COMMON.API_ERROR"));
      setTotalPages(0);
      setTotalRecords(0);
    } finally {
      setLoading(false);
      setFilterLoading(false);
      if (!initialLoadComplete) {
        setInitialLoadComplete(true);
      }
    }
  }, [
    nCurrentPage,
    nProductsPerPage,
    sSearchTerm,
    oFilters,
    initialLoadComplete,
    t,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setTitle(t("ORDERS.TITLE"));
  }, [setTitle, t]);

  const getStatusColor = useCallback((status) => {
    const statusClasses = {
      Pending: "status-pending",
      Processing: "status-processing",
      Shipped: "status-shipped",
      Delivered: "status-delivered",
      Cancelled: "status-cancelled",
      Returned: "status-cancelled",
    };
    return statusClasses[status] || "status-default";
  }, []);

  const getPaymentStatusColor = useCallback((status) => {
    const statusClasses = {
      Pending: "status-pending",
      Completed: "status-delivered",
      Failed: "status-cancelled",
      Refunded: "status-cancelled",
      Processing: "status-processing",
    };
    return statusClasses[status] || "status-default";
  }, []);

  const getOrderItemStatusColor = useCallback((status) => {
    const statusClasses = {
      Pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      Processing: "bg-blue-100 text-blue-800 border-blue-200",
      Shipped: "bg-indigo-100 text-indigo-800 border-indigo-200",
      Delivered: "bg-green-100 text-green-800 border-green-200",
      Cancelled: "bg-red-100 text-red-800 border-red-200",
      Returned: "bg-purple-100 text-purple-800 border-purple-200",
    };
    return statusClasses[status] || "bg-gray-100 text-gray-800 border-gray-200";
  }, []);

  const handleViewOrder = useCallback(
    (order) => {
      // Check permission before navigating
      if (!hasViewPermission) {
        return; // Do nothing if no permission
      }
      navigate(`/orders/${order.orderId}`, {
        state: {
          order: order.order,
        },
      });
    },
    [navigate, hasViewPermission]
  );

  const handlePrevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(prev + 1, sTotalPages));
  }, [sTotalPages]);

  const handlePageClick = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [sSearchTerm, sFilterStatus]);

  const handleExportOrders = useCallback(async () => {
    // Check permission before exporting
    if (!hasExportPermission) {
      return;
    }
    
    setExportLoading(true);
    try {
      const startDate = formatDateForAPI(oFilters.startDate);
      const endDate = formatDateForAPI(oFilters.endDate);

      const exportParams = {
        searchText: sSearchTerm,
        startDate: startDate,
        endDate: endDate,
      };

      // Only add storeId if specific stores are selected (not all stores)
      // If all stores are selected, don't pass the storeId parameter at all
      const allStoreIds = aStores.map(store => store.StoreID);
      const selectedStoreIds = Array.isArray(oFilters.store) ? oFilters.store : [];
      const areAllStoresSelected = selectedStoreIds.length > 0 && 
                                   selectedStoreIds.length === allStoreIds.length &&
                                   allStoreIds.every(id => selectedStoreIds.includes(id));

      if (!areAllStoresSelected && selectedStoreIds.length > 0) {
        exportParams.storeId = selectedStoreIds;
      }

      // Only add paymentStatusId if payment statuses are specifically selected
      if (Array.isArray(oFilters.paymentStatus) && oFilters.paymentStatus.length > 0) {
        exportParams.paymentStatusId = oFilters.paymentStatus;
      }

      await dispatch(exportOrderReport(exportParams)).unwrap();
    } catch (error) {
      showEmsg(error?.message || t("COMMON.API_ERROR"), STATUS.ERROR);
    } finally {
      setExportLoading(false);
    }
  }, [dispatch, sSearchTerm, oFilters, aStores, t, hasExportPermission]);

  const handleTableScroll = useCallback((e) => {
    setTableScrollTop(e.target.scrollTop);
  }, []);

  return (
    <div
      className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-2 h-screen bg-gray-50 flex flex-col"
    >
      <ToastContainer />
      <Toolbar
        searchTerm={sSearchTerm}
        setSearchTerm={setSearchTerm}
        viewMode={sViewMode}
        setViewMode={setViewMode}
        showFilterDropdown={bShowFilterDropdown}
        setShowFilterDropdown={setShowFilterDropdown}
        additionalFilters={additionalFilters}
        handleFilterChange={handleFilterChange}
        searchPlaceholder={t("ORDERS.SEARCH_PLACEHOLDER")}
        onClearFilters={handleClearFilters}
        isBrowsePage={false}
        showCreateButton={false}
        showViewToggle={true}
        onExport={handleExportOrders}
        exportLabel={exportLoading ? t("COMMON.EXPORTING") : t("COMMON.EXPORT")}
        exportDisabled={!hasExportPermission}
      />

      {sViewMode === "table" ? (
        <div className="table-container-floating flex-1 min-h-0">
          <div
            className="table-wrapper-floating scrollbar-hide overflow-y-auto !overflow-x-hidden"
            onScroll={handleTableScroll}
          >
            <table className="table-base w-full table-fixed">
              <thead
                className={`table-head-floating ${tableScrollTop > 10 ? "table-head-floating-shadow" : ""}`}
              >
                <tr>
                  <th className="table-head-cell-floating w-[4%]"></th>
                  <th className="table-head-cell-floating text-left w-[18%]">
                    {t("ORDERS.TABLE.ORDER_REF")}
                  </th>
                  <th className="table-head-cell-floating w-[14%]">
                    {t("ORDERS.TABLE.ORDER_DATE")}
                  </th>
                  <th className="table-head-cell-floating text-left w-[22%]">
                    {t("ORDERS.TABLE.CUSTOMER_NAME")}
                  </th>
                  <th className="table-head-cell-floating w-[12%]">
                    {t("ORDERS.TABLE.PHONE_NUMBER")}
                  </th>
                  <th className="table-head-cell-floating w-[12%]">
                    {t("ORDERS.TABLE.PAYMENT_STATUS")}
                  </th>
                  <th className="table-head-cell-floating w-[10%]">
                    {t("COMMON.TOTAL_ORDER_ITEMS")}
                  </th>
                  <th className="table-head-cell-floating w-[8%]">{t("COMMON.ACTIONS")}</th>
                </tr>
              </thead>

              <tbody className="table-body">
                {bLoading || bFilterLoading ? (
                  <SkeletonLoader type={SKELETON_TYPES.ORDER_TABLE} rows={8} />
                ) : sError ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-600">
                      {sError}
                    </td>
                  </tr>
                ) : aOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <EmptyState type="empty-box" title={t("ORDERS.NO_ORDERS_FOUND")} description={t("COMMON.TRY_ADJUSTING_SEARCH_FILTERS")} compact />
                    </td>
                  </tr>
                ) : (
                  aOrders.map((order) => (
                    <React.Fragment key={order.orderId}>
                      <tr className="table-row">
                        <td className="table-cell">
                          {order.orderItems.length > 0 && (
                            <button
                              onClick={() => toggleRowExpansion(order.orderId)}
                              className="text-gray-500 hover:text-gray-700 transition-colors"
                            >
                              {expandedRows.has(order.orderId) ? "▼" : "▶"}
                            </button>
                          )}
                        </td>

                        <td className="table-cell table-cell-text max-w-0">
                          <span className="block truncate" title={order.orderRefId}>
                            {order.orderRefId}
                          </span>
                        </td>

                        <td className="table-cell table-cell-text max-w-0">
                          <div className="flex flex-col min-w-0">
                            <div className="text-sm text-gray-700 truncate">
                              {order.formattedOrderDate.split(",")[0]}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 truncate">
                              {order.formattedOrderDate
                                .split(",")
                                .slice(1)
                                .join(",")
                                .trim()}
                            </div>
                          </div>
                        </td>

                        <td className="table-cell table-cell-text max-w-0">
                          <div className="text-sm text-gray-700 truncate">
                            {order.customerName || t("COMMON.UNKNOWN_CUSTOMER")}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {order.email}
                          </div>
                        </td>

                        <td className="table-cell table-cell-text text-center max-w-0">
                          <span className="block truncate">
                            {order.phoneNumber || "N/A"}
                          </span>
                        </td>

                        <td className="table-cell text-center">
                          <span
                            className={`status-badge ${getPaymentStatusColor(
                              order.paymentStatus
                            )}`}
                          >
                            {order.paymentStatus}
                          </span>
                        </td>

                        <td className="table-cell table-cell-text text-center">
                          {order.totalOrderItems}
                        </td>

                        <td className="table-cell">
                          <button
                            onClick={() => handleViewOrder(order)}
                            className={`action-button ${!hasViewPermission ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={!hasViewPermission}
                            title={!hasViewPermission ? t("COMMON.NO_PERMISSION") : t("ORDERS.VIEW_DETAILS")}
                          >
                            {t("ORDERS.VIEW_DETAILS")}
                          </button>
                        </td>
                      </tr>

                      {expandedRows.has(order.orderId) &&
                        order.orderItems.length > 0 && (
                          <tr className="table-row bg-gray-50">
                            <td colSpan={8} className="table-cell-wrap">
                              <div className="mb-3">
                                <div className="text-sm font-semibold text-gray-700 mb-2">
                                  {t("COMMON.ORDER_ITEMS")} (
                                  {order.totalOrderItems}):
                                </div>
                                <div className="space-y-3">
                                  {order.orderItems.map((item) => (
                                    <div
                                      key={item.OrderItemID}
                                      className="flex items-start justify-between p-3 bg-white rounded-lg border border-gray-200"
                                    >
                                      <div className="flex-1">
                                        <div className="font-medium text-gray-900 text-sm">
                                          {item.ProductName}
                                        </div>
                                        <div className="text-xs text-gray-600 mt-1">
                                          {t("ORDERS.TABLE.ORDER_NUMBER")}:{" "}
                                          {item.OrderItemID}
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-4 ml-4">
                                        <div className="text-sm font-medium text-gray-700">
                                          {t("COMMON.QUANTITY")}:{" "}
                                          {item.Quantity}
                                        </div>
                                        <span
                                          className={`status-badge ${getOrderItemStatusColor(
                                            item.OrderStatus
                                          )}`}
                                        >
                                          {item.OrderStatus}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid-container-floating">
          <div className="grid-wrapper-floating" onScroll={handleTableScroll}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-4">
          {bLoading ? (
            <SkeletonLoader type={SKELETON_TYPES.ORDER_GRID} rows={6} className="p-4" />
          ) : bFilterLoading ? (
            <SkeletonLoader type={SKELETON_TYPES.ORDER_GRID} rows={6} className="p-4" />
          ) : sError ? (
            <div className="col-span-full text-center py-8 text-gray-600">
              {sError}
            </div>
          ) : aOrders.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-600">
              {t("ORDERS.NO_ORDERS_FOUND")}
            </div>
          ) : (
            aOrders.map((order) => (
              <div
                key={order.orderId}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-lg transition-shadow duration-200 flex flex-col h-full"
              >
                {/* Header Section */}
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold text-gray-900 truncate max-w-[120px]">
                    {order.orderId}
                  </div>
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full ${getPaymentStatusColor(
                      order.paymentStatus
                    )}`}
                  >
                    {order.paymentStatus}
                  </span>
                </div>

                {/* Order Details */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500 font-medium">
                      {t("ORDERS.TABLE.ORDER_DATE")}
                    </span>
                    <span className="text-sm text-gray-900 truncate">
                      {order.formattedOrderDate.split(",")[0]}
                    </span>
                    <span className="text-xs text-gray-500">
                      {order.formattedOrderDate
                        .split(",")
                        .slice(1)
                        .join(",")
                        .trim()}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500 font-medium">
                      {t("ORDERS.TABLE.CUSTOMER_NAME")}
                    </span>
                    <span className="text-sm text-gray-900 truncate">
                      {order.customerName || t("COMMON.UNKNOWN_CUSTOMER")}
                    </span>
                    <span className="text-xs text-gray-500 truncate">
                      {order.email}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500 font-medium">
                      {t("ORDERS.TABLE.PHONE_NUMBER")}
                    </span>
                    <span className="text-sm text-gray-900">
                      {order.phoneNumber || "N/A"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-1 border-t border-gray-100">
                    <span className="text-xs text-gray-500 font-medium">
                      {t("COMMON.TOTAL_ORDER_ITEMS")}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {order.totalOrderItems}
                    </span>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => handleViewOrder(order)}
                  className={`mt-3 w-full inline-flex justify-center items-center px-3 py-1.5 border rounded-lg font-medium transition-colors duration-150 text-sm ${hasViewPermission
                    ? 'border-[#5B45E0] text-[#5B45E0] hover:bg-[#5B45E0]/10 cursor-pointer'
                    : 'border-gray-300 text-gray-400 cursor-not-allowed opacity-50'
                    }`}
                  disabled={!hasViewPermission}
                  title={!hasViewPermission ? t("COMMON.NO_PERMISSION") : t("ORDERS.VIEW_DETAILS")}
                >
                  {t("ORDERS.VIEW_DETAILS")}
                </button>
              </div>
            ))
          )}
        </div>
          </div>
        </div>
      )}

      {aOrders.length > 0 && (
        <div className="sticky bottom-0 bg-white border-t border-gray-200 z-10 flex-shrink-0">
          {bLoading || bFilterLoading ? (
            <SkeletonLoader type={SKELETON_TYPES.PAGINATION} />
          ) : (
            <Pagination
              currentPage={nCurrentPage}
              totalPages={sTotalPages}
              totalItems={nTotalRecords}
              itemsPerPage={nProductsPerPage}
              handlePrevPage={handlePrevPage}
              handleNextPage={handleNextPage}
              handlePageClick={handlePageClick}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default OrderList;