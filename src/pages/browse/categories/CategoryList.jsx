import { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchResource,
  updateStatusById,
  clearResourceError,
} from "../../../store/slices/allDataSlice";
import Toolbar from "../../../components/Toolbar";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import Pagination from "../../../components/Pagination";
import { showEmsg } from "../../../utils/ShowEmsg";
import FullscreenErrorPopup from "../../../components/FullscreenErrorPopup";
import { UPDATE_CATEGORY_STATUS } from "../../../contants/apiRoutes";
import Switch from "../../../components/Switch";
import Tooltip from "../../../components/Tooltip";
import Loader from "../../../components/Loader";
import SkeletonLoader from "../../../components/SkeletonLoader";
import {
  ITEMS_PER_PAGE,
  DEFAULT_PAGE,
  STATUS,
  STATUS_VALUES,
  STATUS_OPTIONS,
  customScrollbarStyles,
  PERMISSIONS,
  MODULES,
} from "../../../contants/constants";
import { hideLoaderWithDelay } from "../../../utils/loaderUtils";
import { getPermissionCode, hasPermissionId } from "../../../utils/permissionUtils";

const CategoryList = ({ onCreate, onBack, setSubmitting }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [sSearchQuery, setSearchQuery] = useState("");
  const [bShowFilters, setShowFilters] = useState(false);
  const [oFilters, setFilters] = useState({ status: STATUS_VALUES.ALL });
  const [tableScrollTop, setTableScrollTop] = useState(0); 

  // Redux selectors
  const categoriesState = useSelector(
    (state) => state.allData.resources.categories
  );
  const aCategories = categoriesState?.data || [];
  const bLoading = categoriesState?.loading || false;
  const sError = categoriesState?.error || null;
  const iTotalItems = categoriesState?.total || 0;

  const [nCurrentPage, setCurrentPage] = useState(DEFAULT_PAGE);
  const [iItemsPerPage] = useState(ITEMS_PER_PAGE);

  const [statusPopup, setStatusPopup] = useState({
    open: false,
    categoryId: null,
    newStatus: null,
  });

  // --- Permission Checks ---
  const permissionIdForAddCategory = getPermissionCode(
    MODULES.PRODUCT_SETUP,
    PERMISSIONS.ADD_CATEGORY
  );
  const permissionIdForEditCategory = getPermissionCode(
    MODULES.PRODUCT_SETUP,
    PERMISSIONS.EDIT_CATEGORY
  );
  const permissionIdForUpdateCategoryStatus = getPermissionCode(
    MODULES.PRODUCT_SETUP,
    PERMISSIONS.UPDATE_CATEGORY_STATUS
  );

  const hasAddCategoryPermission = hasPermissionId(permissionIdForAddCategory);
  const hasEditCategoryPermission = hasPermissionId(permissionIdForEditCategory);
  const hasUpdateCategoryStatusPermission = hasPermissionId(permissionIdForUpdateCategoryStatus);

  // Hide body scrollbar when component mounts
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    const params = {
      pageNumber: nCurrentPage,
      pageSize: iItemsPerPage,
      searchText: sSearchQuery,
    };
    if (oFilters.status && oFilters.status !== STATUS_VALUES.ALL) {
      params.IsActive = oFilters.status;
    }

    dispatch(fetchResource({ key: "categories", params }));
  }, [dispatch, nCurrentPage, iItemsPerPage, sSearchQuery, oFilters.status]);

  useEffect(() => {
    return () => {
      if (sError) {
        dispatch(clearResourceError("categories"));
      }
    };
  }, [sError, dispatch]);

  const handleTableScroll = useCallback((e) => {
    setTableScrollTop(e.target.scrollTop);
  }, []);

  // --- Status Update Handler ---
  const handleStatusChange = (categoryId, currentStatus) => {
    // Check permission before allowing status change
    if (!hasUpdateCategoryStatusPermission) {
      showEmsg(t("COMMON.NO_PERMISSION"), STATUS.ERROR);
      return;
    }
    const isCurrentlyActive = currentStatus === "Active";
    setStatusPopup({
      open: true,
      categoryId,
      newStatus: !isCurrentlyActive,
    });
  };

  const handleCreateCategory = () => {
    // Check permission before allowing category creation
    if (!hasAddCategoryPermission) {
      showEmsg(t("COMMON.NO_PERMISSION"), STATUS.ERROR);
      return;
    }
    onCreate();
  };

  const handleStatusConfirm = async () => {
    // Check permission before updating status
    if (!hasUpdateCategoryStatusPermission) {
      return;
    }

    if (setSubmitting) setSubmitting(true);
    const { categoryId, newStatus } = statusPopup;

    try {
      const result = await dispatch(
        updateStatusById({
          key: "categories",
          id: categoryId,
          newStatus: newStatus,
          apiRoute: UPDATE_CATEGORY_STATUS,
          idField: "CategoryID",
        })
      ).unwrap();

      showEmsg(result.message, STATUS.SUCCESS);

      const params = {
        pageNumber: nCurrentPage,
        pageSize: iItemsPerPage,
        searchText: sSearchQuery,
      };
      if (oFilters.status && oFilters.status !== STATUS_VALUES.ALL) {
        params.IsActive = oFilters.status;
      }
      dispatch(fetchResource({ key: "categories", params }));
    } catch (err) {
      const errorMessage =
        err?.response?.data?.MESSAGE || t("COMMON.API_ERROR");
      showEmsg(errorMessage, STATUS.ERROR);
    } finally {
      setStatusPopup({ open: false, categoryId: null, newStatus: null });
      hideLoaderWithDelay(setSubmitting);
    }
  };

  const handleStatusPopupClose = () => {
    setStatusPopup({ open: false, categoryId: null, newStatus: null });
  };

  const handlePageClick = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

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

  const handleFilterChange = (e, filterName) => {
    setFilters({
      ...oFilters,
      [filterName]: e.target.value,
    });
    setCurrentPage(DEFAULT_PAGE);
  };

  // Get status text for display
  const getStatusText = (category) => {
    if (category.Status) return category.Status;
    if (category.IsActive !== undefined)
      return category.IsActive ? "Active" : "Inactive";
    return "Inactive"; 
  };

  // Check if category is active
  const isCategoryActive = (category) => {
    if (category.Status) return category.Status === "Active";
    if (category.IsActive !== undefined) return category.IsActive;
    return false;
  };

  const statusFilterOptions = STATUS_OPTIONS.map((option) => ({
    value: option.value,
    label: t(option.labelKey),
  }));

  return (
    <div 
      className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-2 min-h-screen bg-gray-50"
    >
      <style>
       {customScrollbarStyles}
      </style>

      <div className="mb-6">
        <Toolbar
          searchTerm={sSearchQuery}
          setSearchTerm={setSearchQuery}
          showFilterDropdown={bShowFilters}
          setShowFilterDropdown={setShowFilters}
          searchPlaceholder={t("PRODUCT_SETUP.CATEGORIES.SEARCH_PLACEHOLDER")}
          showSearch={true}
          showViewToggle={false}
          isBrowsePage={true}
          showFilterButton={true}
          
          // --- Permission-based Create Button ---
          onCreate={handleCreateCategory}
          createLabel={t("PRODUCT_SETUP.CREATE")}
          disableCreate={!hasAddCategoryPermission}

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

      {/* Loading/Error states or Table */}
      <div className="table-container-floating bg-white rounded-xl shadow-sm border border-gray-100 relative">
        <div
          className="table-scroll-container overflow-x-auto overflow-y-auto"
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
                  {t("PRODUCT_SETUP.CATEGORIES.TABLE.NAME")}
                </th>
                <th className="table-head-cell-floating text-center px-6 py-4">
                  {t("COMMON.DESCRIPTION")}
                </th>
                <th className="table-head-cell-floating text-center px-6 py-4">
                  {t("COMMON.STATUS")}
                </th>
                <th className="table-head-cell-floating text-center px-6 py-4">
                  {t("COMMON.CREATED_AT")}
                </th>
                <th className="table-head-cell-floating text-center px-6 py-4">
                  {t("COMMON.UPDATE_STATUS")}
                </th>
              </tr>
            </thead>

            <tbody className="table-body">
              {bLoading ? (
                <SkeletonLoader type="category-table" rows={6} />
              ) : sError ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-red-500">
                    {t("COMMON.ERROR")}: {sError}
                  </td>
                </tr>
              ) : aCategories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    <div>
                      {t("PRODUCT_SETUP.CATEGORIES.EMPTY.MESSAGE")}
                      {sSearchQuery && (
                        <button
                          onClick={() => setSearchQuery("")}
                          className="mt-2 text-[#5B45E0] hover:text-[#4c39c7] font-medium"
                        >
                          {t("COMMON.CLEAR_SEARCH")}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                aCategories.map((category) => (
                  <tr
                    key={category.CategoryID}
                    className={`table-row items-center hover:bg-gray-50 ${
                      !isCategoryActive(category) ? "bg-gray-50" : ""
                    }`}
                  >
                    {/* Category Name & Image */}
                    <td className="table-cell text-left align-middle px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-10 w-10 flex items-center justify-center rounded-full border-2 overflow-hidden flex-shrink-0 ${
                            !isCategoryActive(category)
                              ? "bg-gray-100 border-gray-200"
                              : "bg-white border-gray-300"
                          }`}
                        >
                          {category.CategoryImages &&
                          category.CategoryImages.length > 0 ? (
                            <img
                              src={category.CategoryImages[0].documentUrl}
                              alt={category.CategoryName}
                              className={`w-full h-full object-cover rounded-full ${
                                !isCategoryActive(category) ? "opacity-60" : ""
                              }`}
                            />
                          ) : (
                            <span
                              className={`text-xs ${
                                !isCategoryActive(category)
                                  ? "text-gray-400"
                                  : "text-gray-400"
                              }`}
                            >
                              No Image
                            </span>
                          )}
                        </div>
                        
                        {/* Conditional Link based on Active status and Permission */}
                        <div className="relative group inline-block w-full">
                          {isCategoryActive(category) && category.editable && hasEditCategoryPermission ? (
                            <Tooltip
                              text={t("TOOLTIPS.EDIT_CATEGORY_TOOLTIP")}
                              position="bottom-right"
                            >
                              <Link
                                to={`/browse/editcatagiry/${category.CategoryID}`}
                                className="text-sm text-blue-600 hover:underline block truncate max-w-[180px] font-medium"
                              >
                                {category.CategoryName}
                              </Link>
                            </Tooltip>
                          ) : (
                            <Tooltip
                              text={!hasEditCategoryPermission ? t("COMMON.NO_PERMISSION_TOOLTIP") : t("PRODUCT_SETUP.CATEGORIES.EDIT_DISABLED_TOOLTIP")}
                              position="bottom-right"
                            >
                              <span
                                className="text-sm block truncate max-w-[180px] font-medium text-gray-500 cursor-not-allowed"
                              >
                                {category.CategoryName}
                              </span>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Description */}
                    <td
                      className={`table-cell text-center align-middle px-6 py-4 max-w-[200px] ${
                        !isCategoryActive(category) ? "text-gray-400" : ""
                      }`}
                    >
                      <div
                        className="text-sm truncate mx-auto"
                        title={category.CategoryDescription}
                      >
                        {category.CategoryDescription}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="table-cell text-center align-middle px-6 py-4">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                          isCategoryActive(category)
                            ? "bg-green-100 text-green-800 border border-green-200"
                            : "bg-red-100 text-red-800 border border-red-200"
                        }`}
                      >
                        {t(
                          `COMMON.${
                            isCategoryActive(category) ? "ACTIVE" : "INACTIVE"
                          }`
                        )}
                      </span>
                    </td>

                    {/* Created At */}
                    <td
                      className={`table-cell text-center align-middle px-6 py-4 ${
                        !isCategoryActive(category) ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      <span className="text-sm">
                        {new Date(category.CreatedAt).toLocaleString(undefined, {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </span>
                    </td>

                    {/* Toggle Switch */}
                    <td
                      className="table-cell text-center align-middle px-6 py-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-center">
                        <div className="relative group inline-block">
                          <Tooltip
                            text={hasUpdateCategoryStatusPermission ? t("TOOLTIPS.UPDATE_CATEGORY_STATUS_TOOLTIP") : t("COMMON.NO_PERMISSION_TOOLTIP")}
                            position="left"
                          >
                            <Switch
                              checked={isCategoryActive(category)}
                              disabled={!hasUpdateCategoryStatusPermission || !category.editable}
                              disableTooltip={true}
                              onChange={() =>
                                handleStatusChange(
                                  category.CategoryID,
                                  getStatusText(category)
                                )
                              }
                            />
                          </Tooltip>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {iTotalItems > 0 && (
          bLoading ? (
            <SkeletonLoader type="pagination" />
          ) : (
            <Pagination
              currentPage={nCurrentPage}
              totalPages={Math.ceil(iTotalItems / iItemsPerPage)}
              totalItems={iTotalItems}
              itemsPerPage={iItemsPerPage}
              handlePrevPage={handlePrevPage}
              handleNextPage={handleNextPage}
              handlePageClick={handlePageClick}
            />
          )
      )}
      {statusPopup.open && (
        <FullscreenErrorPopup
          message={
            statusPopup.newStatus
              ? t("PRODUCT_SETUP.CATEGORIES.CONFIRM_ACTIVATE")
              : t("PRODUCT_SETUP.CATEGORIES.CONFIRM_DEACTIVATE")
          }
          onClose={handleStatusPopupClose}
          onConfirm={handleStatusConfirm}
        />
      )}
    </div>
  );
};

export default CategoryList;