import { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import CreateAttribute from "./CreateAttributeTypeValuesList";
import Toolbar from "../../../components/Toolbar";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import Pagination from "../../../components/Pagination";
import FullscreenErrorPopup from "../../../components/FullscreenErrorPopup";
import Switch from "../../../components/Switch";
import Tooltip from "../../../components/Tooltip";
import Loader from "../../../components/Loader";
import SkeletonLoader from "../../../components/SkeletonLoader";
import EmptyState from "../../../components/EmptyState";import { SKELETON_TYPES } from "../../../contants/constants";
import { showEmsg } from "../../../utils/ShowEmsg";
import { UPDATE_ATTRIBUTRE_VALUE_STATUS } from "../../../contants/apiRoutes";
import {
  ITEMS_PER_PAGE,
  DEFAULT_PAGE,
  STATUS,
  STATUS_VALUES,
  STATUS_OPTIONS,
  PERMISSIONS,
  MODULES,
} from "../../../contants/constants";
import { hideLoaderWithDelay } from "../../../utils/loaderUtils";
import { getPermissionCode, hasPermissionId } from "../../../utils/permissionUtils";
import { useCreateAccess } from "../../../hooks/useCreateAccess";
import {
  fetchResource,
  updateStatusById,
  clearResourceError,
} from "../../../store/slices/allDataSlice";

const AttributeTypeValuesList = ({ onCreate, onBack, setSubmitting }) => {
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

  // --- Permission Checks ---
  const permissionIdForAddAttribute = getPermissionCode(
    MODULES.PRODUCT_SETUP,
    PERMISSIONS.ADD_ATTRIBUTE
  );
  const permissionIdForEditAttribute = getPermissionCode(
    MODULES.PRODUCT_SETUP,
    PERMISSIONS.EDIT_ATTRIBUTE
  );
  const permissionIdForUpdateAttributeStatus = getPermissionCode(
    MODULES.PRODUCT_SETUP,
    PERMISSIONS.UPDATE_ATTRIBUTE_STATUS
  );
  const permissionIdForViewAttributeDetails = getPermissionCode(
    MODULES.PRODUCT_SETUP,
    PERMISSIONS.VIEW_ATTRIBUTE_DETAILS
  );

  const hasAddAttributePermission = hasPermissionId(permissionIdForAddAttribute);
  const hasEditAttributePermission = hasPermissionId(permissionIdForEditAttribute);
  const hasUpdateAttributeStatusPermission = hasPermissionId(permissionIdForUpdateAttributeStatus);
  const hasViewAttributeDetailsPermission = hasPermissionId(permissionIdForViewAttributeDetails);

  const { canCreate: canAddAttribute, disabledReason: addAttributeDisabledReason } =
    useCreateAccess(permissionIdForAddAttribute, {
      actionType: "ATTRIBUTE",
      noPermissionMsg: t("ATTRIBUTES.NO_CREATE_PERMISSION", "You do not have permission to add attributes."),
      limitReachedMsg: t("ATTRIBUTES.LIMIT_REACHED", "You have reached your attribute creation limit."),
      planNotAvailableMsg: t("CREATE_ACTION.PLAN_NOT_AVAILABLE"),
    });

  const iTotalPages = Math.ceil(iTotalItems / iItemsPerPage);



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
    // Check permission before allowing status change
    if (!hasUpdateAttributeStatusPermission) {
      showEmsg(t("COMMON.NO_PERMISSION"), STATUS.ERROR);
      return;
    }
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

      showEmsg(
        result.message || t("COMMON.STATUS_UPDATE_SUCCESS"),
        result.status || STATUS.SUCCESS
      );
    } catch (err) {
      setErrorMessage(
        err?.error || err?.message || t("COMMON.STATUS_UPDATE_ERROR")
      );
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

  const handleCreateAttribute = () => {
    if (!canAddAttribute) {
      showEmsg(addAttributeDisabledReason || t("COMMON.NO_PERMISSION"), STATUS.WARNING);
      return;
    }
    onCreate();
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
      prev > DEFAULT_PAGE ? prev - 1 : prev
    );
  const handleNextPage = () =>
    setCurrentPage((prev) => (prev < iTotalPages ? prev + 1 : prev));

  // Map STATUS_OPTIONS to the format expected by Toolbar component
  const statusFilterOptions = STATUS_OPTIONS.map((option) => ({
    value: option.value,
    label: t(option.labelKey),
  }));

  if (bShowCreate) {
    return <CreateAttribute onBack={() => setShowCreate(false)} />;
  }

  return (
    <div className="flex w-full flex-col">
      <div className="mb-4 flex-shrink-0">
          <Toolbar
            searchTerm={sSearchQuery}
            setSearchTerm={setSearchQuery}
            showFilterDropdown={bShowFilter}
            setShowFilterDropdown={setShowFilter}
            searchPlaceholder={t("PRODUCT_SETUP.ATTRIBUTES.SEARCH_PLACEHOLDER")}
            showSearch={true}
            showViewToggle={false}
            isBrowsePage={true}
            showFilterButton={true}
            actionType="ATTRIBUTE"
            // --- Permission-based Create Button ---
            onCreate={handleCreateAttribute}
            createLabel={t("PRODUCT_SETUP.CREATE")}
            disableCreate={!canAddAttribute}
            disableCreateReason={addAttributeDisabledReason}
            
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

        {/* Loading/Error states or Table */}
        <div className="table-container-floating w-full bg-white rounded-xl shadow-sm border border-gray-100 relative">
          <div
            className="table-scroll-container scrollbar-hide overflow-x-auto overflow-y-auto"
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
                  <th className="table-head-cell-floating text-center px-6 py-4">
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
                {bLoading ? (
                  <SkeletonLoader type={SKELETON_TYPES.ATTRIBUTE_TABLE} rows={6} />
                ) : sError ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-red-500">
                      {sError}
                    </td>
                  </tr>
                ) : aAttributes.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <EmptyState
                        title={t("PRODUCT_SETUP.ATTRIBUTES.EMPTY_MESSAGE")}
                        description={t("COMMON.TRY_ADJUSTING_SEARCH_FILTERS")}
                        compact
                      />
                    </td>
                  </tr>
                ) : (
                  aAttributes.map((attribute) => (
                    <tr
                      key={attribute.AttributeValueID}
                      className={`table-row items-center hover:bg-gray-50 ${
                        !attribute.IsActive ? "bg-gray-50" : ""
                      }`}
                    >
                      {/* Name Column with Conditional Link based on Active status and Permission */}
                      <td className="table-cell text-left align-middle px-6 py-4">
                        <div className="relative group inline-block w-full">
                          {attribute.IsActive && attribute.editable && hasEditAttributePermission ? (
                            <Tooltip
                              text={t("TOOLTIPS.EDIT_ATTRIBUTE_TOOLTIP")}
                              position="bottom-right"
                            >
                              <Link
                                to={`/browse/editattribute/${attribute.AttributeValueID}`}
                                className="text-sm text-blue-600 hover:underline block truncate max-w-[180px] font-medium"
                              >
                                {attribute.Value}
                              </Link>
                            </Tooltip>
                          ) : (
                            <Tooltip
                              text={!hasEditAttributePermission ? t("COMMON.NO_PERMISSION_TOOLTIP") : t("PRODUCT_SETUP.ATTRIBUTES.EDIT_DISABLED_TOOLTIP")}
                              position="bottom-right"
                            >
                              <span
                                className="text-sm block truncate max-w-[180px] font-medium text-gray-500 cursor-not-allowed"
                              >
                                {attribute.Value}
                              </span>
                            </Tooltip>
                          )}
                        </div>
                      </td>

                      {/* Unit */}
                      <td
                        className={`table-cell text-center align-middle px-6 py-4 ${
                          !attribute.IsActive ? "text-gray-400" : ""
                        }`}
                      >
                        <div
                          className="text-sm truncate max-w-[220px]"
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
                        <div className="relative group inline-block">
                          <Tooltip
                            text={hasUpdateAttributeStatusPermission ? t("TOOLTIPS.UPDATE_ATTRIBUTE_STATUS_TOOLTIP") : t("COMMON.NO_PERMISSION_TOOLTIP")}
                            position="left"
                          >
                            <Switch
                              checked={attribute.IsActive}
                              disabled={!hasUpdateAttributeStatusPermission}
                              disableTooltip={true}
                              onChange={() =>
                                handleStatusChange(
                                  attribute.AttributeValueID,
                                  attribute.IsActive
                                )
                              }
                            />
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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

      <div className="mt-4 bg-white border-t border-gray-200 flex-shrink-0">
        {bLoading ? (
          <SkeletonLoader type="pagination" />
        ) : (
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
      </div>
    </div>
  );
};

export default AttributeTypeValuesList;