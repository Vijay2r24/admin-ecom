import { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchResource,
  clearResourceError,
} from "../../../store/slices/allDataSlice";
import Toolbar from "../../../components/Toolbar";
import { useTranslation } from "react-i18next";
import Pagination from "../../../components/Pagination";
import FullscreenErrorPopup from "../../../components/FullscreenErrorPopup";
import Loader from "../../../components/Loader";
import SkeletonLoader from "../../../components/SkeletonLoader";
import {
  ITEMS_PER_PAGE,
  DEFAULT_PAGE,
  STATUS_VALUES,
  STATUS_OPTIONS,
  customScrollbarStyles,
  PERMISSIONS,
  MODULES,
} from "../../../contants/constants";
import { getPermissionCode,hasPermissionId } from "../../../utils/permissionUtils";

const ColorList = ({ onCreate, onBack, setSubmitting }) => {
  const [sSearchQuery, setSearchQuery] = useState("");
  const [oFilters, setFilters] = useState({ status: STATUS_VALUES.ALL });
  const [bShowFilters, setShowFilters] = useState(false);
  const [tableScrollTop, setTableScrollTop] = useState(0); // For floating header
  const { t } = useTranslation();
  const dispatch = useDispatch();

  // Redux selectors
  const colorsState = useSelector((state) => state.allData.resources.colors);
  const aColors = colorsState?.data || [];
  const bLoading = colorsState?.loading || false;
  const sError = colorsState?.error || null;
  const iTotalItems = colorsState?.total || 0;

  const [nCurrentPage, setCurrentPage] = useState(DEFAULT_PAGE);
  const [iItemsPerPage] = useState(ITEMS_PER_PAGE);

  // Local state for optimistic UI updates (just keeping data in sync)
  const [localColors, setLocalColors] = useState(aColors || []);

  // --- Permission Checks ---
  const permissionIdForAddColour = getPermissionCode(MODULES.PRODUCT_SETUP, PERMISSIONS.ADD_COLOUR);
  const permissionIdForEditColour = getPermissionCode(MODULES.PRODUCT_SETUP, PERMISSIONS.EDIT_COLOUR);
  const permissionIdForUpdateColourStatus = getPermissionCode(MODULES.PRODUCT_SETUP, PERMISSIONS.UPDATE_COLOUR_STATUS);
  const permissionIdForViewColourDetails = getPermissionCode(MODULES.PRODUCT_SETUP, PERMISSIONS.VIEW_COLOURS);

  const hasAddColourPermission = hasPermissionId(permissionIdForAddColour);
  const hasEditColourPermission = hasPermissionId(permissionIdForEditColour);
  const hasUpdateColourStatusPermission = hasPermissionId(permissionIdForUpdateColourStatus);
  const hasViewColourDetailsPermission = hasPermissionId(permissionIdForViewColourDetails);
  

  // Hide body scrollbar when component mounts
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    
    // Re-enable scrollbar when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    setLocalColors(aColors || []);
  }, [aColors]);

  // Fetch colors data
  useEffect(() => {
    const params = {
      pageNumber: nCurrentPage,
      pageSize: iItemsPerPage,
      searchText: sSearchQuery,
    };
    dispatch(fetchResource({ key: "colors", params }));
  }, [dispatch, nCurrentPage, iItemsPerPage, sSearchQuery]);

  // Clear error on unmount
  useEffect(() => {
    return () => {
      if (sError) {
        dispatch(clearResourceError("colors"));
      }
    };
  }, [sError, dispatch]);

  // Handle table scroll for floating header
  const handleTableScroll = useCallback((e) => {
    setTableScrollTop(e.target.scrollTop);
  }, []);

  const handleFilterChange = (e, filterName) => {
    setFilters({
      ...oFilters,
      [filterName]: e.target.value,
    });
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

  const handleCreateColor = () => {
    // Check permission before allowing color creation
    if (!hasAddColourPermission) {
      showEmsg(t("COMMON.NO_PERMISSION"), STATUS.ERROR);
      return;
    }
    onCreate();
  };

  return (
    <div 
      className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-2 min-h-screen bg-gray-50"
    >
      {/* Inline style tag for Webkit browsers (Chrome, Safari) */}
      <style>
        {customScrollbarStyles}
      </style>

      <div className="mb-6">
        <Toolbar
          searchTerm={sSearchQuery}
          setSearchTerm={setSearchQuery}
          showFilterDropdown={bShowFilters}
          setShowFilterDropdown={setShowFilters}
          searchPlaceholder={t("PRODUCT_SETUP.COLORS.SEARCH_PLACEHOLDER")}
          showSearch={true}
          showViewToggle={false}
          isBrowsePage={true}
          showFilterButton={false}
          onCreate={handleCreateColor}
          createLabel={t("PRODUCT_SETUP.CREATE")}
          disableCreate={!hasAddColourPermission}
          
          handleFilterChange={bShowFilters ? handleFilterChange : undefined}
        />
      </div>

      {bLoading ? (
        <div className="table-container-floating bg-white rounded-xl shadow-sm border border-gray-100 relative">
          <div className="table-scroll-container overflow-x-auto overflow-y-auto">
            <table className="table-base w-full">
              {/* Floating Header */}
              <thead
                className={`table-head-floating sticky top-0 z-10 ${
                  tableScrollTop > 10 ? "shadow-sm" : ""
                }`}
              >
                <tr>
                  <th className="table-head-cell-floating text-left px-6 py-4">
                    {t("PRODUCT_SETUP.COLORS.TABLE.COLOR")}
                  </th>
                  <th className="table-head-cell-floating text-center px-6 py-4">
                    {t("PRODUCT_SETUP.COLORS.TABLE.HEX_CODE")}
                  </th>
                </tr>
              </thead>
              <tbody className="table-body">
                <SkeletonLoader type="color-table" rows={6} />
              </tbody>
            </table>
          </div>
        </div>
      ) : sError ? (
        <FullscreenErrorPopup
          message={sError}
          onClose={() => dispatch(clearResourceError("colors"))}
          showConfirmButton={false}
        />
      ) : (
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
                    {t("PRODUCT_SETUP.COLORS.TABLE.COLOR")}
                  </th>
                  <th className="table-head-cell-floating text-center px-6 py-4">
                    {t("PRODUCT_SETUP.COLORS.TABLE.HEX_CODE")}
                  </th>
                </tr>
              </thead>

              <tbody className="table-body">
                {localColors.map((color) => (
                  <tr key={color.ColourID} className="table-row items-center hover:bg-gray-50">
                    {/* Color Name & Circle */}
                    <td className="table-cell text-left align-middle px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-8 w-8 rounded-full border-2 border-gray-200 shadow-sm"
                          style={{ backgroundColor: color.HexCode }}
                        />
                        <div className="text-sm font-medium text-gray-900">
                          {color.Name}
                        </div>
                      </div>
                    </td>

                    {/* Hex Code */}
                    <td className="table-cell text-center align-middle px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <div
                          className="h-4 w-4 rounded border border-gray-300"
                          style={{ backgroundColor: color.HexCode }}
                        />
                        <span className="text-sm font-mono text-gray-600">
                          {color.HexCode}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {iTotalItems === 0 && !bLoading && !sError && (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="text-gray-500">
            {t("PRODUCT_SETUP.COLORS.EMPTY.MESSAGE")}
          </div>
          {sSearchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setFilters({ status: STATUS_VALUES.ALL });
              }}
              className="mt-2 text-[#5B45E0] hover:text-[#4c39c7] font-medium"
            >
              {t("COMMON.CLEAR_SEARCH")}
            </button>
          )}
        </div>
      )}

      {/* Pagination Controls - Fixed at bottom */}
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
    </div>
  );
};

export default ColorList;