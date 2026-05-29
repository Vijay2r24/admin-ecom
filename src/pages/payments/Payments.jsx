import React, { useState, useEffect, useCallback } from "react";
import { Calendar, CreditCard, FileText, User, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Toolbar from "../../components/Toolbar";
import Pagination from "../../components/Pagination";
import ActionButtons from "../../components/ActionButtons";
import { useTranslation } from "react-i18next";
import { useTitle } from "../../context/TitleContext";
import FullscreenErrorPopup from "../../components/FullscreenErrorPopup";
import { SKELETON_TYPES } from "../../contants/constants";
import { ToastContainer } from "react-toastify";
import { ITEMS_PER_PAGE, STATUS, MODULES, PERMISSIONS } from "../../contants/constants";
import { apiDelete, apiGet } from "../../utils/ApiUtils";
import Loader from "../../components/Loader";
import SkeletonLoader from "../../components/SkeletonLoader";
import {
  getPermissionCode,
  hasPermissionId,
} from "../../utils/permissionUtils";
import { fetchResource } from "../../store/slices/allDataSlice";
import { GET_All_PAYMENTS } from "../../contants/apiRoutes";
import { exportPaymentReport } from "../../store/slices/exportSlice";
import { showEmsg } from "../../utils/ShowEmsg.jsx";

const Payments = () => {
  const { t } = useTranslation();
  const { setBackButton, setTitle } = useTitle();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [tableScrollTop, setTableScrollTop] = useState(0); // For floating header

  const [sSearchTerm, setSearchTerm] = useState("");
  const [bShowFilterDropdown, setShowFilterDropdown] = useState(false);

  const defaultFilters = {
    paymentStatusId: [],
    paymentTypeId: [],
    paymentMethodId: [],
    startDate: null,
    endDate: null,
  };

  const [oFilters, setFilters] = useState(defaultFilters);
  const [bSubmitting, setSubmitting] = useState(false);
  const [bFilterLoading, setFilterLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const permissionIdForDelete = getPermissionCode(
    "Payment Management",
    "Delete Payment"
  );
  const hasDeletePermission = hasPermissionId(permissionIdForDelete);

  // Permission check for Edit Payment
  const permissionIdForEdit = getPermissionCode(
    MODULES.PAYMENT,
    PERMISSIONS.EDIT_PAYMENT
  );
  const hasEditPermission = hasPermissionId(permissionIdForEdit);

  // Permission check for View Payment Details
  const permissionIdForView = getPermissionCode(
    "Payments Management", // Changed to match API
    "View Payment Details"
  );
  const hasViewPermission = hasPermissionId(permissionIdForView);

  // Permission check for Generate Payment Report
  const permissionIdForExport = getPermissionCode(
    "Payments Management", // Changed to match API
    "Generate Payment Report"
  );
  const hasExportPermission = hasPermissionId(permissionIdForExport);
  const paymentStatusOptions = useSelector(
    (state) =>
      state.allData.resources.paymentStatus?.data?.map((status) => ({
        value: status.PaymentStatusID,
        label: status.PaymentStatusName,
      })) || []
  );

  const paymentTypeOptions = useSelector(
    (state) =>
      state.allData.resources.paymentTypes?.data?.map((type) => ({
        value: type.PaymentTypeID,
        label: type.PaymentTypeName,
      })) || []
  );

  const paymentMethodOptions = useSelector(
    (state) =>
      state.allData.resources.paymentMethods?.data?.map((method) => ({
        value: method.PaymentMethodID,
        label: method.PaymentMethodName,
      })) || []
  );

  // Hide body scrollbar when component mounts
  useEffect(() => {
    document.body.style.overflow = "hidden";

    // Re-enable scrollbar when component unmounts
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const aAdditionalFilters = [
    {
      label: t("COMMON.STATUS"),
      name: "paymentStatusId",
      value: oFilters.paymentStatusId,
      options: paymentStatusOptions,
      multiple: true,
    },
    {
      label: t("PAYMENTS.TYPE"),
      name: "paymentTypeId",
      value: oFilters.paymentTypeId,
      options: paymentTypeOptions,
      multiple: true,
    },
    {
      label: t("PAYMENTS.METHOD"),
      name: "paymentMethodId",
      value: oFilters.paymentMethodId,
      options: paymentMethodOptions,
      multiple: true,
    },
    {
      label: t("COMMON.DATE_RANGE"),
      name: "dateRange",
      value: { start: oFilters.startDate, end: oFilters.endDate },
      type: "date",
    },
  ];

  const [deletePopup, setDeletePopup] = useState({
    open: false,
    paymentId: null,
  });

  const itemsPerPage = ITEMS_PER_PAGE;
  const [viewMode, setViewMode] = useState("table");
  const [currentPage, setCurrentPage] = useState(1);

  // Handle table scroll for floating header
  const handleTableScroll = useCallback((e) => {
    setTableScrollTop(e.target.scrollTop);
  }, []);



  const handleDelete = (paymentId) => {
    if (!hasDeletePermission) {
      showEmsg(t("COMMON.NO_DELETE_PERMISSION"), STATUS.ERROR);
      return;
    }
    setDeletePopup({ open: true, paymentId });
  };

  const handleEdit = (paymentId) => {
    // Navigate to edit payment page if needed in the future
    // For now, payments might not be editable, so this can be left empty
    // navigate(`/edit-payment/${paymentId}`);
  };

  const handleClearFilters = () => {
    setFilters(defaultFilters);
    setCurrentPage(1);
  };

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

  const handleExportPayments = async () => {
    // Check permission before exporting
    if (!hasExportPermission) {
      return;
    }
    
    setExportLoading(true);
    try {
      // Format dates for API
      const startDate = formatDateForAPI(oFilters.startDate);
      const endDate = formatDateForAPI(oFilters.endDate);

      await dispatch(
        exportPaymentReport({
          searchText: sSearchTerm,
          paymentStatusId: Array.isArray(oFilters.paymentStatusId) && oFilters.paymentStatusId.length > 0 ? oFilters.paymentStatusId : undefined,
          paymentTypeId: Array.isArray(oFilters.paymentTypeId) && oFilters.paymentTypeId.length > 0 ? oFilters.paymentTypeId : undefined,
          paymentMethodId: Array.isArray(oFilters.paymentMethodId) && oFilters.paymentMethodId.length > 0 ? oFilters.paymentMethodId : undefined,
          startDate: startDate,
          endDate: endDate,
        })
      ).unwrap();

      // Optional: Show success message
      // toast.success(t("PAYMENTS.EXPORT_SUCCESS"));
    } catch (error) {
    } finally {
      setExportLoading(false);
    }
  };

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
      await fetchPaymentsData();
    } catch (err) {
      showEmsg(
        err?.response?.data?.MESSAGE || t("COMMON.API_ERROR"),
        STATUS.ERROR
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleFilterChange = useCallback(
    (e, filterName) => {
      if (initialLoadComplete) {
        setFilterLoading(true);
      }

      if (filterName === "dateRange") {
        const dateValue = e.target?.value || e; // handles different structures
        setFilters((prev) => ({
          ...prev,
          startDate: dateValue?.start || null,
          endDate: dateValue?.end || null,
        }));

        // 👇 ensure page resets and re-fetch triggers properly
        setCurrentPage(1);
      } else if (Array.isArray(e.target?.value)) {
        // handle multi-select
        setFilters((prev) => ({
          ...prev,
          [filterName]: e.target.value,
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
      // Scroll to top when page changes
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const fetchPaymentsData = async () => {
    try {
      const token = localStorage.getItem("token");

      // Format dates for API
      const startDate = formatDateForAPI(oFilters.startDate);
      const endDate = formatDateForAPI(oFilters.endDate);

      const params = {
        pageNumber: currentPage,
        pageSize: itemsPerPage,
        ...(sSearchTerm && { searchText: sSearchTerm }),
        ...(Array.isArray(oFilters.paymentStatusId) && oFilters.paymentStatusId.length > 0 && { paymentStatusId: oFilters.paymentStatusId }),
        ...(Array.isArray(oFilters.paymentTypeId) && oFilters.paymentTypeId.length > 0 && { paymentTypeId: oFilters.paymentTypeId }),
        ...(Array.isArray(oFilters.paymentMethodId) && oFilters.paymentMethodId.length > 0 && { paymentMethodId: oFilters.paymentMethodId }),
        ...(startDate && { startDate: startDate }),
        ...(endDate && { endDate: endDate }),
      };

      // remove empty keys
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
      }
    } catch (err) {
    }
  };

  useEffect(() => {
    dispatch(fetchResource({ key: "paymentStatus" }));
    dispatch(fetchResource({ key: "paymentTypes" }));
    dispatch(fetchResource({ key: "paymentMethods" }));
  }, [dispatch]);

  useEffect(() => {
    const loadPayments = async () => {
      setFilterLoading(true);
      await fetchPaymentsData();
      setFilterLoading(false);
      if (!initialLoadComplete) {
        setInitialLoadComplete(true);
      }
    };

    loadPayments();
    setTitle(t("PAYMENTS.HEADING"));

    return () => {
      setBackButton(null);
      setTitle("");
    };
  }, [
    currentPage,
    itemsPerPage,
    sSearchTerm,
    oFilters.paymentStatusId,
    oFilters.paymentTypeId,
    oFilters.paymentMethodId,
    oFilters.startDate,
    oFilters.endDate,
    setBackButton,
    setTitle,
    t,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [sSearchTerm, oFilters]);

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
        searchPlaceholder={t("PAYMENTS.SEARCH_PLACEHOLDER")}
        onClearFilters={handleClearFilters}
        isBrowsePage={false}
        onExport={handleExportPayments}
        exportLabel={exportLoading ? t("COMMON.EXPORTING") : t("COMMON.EXPORT")}
        exportDisabled={!hasExportPermission}
        showCreateButton={false}
      />

      {viewMode === "table" ? (
        <div className="table-container-floating">
          <div className="table-wrapper-floating" onScroll={handleTableScroll}>
            <table className="table-base">
              {/* Floating Header */}
              <thead
                className={`table-head-floating ${tableScrollTop > 10 ? "table-head-floating-shadow" : ""
                  }`}
              >
                <tr>
                  <th scope="col" className="table-head-cell-floating w-1/4">
                    {t("PAYMENTS.PAYMENT_DETAILS")}
                  </th>
                  <th scope="col" className="table-head-cell-floating w-1/5">
                    {t("PAYMENTS.ORDER_INFO")}
                  </th>
                  <th
                    scope="col"
                    className="table-head-cell-floating w-1/6 text-right pr-8"
                  >
                    <div className="flex justify-end items-center">
                      {t("PAYMENTS.AMOUNT")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="table-head-cell-floating w-1/6 text-center"
                  >
                    {t("COMMON.STATUS")}
                  </th>
                  <th scope="col" className="table-head-cell-floating w-1/6">
                    {t("COMMON.ACTIONS")}
                  </th>
                </tr>
              </thead>
              <tbody className="table-body">
                {bFilterLoading ? (
                  <SkeletonLoader type={SKELETON_TYPES.PAYMENT_TABLE} rows={6} />
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
                            {/* Highlighted main text for Payment Reference */}
                            <div className="table-cell-text ellipsis-text font-medium text-gray-900">
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
                        {/* Highlighted main text for Order Info */}
                        <div className="table-cell-text flex items-center font-medium text-gray-900">
                          <FileText className="h-4 w-4 mr-1 text-gray-400 flex-shrink-0" />
                          <span className="truncate">
                            {payment.Order.OrderRefID}
                          </span>
                        </div>

                        {/* Subtext for Payment Type */}
                        <div className="table-cell-subtext flex items-center">
                          <User className="h-4 w-4 mr-1 text-gray-400 flex-shrink-0" />
                          <span className="truncate">
                            {payment.PaymentType?.PaymentTypeName || "N/A"}
                          </span>
                        </div>

                        {/* Subtext for Payment Method */}
                        {payment.PaymentMethod?.PaymentMethodName && (
                          <div className="table-cell-subtext flex items-center">
                            <CreditCard className="h-4 w-4 mr-1 text-gray-400 flex-shrink-0" />
                            <span className="truncate">
                              {payment.PaymentMethod.PaymentMethodName}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="table-cell w-1/6 text-right pr-8">
                        {/* Highlighted main text for Amount */}
                        <div className="table-cell-text font-medium text-gray-900">
                          {formatCurrency(payment.Amount)}
                        </div>
                      </td>
                      <td className="table-cell w-1/6 text-center">
                        <span
                          className={`status-badge ${payment.PaymentStatus?.PaymentStatusID === 1
                            ? "status-pending"
                            : payment.PaymentStatus?.PaymentStatusID === 2
                              ? "status-active"
                              : "status-inactive"
                            }`}
                        >
                          {payment.PaymentStatus?.PaymentStatusName}
                        </span>
                      </td>
                      <td className="table-cell w-1/6 align-middle">
                        <div className="flex justify-center">
                          <ActionButtons
                            id={payment.PaymentID}
                            viewLink={`/payment-details/${payment.PaymentID}`}
                            hasViewPermission={hasViewPermission}
                            onEdit={hasEditPermission ? handleEdit : undefined}
                            disableEdit={!hasEditPermission}
                            // Delete button removed
                          />
                        </div>
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
          {bFilterLoading ? (
            <SkeletonLoader type={SKELETON_TYPES.PAYMENT_GRID} rows={8} />
          ) : payments.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              {t("PAYMENTS.NO_PAYMENTS_FOUND")}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 auto-rows-min">
            {payments.map((payment) => (
              <div
                key={payment.PaymentID}
                className="bg-white rounded-xl shadow-md border border-gray-200 p-4 hover:shadow-lg transition-all duration-200 min-h-[200px] flex flex-col"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center min-w-0 flex-1">
                    <CreditCard className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0" />
                    <span className="font-semibold text-sm truncate">
                      {payment.PaymentRefID}
                    </span>
                  </div>
                  <span
                    className={`status-badge text-xs px-2 py-1 rounded-full ${payment.PaymentStatus?.PaymentStatusID === 1
                      ? "bg-yellow-100 text-yellow-800"
                      : payment.PaymentStatus?.PaymentStatusID === 2
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                      }`}
                  >
                    {payment.PaymentStatus?.PaymentStatusName}
                  </span>
                </div>

                {/* Payment Details */}
                <div className="flex-1 space-y-2 text-sm">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-600">
                      {formatDate(payment.PaymentDate)}
                    </span>
                  </div>
                  
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-600 truncate">
                      Order: {payment.OrderID || "N/A"}
                    </span>
                  </div>
                  
                  <div className="flex items-center">
                    <CreditCard className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-600 truncate">
                      {payment.PaymentType?.PaymentTypeName || "N/A"}
                    </span>
                  </div>
                  
                  {payment.PaymentMethod && (
                    <div className="flex items-center">
                      <CreditCard className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-600 truncate">
                        {payment.PaymentMethod?.PaymentMethodName}
                      </span>
                    </div>
                  )}
                </div>

                {/* Amount and Actions */}
                <div className="mt-auto pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold text-gray-900">
                      {formatCurrency(payment.Amount)}
                    </div>
                    <ActionButtons
                      id={payment.PaymentID}
                      viewLink={`/payment-details/${payment.PaymentID}`}
                      hasViewPermission={hasViewPermission}
                      onEdit={hasEditPermission ? handleEdit : undefined}
                      disableEdit={!hasEditPermission}
                      // Delete button removed
                    />
                  </div>
                </div>
              </div>
            ))
            }
            </div>
          )}
          </div>
        </div>
      )}

      {deletePopup.open && (
        <FullscreenErrorPopup
          open={deletePopup.open}
          message={t("PAYMENTS.DELETE_CONFIRM_MESSAGE")}
          onClose={handleDeletePopupClose}
          onConfirm={handleDeleteConfirm}
        />
      )}

      <div className="sticky bottom-0 bg-white border-t border-gray-200 z-10">
        {bFilterLoading ? (
          <SkeletonLoader type={SKELETON_TYPES.PAGINATION} />
        ) : (
          totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              handlePrevPage={handlePrevPage}
              handleNextPage={handleNextPage}
              handlePageClick={handlePageClick}
            />
          )
        )}
      </div>
    </div>
  );
};

export default Payments;