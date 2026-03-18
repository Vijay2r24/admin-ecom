import { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchResource,
  clearResourceError,
  updateStatusById,
} from "../../../store/slices/allDataSlice";
import Toolbar from "../../../components/Toolbar";
import { useTranslation } from "react-i18next";
import Pagination from "../../../components/Pagination";
import { showEmsg } from "../../../utils/ShowEmsg";
import FullscreenErrorPopup from "../../../components/FullscreenErrorPopup";
import {
  CREATE_SPECIFICATION_TYPE,
  GET_SPECIFICATION_TYPE_ID,
  UPDATE_SPECIFICATION_TYPE,
  UPDATE_SPECIFICATION_TYPE_STATUS,
} from "../../../contants/apiRoutes";
import Switch from "../../../components/Switch";
import Tooltip from "../../../components/Tooltip";
import {
  ITEMS_PER_PAGE,
  DEFAULT_PAGE,
  STATUS,
  FORM_MODES,
  STATUS_VALUES,
  STATUS_OPTIONS,
  DATE_FORMAT_OPTIONS,
  customScrollbarStyles,
  PERMISSIONS,
  MODULES,
} from "../../../contants/constants";
import { hideLoaderWithDelay } from "../../../utils/loaderUtils";
import { getPermissionCode, hasPermissionId } from "../../../utils/permissionUtils";
import { apiPost, apiGet, apiPut } from "../../../utils/ApiUtils";
import ActionButtons from "../../../components/ActionButtons";

const SpecificationTypeList = ({ setSubmitting }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const [sSearchQuery, setSearchQuery] = useState("");
  const [bShowFilters, setShowFilters] = useState(false);
  const [oFilters, setFilters] = useState({ status: STATUS_VALUES.ALL });
  const [tableScrollTop, setTableScrollTop] = useState(0);

  // Redux state for specification types
  const specificationTypesState = useSelector(
    (state) => state.allData.resources.specificationType
  );
  const aSpecificationTypes = specificationTypesState?.data || [];
  const bLoading = specificationTypesState?.loading || false;
  const sError = specificationTypesState?.error;
  const iTotalItems = specificationTypesState?.total || 0;

  // Pagination state
  const [nCurrentPage, setCurrentPage] = useState(DEFAULT_PAGE);
  const [iItemsPerPage] = useState(ITEMS_PER_PAGE);

  // Status popup state
  const [statusPopup, setStatusPopup] = useState({
    open: false,
    specificationTypeId: null,
    newStatus: null,
  });

  // --- Permission Checks ---
  const permissionIdForAddSpecificationType = getPermissionCode(
    MODULES.PRODUCT_SETUP,
    PERMISSIONS.ADD_SPECIFICATION_TYPE
  );
  const permissionIdForEditSpecificationType = getPermissionCode(
    MODULES.PRODUCT_SETUP,
    PERMISSIONS.EDIT_SPECIFICATION_TYPE
  );
  const permissionIdForUpdateSpecificationTypeStatus = getPermissionCode(
    MODULES.PRODUCT_SETUP,
    PERMISSIONS.UPDATE_SPECIFICATION_TYPE_STATUS
  );
  const permissionIdForViewSpecificationTypeDetails = getPermissionCode(
    MODULES.PRODUCT_SETUP,
    PERMISSIONS.VIEW_SPECIFICATION_TYPE_DETAILS
  );

  const hasAddSpecificationTypePermission = hasPermissionId(permissionIdForAddSpecificationType);
  const hasEditSpecificationTypePermission = hasPermissionId(permissionIdForEditSpecificationType);
  const hasUpdateSpecificationTypeStatusPermission = hasPermissionId(permissionIdForUpdateSpecificationTypeStatus);
  const hasViewSpecificationTypeDetailsPermission = hasPermissionId(permissionIdForViewSpecificationTypeDetails);

  // Create/Edit form state
  const [editForm, setEditForm] = useState({
    open: false,
    mode: FORM_MODES.CREATE,
    specificationTypeId: null,
    name: "",
    originalData: null,
  });

  // Hide body scrollbar when component mounts
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

    dispatch(fetchResource({ key: "specificationType", params }));
  }, [dispatch, nCurrentPage, iItemsPerPage, sSearchQuery, oFilters.status]);

  useEffect(() => {
    return () => {
      if (sError) {
        dispatch(clearResourceError("specificationType"));
      }
    };
  }, [dispatch, sError]);

  const handleTableScroll = useCallback((e) => {
    setTableScrollTop(e.target.scrollTop);
  }, []);

  // Open confirmation popup when toggling Active/Inactive
  const handleStatusChange = (specificationTypeId, currentStatus) => {
    // Check permission before allowing status change
    if (!hasUpdateSpecificationTypeStatusPermission) {
      showEmsg(t("COMMON.NO_PERMISSION"), STATUS.ERROR);
      return;
    }
    const isCurrentlyActive = Boolean(currentStatus);
    setStatusPopup({
      open: true,
      specificationTypeId,
      newStatus: !isCurrentlyActive,
    });
  };

  const handleStatusPopupClose = () => {
    setStatusPopup({ open: false, specificationTypeId: null, newStatus: null });
  };

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

  const handleFilterChange = (e, filterName) => {
    setFilters({
      ...oFilters,
      [filterName]: e.target.value,
    });
  };

  // Open "create" form
  const handleCreate = () => {
    // Check permission before allowing specification type creation
    if (!hasAddSpecificationTypePermission) {
      showEmsg(t("COMMON.NO_PERMISSION"), STATUS.ERROR);
      return;
    }
    setEditForm({
      open: true,
      mode: FORM_MODES.CREATE,
      specificationTypeId: null,
      name: "",
      originalData: null,
    });
  };

  // Open "edit" form and fetch latest data by ID
  const handleEdit = async (specificationType) => {
    if (setSubmitting) setSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      const response = await apiGet(
        `${GET_SPECIFICATION_TYPE_ID}/${specificationType.SpecificationTypeID}`,
        {},
        token
      );

      if (response?.data?.status === STATUS.SUCCESS.toUpperCase()) {
        setEditForm({
          open: true,
          mode: FORM_MODES.EDIT,
          specificationTypeId: specificationType.SpecificationTypeID,
          name: response.data.data.Name || specificationType.Name,
          originalData: specificationType,
        });
      } else {
        showEmsg(
          response?.data?.message ||
            t("CONTEXT.ERROR_FETCHING_SPECIFICATION_TYPE"),
          STATUS.ERROR
        );
      }
    } catch (err) {
      const errorMessage =
        err?.response?.data?.message || t("COMMON.API_ERROR");
      showEmsg(errorMessage, STATUS.ERROR);
    } finally {
      hideLoaderWithDelay(setSubmitting);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (setSubmitting) setSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      const userId = localStorage.getItem("userId");

      const payload = {
        Name: editForm.name,
        IsActive: true,
      };

      if (editForm.mode === FORM_MODES.EDIT) {
        payload.SpecificationTypeID = editForm.specificationTypeId;
        payload.UpdatedBy = userId;
      } else {
        payload.CreatedBy = userId;
      }

      let response;

      if (editForm.mode === FORM_MODES.EDIT) {
        response = await apiPut(UPDATE_SPECIFICATION_TYPE, payload, token);
      } else {
        response = await apiPost(CREATE_SPECIFICATION_TYPE, payload, token);
      }

      if (response?.data?.status === STATUS.SUCCESS.toUpperCase()) {
        const successMessage =
          response?.data?.message ||
          (editForm.mode === FORM_MODES.CREATE
            ? t("PRODUCT_SETUP.SPECIFICATION_TYPES.CREATE_SUCCESS")
            : t("PRODUCT_SETUP.SPECIFICATION_TYPES.UPDATE_SUCCESS"));

        showEmsg(successMessage, STATUS.SUCCESS);

        const params = {
          pageNumber: nCurrentPage,
          pageSize: iItemsPerPage,
          searchText: sSearchQuery,
        };
        if (oFilters.status !== STATUS_VALUES.ALL) {
          params.status = oFilters.status;
        }
        dispatch(fetchResource({ key: "specificationType", params }));

        setEditForm({
          open: false,
          mode: FORM_MODES.CREATE,
          specificationTypeId: null,
          name: "",
          originalData: null,
        });
      } else {
        showEmsg(
          response?.data?.message ||
            t("CONTEXT.ERROR_SAVING_SPECIFICATION_TYPE"),
          STATUS.ERROR
        );
      }
    } catch (err) {
      const errorMessage =
        err?.response?.data?.message || t("COMMON.API_ERROR");
      showEmsg(errorMessage, STATUS.ERROR);
    } finally {
      hideLoaderWithDelay(setSubmitting);
    }
  };

  const handleFormCancel = () => {
    setEditForm({
      open: false,
      mode: FORM_MODES.CREATE,
      specificationTypeId: null,
      name: "",
      originalData: null,
    });
  };

  const isEditing = (specificationTypeId) => {
    return (
      editForm.open &&
      editForm.mode === FORM_MODES.EDIT &&
      editForm.specificationTypeId === specificationTypeId
    );
  };

  const getCurrentStatus = (specificationTypeId) => {
    if (isEditing(specificationTypeId) && editForm.originalData) {
      return editForm.originalData.IsActive;
    }
    return null;
  };

  const handleStatusConfirm = async () => {
    if (setSubmitting) setSubmitting(true);
    const { specificationTypeId, newStatus } = statusPopup;

    try {
      const result = await dispatch(
        updateStatusById({
          key: "specificationType",
          id: specificationTypeId,
          newStatus,
          apiRoute: UPDATE_SPECIFICATION_TYPE_STATUS,
          idField: "SpecificationTypeID",
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
      dispatch(fetchResource({ key: "specificationType", params }));
    } catch (err) {
      showEmsg(err?.message || t("COMMON.API_ERROR"), STATUS.ERROR);
    } finally {
      setStatusPopup({
        open: false,
        specificationTypeId: null,
        newStatus: null,
      });
      hideLoaderWithDelay(setSubmitting);
    }
  };

  const statusFilterOptions = STATUS_OPTIONS.map((option) => ({
    value: option.value,
    label: t(option.labelKey),
  }));

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-2 min-h-screen bg-gray-50">
      <style>{customScrollbarStyles}</style>

      {/* Toolbar with search and filters */}
      <div className="mb-6">
        <Toolbar
          searchTerm={sSearchQuery}
          setSearchTerm={setSearchQuery}
          showFilterDropdown={bShowFilters}
          setShowFilterDropdown={setShowFilters}
          searchPlaceholder={t(
            "PRODUCT_SETUP.SPECIFICATION_TYPES.SEARCH_PLACEHOLDER"
          )}
          showSearch={true}
          showViewToggle={false}
          isBrowsePage={true}
          showFilterButton={true}
          
          // --- Permission-based Create Button ---
          onCreate={handleCreate}
          createLabel={t("PRODUCT_SETUP.CREATE")}
          disableCreate={!hasAddSpecificationTypePermission}
          
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

      {/* Loading/Error states */}
      {bLoading ? (
        <div className="text-center py-8 text-gray-500">
          {t("COMMON.LOADING")}
        </div>
      ) : sError ? (
        <div className="text-center py-8 text-red-500">
          {t("COMMON.ERROR")}: {sError}
        </div>
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
                    {t("PRODUCT_SETUP.SPECIFICATION_TYPES.TABLE.NAME")}
                  </th>
                  <th className="table-head-cell-floating text-center px-6 py-4">
                    {t("COMMON.CREATED_AT")}
                  </th>
                  <th className="table-head-cell-floating text-center px-6 py-4">
                    {t("COMMON.STATUS")}
                  </th>
                  <th className="table-head-cell-floating text-center px-6 py-4">
                    {t("COMMON.UPDATE_STATUS")}
                  </th>
                  <th className="table-head-cell-floating text-center px-6 py-4">
                    {t("COMMON.ACTIONS")}
                  </th>
                </tr>
              </thead>

              <tbody className="table-body">
                {/* Create row */}
                {editForm.open && editForm.mode === FORM_MODES.CREATE && (
                  <tr className="table-row bg-blue-50 hover:bg-blue-100">
                    <td className="table-cell text-left align-middle px-6 py-2">
                      <input
                        type="text"
                        name="name"
                        value={editForm.name}
                        onChange={handleFormChange}
                        className="w-full px-3 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder={t(
                          "PRODUCT_SETUP.SPECIFICATION_TYPES.NAME_PLACEHOLDER"
                        )}
                        required
                      />
                    </td>
                    <td className="table-cell text-center align-middle px-6 py-2">
                      <span className="text-sm">-</span>
                    </td>
                    <td className="table-cell text-center align-middle px-6 py-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                        {t("COMMON.ACTIVE")}
                      </span>
                    </td>
                    <td className="table-cell text-center align-middle px-6 py-2">
                      <div className="flex justify-center">
                        <Switch checked={true} disabled={true} />
                      </div>
                    </td>
                    <td className="table-cell text-center align-middle px-6 py-2">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={handleFormSubmit}
                          className="btn-primary py-1 px-3 text-sm"
                        >
                          {t("COMMON.SAVE")}
                        </button>
                        <button
                          onClick={handleFormCancel}
                          className="btn-cancel py-1 px-3 text-sm"
                        >
                          {t("COMMON.CANCEL")}
                        </button>
                      </div>
                    </td>
                  </tr>
                )}

                {/* List all specification types */}
                {aSpecificationTypes.map((specType) => {
                  const editing = isEditing(specType.SpecificationTypeID);
                  const currentStatus = editing
                    ? getCurrentStatus(specType.SpecificationTypeID)
                    : specType.IsActive;
                  const isInactive = !currentStatus;

                  return (
                    <tr
                      key={specType.SpecificationTypeID}
                      className={`table-row items-center hover:bg-gray-50 ${
                        editing ? "bg-blue-50" : ""
                      } ${isInactive && !editing ? "bg-gray-50" : ""}`}
                    >
                      {/* Name column */}
                      <td
                        className={`table-cell text-left align-middle px-6 py-1 ${
                          isInactive && !editing ? "text-gray-500" : ""
                        }`}
                      >
                        {editing ? (
                          <input
                            type="text"
                            name="name"
                            value={editForm.name}
                            onChange={handleFormChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder={t(
                              "PRODUCT_SETUP.SPECIFICATION_TYPES.NAME_PLACEHOLDER"
                            )}
                            required
                          />
                        ) : (
                          <div
                            className={`text-sm block truncate max-w-[180px] font-medium ${
                              isInactive ? "cursor-not-allowed" : ""
                            }`}
                            title={
                              isInactive
                                ? t(
                                    "PRODUCT_SETUP.SPECIFICATION_TYPES.EDIT_DISABLED_TOOLTIP"
                                  )
                                : specType.Name
                            }
                          >
                            {specType.Name}
                          </div>
                        )}
                      </td>

                      {/* Created At column */}
                      <td
                        className={`table-cell text-center align-middle px-6 py-1 ${
                          isInactive && !editing
                            ? "text-gray-400"
                            : "text-gray-600"
                        }`}
                      >
                        <span className="text-sm">
                          {specType.CreatedAt
                            ? new Date(specType.CreatedAt).toLocaleString(
                                undefined,
                                DATE_FORMAT_OPTIONS
                              )
                            : "-"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="table-cell text-center align-middle px-6 py-1">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            currentStatus
                              ? "bg-green-100 text-green-800 border border-green-200"
                              : "bg-red-100 text-red-800 border border-red-200"
                          }`}
                        >
                          {t(`COMMON.${currentStatus ? "ACTIVE" : "INACTIVE"}`)}
                        </span>
                      </td>

                      {/* Toggle status */}
                      <td className="table-cell text-center align-middle px-6 py-1">
                        <div className="relative group inline-block">
                          <Tooltip
                            text={hasUpdateSpecificationTypeStatusPermission ? t("TOOLTIPS.UPDATE_SPECIFICATION_TYPE_STATUS_TOOLTIP") : t("COMMON.NO_PERMISSION_TOOLTIP")}
                            position="left"
                          >
                            <Switch
                              checked={Boolean(currentStatus)}
                              disabled={!hasUpdateSpecificationTypeStatusPermission}
                              disableTooltip={true}
                              onChange={() =>
                                handleStatusChange(
                                  specType.SpecificationTypeID,
                                  currentStatus
                                )
                              }
                            />
                          </Tooltip>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="table-cell text-center align-middle px-6 py-1">
                        <div className="flex items-center justify-center gap-2">
                          {editing ? (
                            <>
                              <button
                                onClick={handleFormSubmit}
                                className="btn-primary py-1 px-3 text-sm"
                              >
                                {t("COMMON.SAVE")}
                              </button>
                              <button
                                onClick={handleFormCancel}
                                className="btn-cancel py-1 px-3 text-sm"
                              >
                                {t("COMMON.CANCEL")}
                              </button>
                            </>
                          ) : (
                            <ActionButtons
                              id={specType.SpecificationTypeID}
                              onEdit={() => {
                                if (hasEditSpecificationTypePermission) {
                                  handleEdit(specType);
                                } else {
                                  showEmsg(t("COMMON.NO_PERMISSION"), STATUS.ERROR);
                                }
                              }}
                              /* 
                                Disable Edit button only if Item is Inactive or no permission
                              */
                               disableEdit={!specType.editable || !hasEditSpecificationTypePermission}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!bLoading &&
        !sError &&
        aSpecificationTypes.length === 0 &&
        !editForm.open && (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="text-gray-500">
              {t("PRODUCT_SETUP.SPECIFICATION_TYPES.EMPTY.MESSAGE")}
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

      {/* Pagination - Fixed at bottom */}
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

      {/* Confirmation popup for status change */}
      {statusPopup.open && (
        <FullscreenErrorPopup
          message={
            statusPopup.newStatus
              ? t("PRODUCT_SETUP.SPECIFICATION_TYPES.CONFIRM_ACTIVATE")
              : t("PRODUCT_SETUP.SPECIFICATION_TYPES.CONFIRM_DEACTIVATE")
          }
          onClose={handleStatusPopupClose}
          onConfirm={handleStatusConfirm}
        />
      )}
    </div>
  );
};

export default SpecificationTypeList;