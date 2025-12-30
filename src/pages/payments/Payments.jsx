

import React, { useState, useEffect, useCallback } from "react";
import { Calendar, CreditCard, FileText, User, Eye } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Toolbar from "../../components/Toolbar";
import Pagination from "../../components/Pagination";
import { useTranslation } from "react-i18next";
import { useTitle } from "../../context/TitleContext";
import FullscreenErrorPopup from "../../components/FullscreenErrorPopup";
import { ToastContainer } from "react-toastify";
import { EXPORT_TYPES, ITEMS_PER_PAGE, STATUS } from "../../contants/constants";
import { apiDelete, apiGet } from "../../utils/ApiUtils";
import Loader from "../../components/Loader";
import {
  getPermissionCode,
  hasPermissionId,
} from "../../utils/permissionUtils";
import { fetchResource } from "../../store/slices/allDataSlice";
import { GET_All_PAYMENTS } from "../../contants/apiRoutes";
import { exportPaymentReport } from "../../store/slices/exportSlice";
import { showEmsg } from "../../utils/ShowEmsg.jsx";

const Payments = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize state from URL parameters or defaults 
  const [sSearchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [bShowFilterDropdown, setShowFilterDropdown] = useState(false);
  const [viewMode, setViewMode] = useState("table");
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get("page")) || 1);
  
  const { t } = useTranslation();
  const { setBackButton, setTitle } = useTitle();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // State for payments data
  const [payments, setPayments] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [tableScrollTop, setTableScrollTop] = useState(0);
  const [bSubmitting, setSubmitting] = useState(false);
  const [bFilterLoading, setFilterLoading] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [sError, setError] = useState(null);

  // --- Default Filters 
  const defaultFilters = {
    paymentStatus: "",
    paymentType: "",
    paymentMethod: "",
    store: STATUS_VALUES.ALL, // 
    startDate: null,
    endDate: null,
  };

  // Initialize filters from URL parameters
  const [oFilters, setFilters] = useState({
    ...defaultFilters,
    paymentStatus: searchParams.get("paymentStatus") || "",
    paymentType: searchParams.get("paymentType") || "",
    paymentMethod: searchParams.get("paymentMethod") || "",
    store: searchParams.get("store") || STATUS_VALUES.ALL,
  });

  const itemsPerPage = ITEMS_PER_PAGE;

  // Permissions
  const permissionIdForDelete = getPermissionCode("Payment Management", "Delete Payment");
  const hasDeletePermission = hasPermissionId(permissionIdForDelete);

  // --- Redux Selectors 
  const storesState = useSelector((state) => state.allData.resources.stores || {});
  const { data: aStores = [] } = storesState;

  const paymentStatusOptions = useSelector(
    (state) =>
      state.allData.resources.paymentStatus?.data?.map((status) => ({
        value: status.PaymentStatusName,
        label: status.PaymentStatusName,
      })) || []
  );

  const paymentTypeOptions = useSelector(
    (state) =>
      state.allData.resources.paymentTypes?.data?.map((type) => ({
        value: type.PaymentTypeName,
        label: type.PaymentTypeName,
      })) || []
  );

  const paymentMethodOptions = useSelector(
    (state) =>
      state.allData.resources.paymentMethods?.data?.map((method) => ({
        value: method.PaymentMethodName,
        label: method.PaymentMethodName,
      })) || []
  );

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // --- Store Options 
  const storeOptions = [
    { value: STATUS_VALUES.ALL, label: t("COMMON.ALL") },
    ...(Array.isArray(aStores)
      ? aStores.map((store) => ({
          value: store.StoreID,
          label: store.StoreName,
        }))
      : []),
  ];

  // --- URL Sync 
  useEffect(() => {
    const params = {};

    if (sSearchTerm) params.search = sSearchTerm;
    if (oFilters.paymentStatus) params.paymentStatus = oFilters.paymentStatus;
    if (oFilters.paymentType) params.paymentType = oFilters.paymentType;
    if (oFilters.paymentMethod) params.paymentMethod = oFilters.paymentMethod;
    if (oFilters.store !== STATUS_VALUES.ALL) params.store = oFilters.store; 

    if (currentPage > 1) params.page = currentPage.toString();

    // Handle date filters
    if (oFilters.startDate) {
      const startDate = formatDateForAPI(oFilters.startDate);
      if (startDate) params.startDate = startDate;
    }
    if (oFilters.endDate) {
      const endDate = formatDateForAPI(oFilters.endDate);
      if (endDate) params.endDate = endDate;
    }

    setSearchParams(params, { replace: true });
  }, [sSearchTerm, oFilters, currentPage, setSearchParams]);

  // Fetch filter options 
  useEffect(() => {
    dispatch(fetchResource({ key: "paymentStatus" }));
    dispatch(fetchResource({ key: "paymentTypes" }));
    dispatch(fetchResource({ key: "paymentMethods" }));
    dispatch(fetchResource({ key: "stores" }));
  }, [dispatch]);

  useEffect(() => {
    if (bShowFilterDropdown) {
      dispatch(fetchResource({ key: "stores" }));
    }
  }, [bShowFilterDropdown, dispatch]);

  // --- Filter Options 
  const aAdditionalFilters = [
    {
      label: t("COMMON.STATUS"),
      name: "paymentStatus",
      value: oFilters.paymentStatus,
      options: [
        { value: "", label: t("COMMON.ALL") },
        ...paymentStatusOptions,
      ],
    },
    {
      label: t("PAYMENTS.TYPE"),
      name: "paymentType",
      value: oFilters.paymentType,
      options: [
        { value: "", label: t("COMMON.ALL") },
        ...paymentTypeOptions,
      ],
    },
    {
      label: t("PAYMENTS.METHOD"),
      name: "paymentMethod",
      value: oFilters.paymentMethod,
      options: [
        { value: "", label: t("COMMON.ALL") },
        ...paymentMethodOptions,
      ],
    },
    {
      label: t("COMMON.STORE"),
      name: "store",
      value: oFilters.store,
      options: storeOptions,
      placeholder: t("USERS.FILTERS.STORE") || "Select Store",
      searchable: true,
      searchPlaceholder: t("COMMON.SEARCH_STORE") || "Search store",
      onInputChange: (inputValue) => handleDropdownInputChange(inputValue, "store"),
    },
    {
      label: t("COMMON.DATE_RANGE"),
      name: "dateRange",
      value: { start: oFilters.startDate, end: oFilters.endDate },
      type: "date",
    },
  ];

  // Delete popup state
  const [deletePopup, setDeletePopup] = useState({ open: false, paymentId: null });

  // --- Event Handlers ---
  const handleTableScroll = useCallback((e) => {
    setTableScrollTop(e.target.scrollTop);
  }, []);

  const handleView = (paymentID) => {
    navigate(`/payment-details/${paymentID}`);
  };

  const handleDelete = (paymentId) => {
    if (!hasDeletePermission) {
      showEmsg(t("COMMON.NO_DELETE_PERMISSION"), STATUS.ERROR);
      return;
    }
    setDeletePopup({ open: true, paymentId });
  };

  // --- Clear Filters
  const handleClearFilters = useCallback(() => {
    setSearchParams({}, { replace: true });
    setSearchTerm("");
    setFilters(defaultFilters);
    setCurrentPage(1);
  }, [setSearchParams]);

  // --- Filter Change Handler 
  const handleFilterChange = useCallback(
    (e, filterName) => {
      if (initialLoadComplete) {
        setFilterLoading(true);
      }

      if (filterName === "dateRange") {
        const dateValue = e.target?.value || e;
        setFilters((prev) => ({
          ...prev,
          startDate: dateValue?.start || null,
          endDate: dateValue?.end || null,
        }));
        setCurrentPage(1);
      } else {
        const { name, value } = e.target;
        setFilters((prev) => ({
          ...prev,
          [filterName || name]: value,
        }));
        setCurrentPage(1);
      }
    },
    [initialLoadComplete]
  );

  const handleDropdownInputChange = (inputValue, filterName) => {
    if (filterName === "store") {
      dispatch(fetchResource({ key: "stores", params: { searchText: inputValue } }));
    }
  };

  // Pagination handlers
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePageClick = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // --- Formatters ---
  const formatDateForAPI = (date) => {
    if (!date) return undefined;
    if (date.isValid && date.isValid()) {
      return date.toISOString();
    }
    if (typeof date === "string") return date;
    if (date instanceof Date) return date.toISOString();
    return undefined;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const formatCurrency = (amount) => {
    if (!amount) return "₹0.00";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  // --- Export Handler 
  const handleExportPayments = async () => {
    setExportLoading(true);
    try {
      const startDate = formatDateForAPI(oFilters.startDate);
      const endDate = formatDateForAPI(oFilters.endDate);

      await dispatch(
        exportPaymentReport({
          searchText: sSearchTerm,
          storeId: oFilters.store !== STATUS_VALUES.ALL ? oFilters.store : undefined,
          paymentStatus: oFilters.paymentStatus || undefined,
          paymentType: oFilters.paymentType || undefined,
          paymentMethod: oFilters.paymentMethod || undefined,
          startDate: startDate,
          endDate: endDate,
        })
      ).unwrap();
    } catch (error) {
      // Handle error if needed
    } finally {
      setExportLoading(false);
    }
  };

  // --- Delete Handlers ---
  const handleDeletePopupClose = () => {
    setDeletePopup({ open: false, paymentId: null });
  };

  const handleDeleteConfirm = async () => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");
      await apiDelete(`/deletePayment/${deletePopup.paymentId}`, token);
      showEmsg(t("PAYMENTS.DELETE_SUCCESS"), STATUS.SUCCESS);
      setDeletePopup({ open: false, paymentId: null });
      fetchPaymentsData(); // Refetch after delete
    } catch (err) {
      showEmsg(err?.response?.data?.MESSAGE || t("COMMON.API_ERROR"), STATUS.ERROR);
    } finally {
      setSubmitting(false);
    }
  };

  // --- Fetch Payments Data 
  const fetchPaymentsData = useCallback(async () => {
    try {
      if (initialLoadComplete) {
        setFilterLoading(true);
      } else {
        setPaymentsLoading(true);
      }

      const token = localStorage.getItem("token");

      const startDate = formatDateForAPI(oFilters.startDate);
      const endDate = formatDateForAPI(oFilters.endDate);

      const params = {
        pageNumber: currentPage,
        pageSize: itemsPerPage,
        ...(sSearchTerm && { searchText: sSearchTerm }),
      //  storeId 
        storeId: oFilters.store !== STATUS_VALUES.ALL ? oFilters.store : undefined,
        ...(oFilters.paymentStatus && { paymentStatus: oFilters.paymentStatus }),
        ...(oFilters.paymentType && { paymentType: oFilters.paymentType }),
        ...(oFilters.paymentMethod && { paymentMethod: oFilters.paymentMethod }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      };

      // Clean undefined params 
      Object.keys(params).forEach((key) => {
        if (params[key] === undefined || params[key] === "") {
          delete params[key];
        }
      });

      const response = await apiGet(GET_All_PAYMENTS, params, token);

      if (response.data.status === STATUS.SUCCESS.toLocaleUpperCase()) {
        const list = response.data.data || [];
        setPayments(list);
        setTotalItems(response.data.pagination?.totalRecords || list.length);
        setTotalPages(response.data.pagination?.totalPages || 1);
        setError(null);
      } else {
        setPayments([]);
        setTotalItems(0);
        setTotalPages(1);
        setError(response.data.message || t("PAYMENTS.NO_PAYMENTS_FOUND"));
      }
    } catch (err) {
      setError(err?.response?.data?.message || t("COMMON.ERROR_FETCHING_DATA"));
      setPayments([]);
      setTotalItems(0);
      setTotalPages(1);
    } finally {
      setPaymentsLoading(false);
      setFilterLoading(false);
      if (!initialLoadComplete) {
        setInitialLoadComplete(true);
      }
    }
  }, [
    currentPage,
    itemsPerPage,
    sSearchTerm,
    oFilters,
    initialLoadComplete,
    t,
  ]);

  // Fetch data on mount and filter changes
  useEffect(() => {
    fetchPaymentsData();
  }, [fetchPaymentsData]);

  // Reset page on search/filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [sSearchTerm, oFilters]);

  // Set title
  useEffect(() => {
    setTitle(t("PAYMENTS.HEADING"));
    return () => {
      setBackButton(null);
      setTitle("");
    };
  }, [setBackButton, setTitle, t]);

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-2 min-h-screen bg-gray-50">
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
        searchPlaceholder={t("PAYMENTS.SEARCH_PLACEHOLDER")}
        onClearFilters={handleClearFilters}
        onExport={handleExportPayments}
        exportLabel={exportLoading ? t("COMMON.EXPORTING") : t("COMMON.EXPORT")}
        showCreateButton={false}
      />

      {viewMode === "table" ? (
        <div className="table-container-floating">
          <div className="table-wrapper-floating" onScroll={handleTableScroll}>
            <table className="table-base">
              <thead
                className={`table-head-floating ${
                  tableScrollTop > 10 ? "table-head-floating-shadow" : ""
                }`}
              >
                <tr>
                  <th scope="col" className="table-head-cell-floating w-1/4">
                    {t("PAYMENTS.PAYMENT_DETAILS")}
                  </th>
                  <th scope="col" className="table-head-cell-floating w-1/5">
                    {t("PAYMENTS.ORDER_INFO")}
                  </th>
                  <th scope="col" className="table-head-cell-floating w-1/6 text-right pr-8">
                    <div className="flex justify-end items-center">
                      {t("PAYMENTS.AMOUNT")}
                    </div>
                  </th>
                  <th scope="col" className="table-head-cell-floating w-1/6 pl-4">
                    {t("COMMON.STATUS")}
                  </th>
                  <th scope="col" className="table-head-cell-floating w-1/6">
                    {t("COMMON.ACTIONS")}
                  </th>
                </tr>
              </thead>
              <tbody className="table-body">
                {(bFilterLoading || paymentsLoading) ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center">
                      <div className="flex justify-center">
                        <Loader size="small" />
                      </div>
                    </td>
                  </tr>
                ) : sError ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      {sError}
                    </td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      {t("PAYMENTS.NO_PAYMENTS_FOUND")}
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr key={payment.PaymentID} className="table-row">
                      <td className="table-cell w-1/4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <CreditCard className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="ml-4 min-w-0">
                            <div className="table-cell-text ellipsis-text">
                              {payment.PaymentRefID}
                            </div>
                            <div className="table-cell-subtext flex items-center">
                              <Calendar className="h-4 w-4 mr-1 flex-shrink-0" />
                              <span className="ellipsis-text">
                                {formatDate(payment.PaymentDate)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell w-1/5">
                        <div className="table-cell-text flex items-center">
                          <FileText className="h-4 w-4 mr-1 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{payment.Order?.OrderRefID}</span>
                        </div>
                        <div className="table-cell-subtext flex items-center">
                          <User className="h-4 w-4 mr-1 text-gray-400 flex-shrink-0" />
                          <span className="truncate">
                            {payment.PaymentType?.PaymentTypeName || "N/A"}
                          </span>
                        </div>
                        {payment.PaymentMethod?.PaymentMethodName && (
                          <div className="table-cell-subtext flex items-center">
                            <CreditCard className="h-4 w-4 mr-1 text-gray-400 flex-shrink-0" />
                            <span className="truncate">
                              {payment.PaymentMethod.PaymentMethodName}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="table-cell w-1/6 text-right font-medium text-gray-900 pr-8">
                        <div className="flex justify-end">
                          {formatCurrency(payment.Amount)}
                        </div>
                      </td>
                      <td className="table-cell text-center w-1/6 pl-4">
                        <span
                          className={`status-badge ${
                            payment.PaymentStatus?.PaymentStatusID === 1
                              ? "status-pending"
                              : payment.PaymentStatus?.PaymentStatusID === 2
                              ? "status-active"
                              : "status-inactive"
                          }`}
                        >
                          {payment.PaymentStatus?.PaymentStatusName}
                        </span>
                      </td>
                      <td className="table-cell w-1/6 font-medium text-center">
                        <button
                          className="flex items-center justify-center gap-1 text-blue-600 hover:text-blue-800 mx-auto"
                          title="View"
                          onClick={() => handleView(payment.PaymentID)}
                        >
                          <Eye className="w-4 h-4" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {(bFilterLoading || paymentsLoading) ? (
            <div className="col-span-full flex justify-center py-8">
              <Loader size="medium" />
            </div>
          ) : sError ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              {sError}
            </div>
          ) : payments.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              {t("PAYMENTS.NO_PAYMENTS_FOUND")}
            </div>
          ) : (
            payments.map((payment) => (
              <div
                key={payment.PaymentID}
                className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 flex flex-col gap-4 hover:shadow-xl transition-shadow duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center min-w-0">
                    <CreditCard className="h-6 w-6 text-blue-600 mr-2 flex-shrink-0" />
                    <span className="font-semibold truncate">
                      {payment.PaymentRefID}
                    </span>
                  </div>
                  <span
                    className={`status-badge ${
                      payment.PaymentStatus?.PaymentStatusID === 1
                        ? "status-pending"
                        : payment.PaymentStatus?.PaymentStatusID === 2
                        ? "status-active"
                        : "status-inactive"
                    }`}
                  >
                    {payment.PaymentStatus?.PaymentStatusName}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  <div className="flex items-center mb-1">
                    <Calendar className="h-4 w-4 mr-1 flex-shrink-0" />
                    <span className="truncate">{formatDate(payment.PaymentDate)}</span>
                  </div>
                  <div className="flex items-center mb-1">
                    <FileText className="h-4 w-4 mr-1 flex-shrink-0" />
                    <span className="truncate">Order: {payment.OrderID}</span>
                  </div>
                  <div className="flex items-center mb-1">
                    <CreditCard className="h-4 w-4 mr-1 flex-shrink-0" />
                    <span className="truncate">
                      Type: {payment.PaymentType?.PaymentTypeName || "N/A"}
                    </span>
                  </div>
                  {payment.PaymentMethod && (
                    <div className="flex items-center mb-1">
                      <CreditCard className="h-4 w-4 mr-1 flex-shrink-0" />
                      <span className="truncate">
                        Method: {payment.PaymentMethod?.PaymentMethodName}
                      </span>
                    </div>
                  )}
                  <div className="text-lg font-bold text-gray-900 text-right mt-2">
                    {formatCurrency(payment.Amount)}
                  </div>
                </div>
                <button
                  className="flex items-center justify-center gap-1 text-blue-600 hover:text-blue-800 mt-2"
                  onClick={() => handleView(payment.PaymentID)}
                >
                  <Eye className="w-4 h-4" />
                  <span>View Details</span>
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Delete Confirmation Popup */}
      {deletePopup.open && (
        <FullscreenErrorPopup
          open={deletePopup.open}
          message={t("PAYMENTS.DELETE_CONFIRM_MESSAGE")}
          onClose={handleDeletePopupClose}
          onConfirm={handleDeleteConfirm}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
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
  );
};

export default Payments;
