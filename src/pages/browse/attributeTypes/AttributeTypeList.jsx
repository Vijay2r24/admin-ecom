import { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import Toolbar from "../../../components/Toolbar";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { showEmsg } from "../../../utils/ShowEmsg";
import Pagination from "../../../components/Pagination";
import FullscreenErrorPopup from "../../../components/FullscreenErrorPopup";
import Switch from "../../../components/Switch";
import { UPDATE_ATTRIBUTE_TYPE_STATUS } from "../../../contants/apiRoutes";
import {
  ITEMS_PER_PAGE,
  DEFAULT_PAGE,
  STATUS,
  STATUS_VALUES,
  STATUS_OPTIONS,
} from "../../../contants/constants";
import { hideLoaderWithDelay } from "../../../utils/loaderUtils";
import {
  fetchResource,
  updateStatusById,
  clearResourceError,
} from "../../../store/slices/allDataSlice"; // Adjust path as needed

const AttributeTypeList = ({ onCreate, onBack, setSubmitting }) => {
  const [sSearchQuery, setSearchQuery] = useState("");
  const [bShowFilter, setShowFilter] = useState(false);
  const [oFilters, setFilters] = useState({ status: STATUS_VALUES.ALL });
  const [tableScrollTop, setTableScrollTop] = useState(0); // For floating header
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const {
    data: aAttributeTypes = [],
    loading: bLoading = false,
    error: sError = null,
    total: iTotalItems = 0,
    pagination,
  } = useSelector((state) => state.allData.resources.attributeTypes || {});

  const [iCurrentPage, setCurrentPage] = useState(DEFAULT_PAGE);
  const [iItemsPerPage] = useState(ITEMS_PER_PAGE);
  const [statusPopup, setStatusPopup] = useState({
    open: false,
    AttributeTypeID: null,
    newStatus: null,
  });

  // Hide body scrollbar when component mounts
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    
    // Re-enable scrollbar when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    const params = {
      pageNumber: iCurrentPage,
      pageSize: iItemsPerPage,
      searchText: sSearchQuery,
    };
    if (oFilters.status !== STATUS_VALUES.ALL) {
      params.IsActive = oFilters.status;
    }
    dispatch(fetchResource({ key: "attributeTypes", params }));
  }, [dispatch, iCurrentPage, iItemsPerPage, sSearchQuery, oFilters.status]);

  // Clear error on unmount or when needed
  useEffect(() => {
    return () => {
      dispatch(clearResourceError("attributeTypes"));
    };
  }, [dispatch]);

  // Handle table scroll for floating header
  const handleTableScroll = useCallback((e) => {
    setTableScrollTop(e.target.scrollTop);
  }, []);

  const handleStatusChange = (AttributeTypeID, currentIsActive) => {
    setStatusPopup({
      open: true,
      AttributeTypeID,
      newStatus: !currentIsActive,
    });
  };

  const handleStatusConfirm = async () => {
    if (setSubmitting) setSubmitting(true);

    const { AttributeTypeID, newStatus } = statusPopup;
    try {
      const result = await dispatch(
        updateStatusById({
          key: "attributeTypes",
          id: AttributeTypeID,
          newStatus,
          apiRoute: UPDATE_ATTRIBUTE_TYPE_STATUS,
          idField: "AttributeTypeID",
        })
      ).unwrap(); // Use unwrap to get the payload or throw error

      showEmsg(result.message, result.status || STATUS.SUCCESS);
    } catch (err) {
      showEmsg(t("COMMON.API_ERROR"), STATUS.ERROR);
    } finally {
      setStatusPopup({ open: false, AttributeTypeID: null, newStatus: null });

      // refetch after update
      const params = {
        pageNumber: iCurrentPage,
        pageSize: iItemsPerPage,
        searchText: sSearchQuery,
      };
      if (oFilters.status !== STATUS_VALUES.ALL) {
        params.isActive = oFilters.status;
      }
      dispatch(fetchResource({ key: "attributeTypes", params }));

      hideLoaderWithDelay(setSubmitting);
    }
  };

  const handleStatusPopupClose = () => {
    setStatusPopup({ open: false, AttributeTypeID: null, newStatus: null });
  };

  const handleFilterChange = (e, filterName) => {
    setFilters({
      ...oFilters,
      [filterName]: e.target.value,
    });
    // Reset to page 1 when filters change
    setCurrentPage(DEFAULT_PAGE);
  };

  const iTotalPages = Math.ceil(iTotalItems / iItemsPerPage);

  const handlePageClick = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleNextPage = () => {
    if (iCurrentPage < iTotalPages) {
      setCurrentPage((prev) => prev + DEFAULT_PAGE);
    }
  };

  const handlePrevPage = () => {
    if (iCurrentPage > DEFAULT_PAGE) {
      setCurrentPage((prev) => prev - DEFAULT_PAGE);
    }
  };

  // Map STATUS_OPTIONS to the format
  const statusFilterOptions = STATUS_OPTIONS.map((option) => ({
    value: option.value,
    label: t(option.labelKey),
  }));

  return (
    <div 
      className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-2 min-h-screen bg-gray-50"
      style={{
        // Hide scrollbar for all browsers
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',
      }}
    >
      {/* Inline style tag for Webkit browsers (Chrome, Safari) */}
      <style>
        {`
          .max-w-8xl::-webkit-scrollbar {
            display: none;
          }
          
          /* Custom scrollbar for table */
          .table-scroll-container::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          .table-scroll-container::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 4px;
          }
          .table-scroll-container::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 4px;
          }
          .table-scroll-container::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
        `}
      </style>
      <div className="mb-6">
        <Toolbar
          searchTerm={sSearchQuery}
          setSearchTerm={setSearchQuery}
          showFilterDropdown={bShowFilter}
          setShowFilterDropdown={setShowFilter}
          searchPlaceholder={t(
            "PRODUCT_SETUP.ATTRIBUTE_TYPE.SEARCH_PLACEHOLDER"
          )}
          showSearch={true}
          showViewToggle={false}
          showFilterButton={true}
          onCreate={onCreate}
          createLabel={t("PRODUCT_SETUP.CREATE")}
          additionalFilters={
            bShowFilter
              ? [
                  {
                    label: t("COMMON.STATUS"),
                    name: "status",
                    value: oFilters.status,
                    options: statusFilterOptions,
                  },
                ]
              : []
          }
          handleFilterChange={bShowFilter ? handleFilterChange : undefined}
        />
      </div>
      {bLoading && (
        <div className="text-center py-8 text-gray-500">
          {t("COMMON.LOADING")}
        </div>
      )}

      {sError && !bLoading && (
        <div className="text-center py-8 text-red-500">
          {t("COMMON.ERROR")}: {sError}
        </div>
      )}

      {!bLoading && !sError && (
        <div className="table-container-floating bg-white rounded-xl shadow-sm border border-gray-100 relative">
          <div
            className="table-scroll-container overflow-x-auto overflow-y-auto max-h-[calc(100vh-200px)]"
            onScroll={handleTableScroll}
          >
            <table className="table-base w-full">
              {/* Floating Header */}
              <thead
                className={`table-head-floating sticky top-0 z-10 ${
                  tableScrollTop > 10 ? "shadow-sm" : ""
                }`}
              >
                <tr>
                  <th className="table-head-cell-floating text-left px-6 py-4">
                    {t("PRODUCT_SETUP.ATTRIBUTE_TYPE.NAME")}
                  </th>
                  <th className="table-head-cell-floating text-center px-6 py-4">
                    {t("PRODUCT_SETUP.ATTRIBUTE_TYPE.DESCRIPTION_LABEL")}
                  </th>
                  <th className="table-head-cell-floating text-center px-6 py-4">
                    {t("PRODUCT_SETUP.ATTRIBUTE_TYPE.ATTRIBUTES")}
                  </th>
                  <th className="table-head-cell-floating text-center px-6 py-4">
                    {t("COMMON.STATUS")}
                  </th>
                  <th className="table-head-cell-floating text-center px-6 py-4">
                    {t("COMMON.UPDATE_STATUS")}
                  </th>
                </tr>
              </thead>

              <tbody className="table-body">
                {aAttributeTypes.map((type) => (
                  <tr
                    key={type.AttributeTypeID}
                    className={`table-row items-center hover:bg-gray-50 ${
                      !type.IsActive ? "bg-gray-50" : ""
                    }`}
                  >
                    {/* Name */}
                    <td className="table-cell text-left align-middle px-6 py-4">
                      {type.IsActive ? (
                        <Link
                          to={`/browse/editattributetype/${type.AttributeTypeID}`}
                          className="text-sm font-medium text-blue-600 hover:underline block truncate max-w-[180px]"
                          title={type.Name}
                        >
                          {type.Name}
                        </Link>
                      ) : (
                        <span
                          className="text-sm font-medium text-gray-500 block truncate max-w-[180px] cursor-not-allowed"
                          title={t(
                            "PRODUCT_SETUP.ATTRIBUTE_TYPE.EDIT_DISABLED_TOOLTIP"
                          )}
                        >
                          {type.Name}
                        </span>
                      )}
                    </td>

                    {/* Description */}
                    <td
                      className={`table-cell text-center align-middle px-6 py-4 ${
                        !type.IsActive ? "text-gray-400" : ""
                      }`}
                    >
                      <div
                        className="table-cell-subtext truncate max-w-[220px] mx-auto"
                        title={type.AttributeTypeDescription}
                      >
                        {type.AttributeTypeDescription}
                      </div>
                    </td>

                    {/* Total Attributes */}
                    <td className="table-cell text-center align-middle px-6 py-4">
                      <div
                        className={`text-sm font-medium ${
                          !type.IsActive ? "text-gray-400" : "text-gray-700"
                        }`}
                      >
                        {type.TotalAttributes}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="table-cell text-center align-middle px-6 py-4">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                          type.IsActive 
                            ? "bg-green-100 text-green-800 border border-green-200" 
                            : "bg-red-100 text-red-800 border border-red-200"
                        }`}
                      >
                        {t(`COMMON.${type.IsActive ? "ACTIVE" : "INACTIVE"}`)}
                      </span>
                    </td>

                    {/* Switch */}
                    <td className="table-cell text-center align-middle px-6 py-4">
                      <div className="flex justify-center">
                        <Switch
                          checked={type.IsActive}
                          onChange={() =>
                            handleStatusChange(
                              type.AttributeTypeID,
                              type.IsActive
                            )
                          }
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!bLoading && !sError && aAttributeTypes.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="text-gray-500">
            {t("PRODUCT_SETUP.ATTRIBUTE_TYPE.EMPTY_MESSAGE")}
          </div>
          {sSearchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="mt-2 text-[#5B45E0] hover:text-[#4c39c7] font-medium"
            >
              {t("COMMON.CLEAR_SEARCH")}
            </button>
          )}
        </div>
      )}

      {/* Pagination Controls - Fixed at bottom */}
      {iTotalItems > 0 && !bLoading && (
          <Pagination
            currentPage={iCurrentPage}
            totalPages={iTotalPages}
            totalItems={iTotalItems}
            itemsPerPage={iItemsPerPage}
            handlePrevPage={handlePrevPage}
            handleNextPage={handleNextPage}
            handlePageClick={handlePageClick}
          />
      )}

      {statusPopup.open && (
        <FullscreenErrorPopup
          message={
            statusPopup.newStatus
              ? t("PRODUCT_SETUP.ATTRIBUTE_TYPE.CONFIRM_ACTIVATE")
              : t("PRODUCT_SETUP.ATTRIBUTE_TYPE.CONFIRM_DEACTIVATE")
          }
          onClose={handleStatusPopupClose}
          onConfirm={handleStatusConfirm}
        />
      )}
    </div>
  );
};

export default AttributeTypeList;