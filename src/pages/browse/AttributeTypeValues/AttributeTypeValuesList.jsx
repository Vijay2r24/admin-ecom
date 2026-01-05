import { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import CreateAttribute from "./CreateAttributeTypeValuesList";
import Toolbar from "../../../components/Toolbar";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import Pagination from "../../../components/Pagination";
import FullscreenErrorPopup from "../../../components/FullscreenErrorPopup";
import Switch from "../../../components/Switch";
import { showEmsg } from "../../../utils/ShowEmsg";
import { UPDATE_ATTRIBUTRE_VALUE_STATUS } from "../../../contants/apiRoutes";
import {
  ITEMS_PER_PAGE,
  DEFAULT_PAGE,
  STATUS,
  STATUS_VALUES,
  STATUS_OPTIONS,
  customScrollbarStyles,
} from "../../../contants/constants";
import { hideLoaderWithDelay } from "../../../utils/loaderUtils";
import {
  fetchResource,
  updateStatusById,
  clearResourceError,
} from "../../../store/slices/allDataSlice";

const AttributeTypeValueList = ({ onCreate, onBack, setSubmitting }) => {
  const [sSearchQuery, setSearchQuery] = useState("");
  const [oFilters, setFilters] = useState({ status: STATUS_VALUES.ALL });
  const [bShowFilter, setShowFilter] = useState(false);
  const [bShowCreate, setShowCreate] = useState(false);
  const [tableScrollTop, setTableScrollTop] = useState(0);
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const {
    data: aAttributes = [],
    loading: bLoading = false,
    error: sError = null,
    total: iTotalItems = 0,
  } = useSelector((state) => state.allData.resources.attributes || {});

  const [iCurrentPage, setCurrentPage] = useState(DEFAULT_PAGE);
  const [iItemsPerPage] = useState(ITEMS_PER_PAGE);

  const [bShowErrorPopup, setShowErrorPopup] = useState(false);
  const [sErrorMessage, setErrorMessage] = useState("");

  const [statusPopup, setStatusPopup] = useState({
    open: false,
    attributeId: null,
    newStatus: null,
  });

  const iTotalPages = Math.ceil(iTotalItems / iItemsPerPage);

  // Hide body scrollbar when component mounts
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
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
    dispatch(fetchResource({ key: "attributes", params }));
  }, [dispatch, iCurrentPage, iItemsPerPage, sSearchQuery, oFilters.status]);

  // Clear error on unmount
  useEffect(() => {
    return () => {
      dispatch(clearResourceError("attributes"));
    };
  }, [dispatch]);

  // Handle table scroll for floating header
  const handleTableScroll = useCallback((e) => {
    setTableScrollTop(e.target.scrollTop);
  }, []);

  // --- Status Update Handler ---
  const handleStatusChange = (attributeId, currentIsActive) => {
    setStatusPopup({ open: true, attributeId, newStatus: !currentIsActive });
  };

  const handleStatusConfirm = async () => {
    if (setSubmitting) setSubmitting(true);

    const { attributeId, newStatus } = statusPopup;
    try {
      const result = await dispatch(
        updateStatusById({
          key: "attributes",
          id: attributeId,
          newStatus,
          apiRoute: UPDATE_ATTRIBUTRE_VALUE_STATUS,
          idField: "AttributeID",
        })
      ).unwrap();

      showEmsg(result.message, result.status || STATUS.SUCCESS);
    } catch (err) {
      setErrorMessage(t("COMMON.API_ERROR"));
      setShowErrorPopup(true);
    } finally {
      setStatusPopup({ open: false, attributeId: null, newStatus: null });
      hideLoaderWithDelay(setSubmitting);

      // Refetch after update
      const params = {
        pageNumber: iCurrentPage,
        pageSize: iItemsPerPage,
        searchText: sSearchQuery,
      };
      if (oFilters.status !== STATUS_VALUES.ALL) {
        params.IsActive = oFilters.status;
      }
      dispatch(fetchResource({ key: "attributes", params }));
    }
  };

  const handleStatusPopupClose = () => {
    setStatusPopup({ open: false, attributeId: null, newStatus: null });
  };

  const handleFilterChange = (e, filterName) => {
    setFilters({
      ...oFilters,
      [filterName]: e.target.value,
    });
  };

  const handlePageClick = (pageNumber) => setCurrentPage(pageNumber);
  const handlePrevPage = () =>
    setCurrentPage((prev) =>
      prev > DEFAULT_PAGE ? prev - DEFAULT_PAGE : prev
    );
  const handleNextPage = () =>
    setCurrentPage((prev) => (prev < iTotalPages ? prev + DEFAULT_PAGE : prev));

  // Map STATUS_OPTIONS to the format expected by Toolbar component
  const statusFilterOptions = STATUS_OPTIONS.map((option) => ({
    value: option.value,
    label: t(option.labelKey),
  }));

  if (bShowCreate) {
    return <CreateAttribute onBack={() => setShowCreate(false)} />;
  }

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-2 min-h-screen bg-gray-50">
      <style>{customScrollbarStyles}</style>

      <div className="relative">
        <div className="mb-6">
          <Toolbar
            searchTerm={sSearchQuery}
            setSearchTerm={setSearchQuery}
            showFilterDropdown={bShowFilter}
            setShowFilterDropdown={setShowFilter}
            searchPlaceholder={t("PRODUCT_SETUP.ATTRIBUTES.SEARCH_PLACEHOLDER")}
            showSearch={true}
            showViewToggle={false}
            showFilterButton={true}
            
            // --- Permissions removed, always enabled ---
            onCreate={onCreate}
            createLabel={t("PRODUCT_SETUP.CREATE")}
            disableCreate={false}
            
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
        {/* Table */}
        {bLoading && (
          <div className="text-center py-8 text-gray-500">
            {t("COMMON.LOADING")}
          </div>
        )}

        {sError && !bLoading && (
          <div className="text-center py-8 text-red-500">{sError}</div>
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
                      {t("PRODUCT_SETUP.ATTRIBUTES.TABLE.NAME")}
                    </th>
                    <th className="table-head-cell-floating text-left px-6 py-4">
                      {t("COMMON.UNIT")}
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
                  {aAttributes.map((attribute) => (
                    <tr
                      key={attribute.AttributeValueID}
                      className={`table-row items-center hover:bg-gray-50 ${
                        !attribute.IsActive ? "bg-gray-50" : ""
                      }`}
                    >
                      {/* Name Column with Conditional Link based on Active status only */}
                      <td className="table-cell table-cell-text text-left align-middle px-6 py-4">
                        {attribute.IsActive ? (
                          <Link
                            to={`/browse/editattribute/${attribute.AttributeValueID}`}
                            className="text-blue-600 hover:underline block truncate max-w-[180px] font-medium"
                            title={attribute.Value}
                          >
                            {attribute.Value}
                          </Link>
                        ) : (
                          <span
                            className="block truncate max-w-[180px] font-medium text-gray-500 cursor-not-allowed"
                            title={t("PRODUCT_SETUP.ATTRIBUTES.EDIT_DISABLED_TOOLTIP")}
                          >
                            {attribute.Value}
                          </span>
                        )}
                      </td>

                      {/* Unit */}
                      <td
                        className={`table-cell table-cell-text text-left align-middle px-6 py-4 ${
                          !attribute.IsActive ? "text-gray-400" : ""
                        }`}
                      >
                        <div
                          className="truncate max-w-[220px]"
                          title={attribute.Unit}
                        >
                          {attribute.Unit}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="table-cell text-center align-middle px-6 py-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            attribute.IsActive
                              ? "bg-green-100 text-green-800 border border-green-200"
                              : "bg-red-100 text-red-800 border border-red-200"
                          }`}
                        >
                          {t(
                            `COMMON.${
                              attribute.IsActive ? "ACTIVE" : "INACTIVE"
                            }`
                          )}
                        </span>
                      </td>

                      {/* Update Status (Switch) */}
                      <td className="table-cell text-center align-middle px-6 py-4">
                        <div className="flex justify-center">
                          <Switch
                            checked={attribute.IsActive}
                            onChange={() =>
                              handleStatusChange(
                                attribute.AttributeValueID,
                                attribute.IsActive
                              )
                            }
                            // disabled prop removed
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
        {!bLoading && !sError && aAttributes.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="text-gray-500">
              {t("PRODUCT_SETUP.ATTRIBUTES.EMPTY_MESSAGE")}
            </div>
            {(sSearchQuery || oFilters.status !== STATUS_VALUES.ALL) && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilters({ status: STATUS_VALUES.ALL });
                }}
                className="mt-2 text-[#5B45E0] hover:text-[#4c39c7] font-medium"
              >
                {t("PRODUCT_SETUP.ATTRIBUTES.CLEAR_FILTERS_BTN")}
              </button>
            )}
          </div>
        )}

        {/* Pagination Controls */}
        {!bLoading && !sError && iTotalItems > 0 && (
          <Pagination
            itemsPerPage={iItemsPerPage}
            totalItems={iTotalItems}
            currentPage={iCurrentPage}
            totalPages={iTotalPages}
            handlePageClick={handlePageClick}
            handlePrevPage={handlePrevPage}
            handleNextPage={handleNextPage}
          />
        )}
      </div>
      {bShowErrorPopup && (
        <FullscreenErrorPopup
          message={sErrorMessage}
          onClose={() => setShowErrorPopup(false)}
        />
      )}
      {statusPopup.open && (
        <FullscreenErrorPopup
          message={
            statusPopup.newStatus
              ? t("PRODUCT_SETUP.ATTRIBUTES.CONFIRM_ACTIVATE")
              : t("PRODUCT_SETUP.ATTRIBUTES.CONFIRM_DEACTIVATE")
          }
          onClose={handleStatusPopupClose}
          onConfirm={handleStatusConfirm}
        />
      )}
    </div>
  );
};

export default AttributeTypeValueList;