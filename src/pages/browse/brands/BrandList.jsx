import { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchResource,
  updateStatusById,
  clearResourceError,
} from "../../../store/slices/allDataSlice";
import CreateBrand from "./CreateBrand";
import Toolbar from "../../../components/Toolbar";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import Pagination from "../../../components/Pagination";
import { showEmsg } from "../../../utils/ShowEmsg";
import FullscreenErrorPopup from "../../../components/FullscreenErrorPopup";
import { UPDATE_BRAND_STATUS } from "../../../contants/apiRoutes";
import Switch from "../../../components/Switch";
import {
  ITEMS_PER_PAGE,
  DEFAULT_PAGE,
  STATUS,
  STATUS_VALUES,
  STATUS_OPTIONS,
  customScrollbarStyles,
} from "../../../contants/constants";
import { hideLoaderWithDelay } from "../../../utils/loaderUtils";

const BrandList = ({ onCreate, onBack, setSubmitting }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const [bShowCreate, setShowCreate] = useState(false);
  const [sSearchQuery, setSearchQuery] = useState("");
  const [bShowFilters, setShowFilters] = useState(false);
  const [oFilters, setFilters] = useState({ status: STATUS_VALUES.ALL });

  const [nCurrentPage, setCurrentPage] = useState(DEFAULT_PAGE);
  const [iItemsPerPage] = useState(ITEMS_PER_PAGE);
  const [tableScrollTop, setTableScrollTop] = useState(0);

  const [statusPopup, setStatusPopup] = useState({
    open: false,
    brandId: null,
    newStatus: null,
  });

  // --- Redux Selectors ---
  const brandsState = useSelector((state) => state.allData.resources.brands);
  const aBrands = brandsState?.data || [];
  const bLoading = brandsState?.loading || false;
  const sError = brandsState?.error || null;
  const iTotalItems = brandsState?.total || 0;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  useEffect(() => {
    const params = {
      pageNumber: nCurrentPage,
      pageSize: iItemsPerPage,
      searchText: sSearchQuery,
    };
    if (oFilters.status !== STATUS_VALUES.ALL) {
      params.IsActive = oFilters.status;
    }
    dispatch(fetchResource({ key: "brands", params }));
  }, [dispatch, nCurrentPage, iItemsPerPage, sSearchQuery, oFilters.status]);

  useEffect(() => {
    return () => {
      if (sError) {
        dispatch(clearResourceError("brands"));
      }
    };
  }, [sError, dispatch]);

  const handleTableScroll = useCallback((e) => {
    setTableScrollTop(e.target.scrollTop);
  }, []);

  const handlePageClick = (pageNumber) => setCurrentPage(pageNumber);

  const handleNextPage = () => {
    if (nCurrentPage < Math.ceil(iTotalItems / iItemsPerPage)) {
      setCurrentPage((prev) => prev + DEFAULT_PAGE);
    }
  };

  const handlePrevPage = () => {
    if (nCurrentPage > DEFAULT_PAGE) {
      setCurrentPage((prev) => prev - DEFAULT_PAGE);
    }
  };

  const handleStatusChange = (brandId, currentIsActive) => {
    setStatusPopup({ open: true, brandId, newStatus: !currentIsActive });
  };

  const handleStatusConfirm = async () => {
    if (setSubmitting) setSubmitting(true);
    const { brandId, newStatus } = statusPopup;

    try {
      const result = await dispatch(
        updateStatusById({
          key: "brands",
          id: brandId,
          newStatus,
          apiRoute: UPDATE_BRAND_STATUS,
          idField: "BrandID",
        })
      ).unwrap();

      showEmsg(result.message, STATUS.SUCCESS);

      const params = {
        pageNumber: nCurrentPage,
        pageSize: iItemsPerPage,
        searchText: sSearchQuery,
      };
      if (oFilters.status !== STATUS_VALUES.ALL) {
        params.IsActive = oFilters.status;
      }
      dispatch(fetchResource({ key: "brands", params }));
    } catch (err) {
      showEmsg(err?.message || t("COMMON.API_ERROR"), STATUS.ERROR);
    } finally {
      setStatusPopup({ open: false, brandId: null, newStatus: null });
      hideLoaderWithDelay(setSubmitting);
    }
  };

  const handleStatusPopupClose = () => {
    setStatusPopup({ open: false, brandId: null, newStatus: null });
  };

  const handleFilterChange = (e, filterName) => {
    setFilters({
      ...oFilters,
      [filterName]: e.target.value,
    });
    setCurrentPage(DEFAULT_PAGE);
  };

  const statusFilterOptions = STATUS_OPTIONS.map((option) => ({
    value: option.value,
    label: t(option.labelKey),
  }));

  if (bShowCreate) {
    return <CreateBrand onBack={() => setShowCreate(false)} />;
  }

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-2 min-h-screen bg-gray-50">
      <style>{customScrollbarStyles}</style>

      {/* Toolbar with Search & Filters */}
      <div className="mb-6">
        <Toolbar
          searchTerm={sSearchQuery}
          setSearchTerm={setSearchQuery}
          showFilterDropdown={bShowFilters}
          setShowFilterDropdown={setShowFilters}
          searchPlaceholder={t("PRODUCT_SETUP.BRANDS.SEARCH_PLACEHOLDER")}
          showSearch={true}
          showViewToggle={false}
          
          // --- Permissions removed ---
          onCreate={onCreate}
          createLabel={t("PRODUCT_SETUP.CREATE")}
          disableCreate={false}

          showFilterButton={true}
          additionalFilters={
            bShowFilters
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
          handleFilterChange={bShowFilters ? handleFilterChange : undefined}
        />
      </div>

      {/* Loading, Error, or Table */}
      {bLoading ? (
        <div className="text-center py-8 text-gray-500">
          {t("COMMON.LOADING")}
        </div>
      ) : sError ? (
        <FullscreenErrorPopup
          message={sError}
          onClose={() => dispatch(clearResourceError("brands"))}
          showConfirmButton={false}
        />
      ) : (
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
                    {t("PRODUCT_SETUP.BRANDS.TABLE.NAME")}
                  </th>
                  <th className="table-head-cell-floating text-center px-6 py-4">
                    {t("COMMON.STATUS")}
                  </th>
                  <th className="table-head-cell-floating text-center px-6 py-4">
                    {t("PRODUCT_SETUP.BRANDS.TABLE.CREATED_AT")}
                  </th>
                  <th className="table-head-cell-floating text-center px-6 py-4">
                    {t("COMMON.UPDATE_STATUS")}
                  </th>
                </tr>
              </thead>

              <tbody className="table-body">
                {aBrands.map((brand) => (
                  <tr
                    key={brand.BrandID}
                    className={`table-row items-center hover:bg-gray-50 ${
                      !brand.IsActive ? "bg-gray-50" : ""
                    }`}
                  >
                    {/* Brand Name & Logo */}
                    <td className="table-cell table-cell-text text-left align-middle px-6 py-4">
                      <div className="flex items-center gap-3">
                        {/* Brand Logo */}
                        <div
                          className={`h-10 w-10 flex items-center justify-center rounded-full border overflow-hidden ${
                            !brand.IsActive
                              ? "bg-gray-100 border-gray-200"
                              : "bg-white border-gray-300"
                          }`}
                        >
                          {Array.isArray(brand.BrandLogo) &&
                          brand.BrandLogo.length > 0 ? (
                            <img
                              src={brand.BrandLogo[0].documentUrl}
                              alt={brand.BrandName}
                              className={`w-full h-full object-cover ${
                                !brand.IsActive ? "opacity-60" : ""
                              }`}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "/no-image.png";
                              }}
                            />
                          ) : (
                            <span
                              className={`text-xs ${
                                !brand.IsActive
                                  ? "text-gray-400"
                                  : "text-gray-400"
                              }`}
                            >
                              {t("COMMON.NO_IMAGE")}
                            </span>
                          )}
                        </div>

                        {/* Brand Name - Conditional Link based only on Status */}
                        {brand.IsActive ? (
                          <Link
                            to={`/browse/editbrand/${brand.BrandID}`}
                            className="text-blue-600 hover:underline block truncate max-w-[200px] font-medium"
                          >
                            {brand.BrandName}
                          </Link>
                        ) : (
                          <span
                            className="block truncate max-w-[200px] font-medium text-gray-500 cursor-not-allowed"
                            title={t("PRODUCT_SETUP.BRANDS.EDIT_DISABLED_TOOLTIP")}
                          >
                            {brand.BrandName}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="table-cell text-center align-middle px-6 py-4">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                          brand.IsActive
                            ? "bg-green-100 text-green-800 border border-green-200"
                            : "bg-red-100 text-red-800 border border-red-200"
                        }`}
                      >
                        {brand.IsActive
                          ? t("COMMON.ACTIVE")
                          : t("COMMON.INACTIVE")}
                      </span>
                    </td>

                    {/* Created At */}
                    <td
                      className={`table-cell text-center table-cell-text align-middle px-6 py-4 ${
                        !brand.IsActive ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      {new Date(brand.CreatedAt).toLocaleString(undefined, {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </td>

                    {/* Toggle Switch */}
                    <td className="table-cell text-center table-cell-text align-middle px-6 py-4">
                      <div className="flex justify-center">
                        <Switch
                          checked={brand.IsActive}
                          onChange={() =>
                            handleStatusChange(brand.BrandID, brand.IsActive)
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

      {/* No Results Message */}
      {bLoading === false && aBrands.length === 0 && (
        <div className="text-center py-12 text-gray-500 bg-white rounded-xl shadow-sm border border-gray-100">
          <p className="text-lg mb-4">
            {t("PRODUCT_SETUP.BRANDS.NO_BRANDS_FOUND")}
          </p>
          {sSearchQuery && (
            <div>
              <button
                onClick={() => setSearchQuery("")}
                className="mt-2 text-[#5B45E0] hover:text-[#4c39c7] font-medium"
              >
                {t("COMMON.CLEAR_SEARCH")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pagination Controls */}
      {iTotalItems > 0 && (
        <Pagination
          currentPage={nCurrentPage}
          totalPages={Math.ceil(iTotalItems / iItemsPerPage)}
          totalItems={iTotalItems}
          itemsPerPage={iItemsPerPage}
          handlePrevPage={handlePrevPage}
          handleNextPage={handleNextPage}
          handlePageClick={handlePageClick}
        />
      )}

      {/* Confirmation Popup */}
      {statusPopup.open && (
        <FullscreenErrorPopup
          message={
            statusPopup.newStatus
              ? t("PRODUCT_SETUP.BRANDS.CONFIRM_ACTIVATE")
              : t("PRODUCT_SETUP.BRANDS.CONFIRM_DEACTIVATE")
          }
          onClose={handleStatusPopupClose}
          onConfirm={handleStatusConfirm}
        />
      )}
    </div>
  );
};

export default BrandList;