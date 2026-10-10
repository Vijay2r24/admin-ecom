import { useState, useEffect, useCallback } from "react";
import Loader from "../components/Loader";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import TextwithIcone from "../components/TextInputWithIcon";
import { Shield, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";
import { apiGet, apiPost, apiPut } from "../utils/ApiUtils";
import {
  GET_ALL_PERMISSIONS,
  CREATE_ROLE_PERMISSION,
  UPDATE_ROLE_PERMISSION,
  GET_ALL_PERMISSIONS_BY_ROLE_ID,
} from "../contants/apiRoutes";
import { showEmsg } from "../utils/ShowEmsg";
import { useTitle } from "../context/TitleContext";
import {
  COLORS,
  REGEX_CONSTANTS,
  SCROLL_CONSTANTS,
  STATUS,
  getPermissionTooltip,
  isViewPermissionName,
  isEditPermissionName,
  getViewPermissionForEdit,
  getEditPermissionForView,
  STATUS_DROPDOWN_OPTIONS,
  STATUS_VALUES,
  EDIT_TO_VIEW_PERMISSION_MAPPINGS,
  VIEW_TO_EDIT_PERMISSION_MAPPINGS,
} from "../contants/constants";
import BackButton from "../components/BackButton";
import { ToastContainer } from "react-toastify";
import SelectWithIcon from "../components/SelectWithIcon";
import FloatingFooter from "../components/FloatingFooter";
import Tooltip from "../components/Tooltip";

const AddUserRole = () => {
  const [sRoleName, setRoleName] = useState("");
  const [oPermissionsByModule, setPermissionsByModule] = useState({});
  const [nError, setError] = useState(null);
  const [oErrors, setErrors] = useState({});
  const [oFieldValid, setFieldValid] = useState({});
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [bSubmitting, setSubmitting] = useState(false);
  const [bIsActive, setIsActive] = useState(true);
  const { t } = useTranslation();
  const location = useLocation();
  const { roleId } = useParams();
  const { roleName, status } = location.state || {};
  const { setTitle, setBackButton } = useTitle();
  const navigate = useNavigate();

  // Required fields configuration
  const requiredFields = {
    RoleName: true,
  };

  // Check if the current role is an admin role (case-insensitive)
  const isAdminRole = useCallback(() => {
    const adminRoleNames = ["admin"];
    return adminRoleNames.includes(sRoleName?.toLowerCase().trim());
  }, [sRoleName]);

  useEffect(() => {
    setTitle(
      roleId
        ? t("CREATE_USER_ROLE.EDIT_USER_ROLE")
        : t("CREATE_USER_ROLE.ADD_USER_ROLE")
    );
    setBackButton(<BackButton onClick={() => window.history.back()} />);
    return () => {
      setBackButton(null);
      setTitle("");
    };
  }, [setTitle, setBackButton, t, roleId]);

  useEffect(() => {
    if (roleName) {
      setRoleName(roleName);
      // Validate initial role name
      validateField("RoleName", roleName);
    }
    if (status !== undefined) {
      setIsActive(status === true);
    }
  }, [roleName, status]);

  /**
   * Live validation functions
   */
  const validateRoleName = (roleName) => {
    if (!roleName?.trim()) {
      return t("CREATE_USER_ROLE.ROLE_ISREQUID");
    }
    if (roleName.trim().length < 2) {
      return t("CREATE_USER_ROLE.ROLE_NAME_MIN_LENGTH");
    }
    if (roleName.trim().length > 50) {
      return t("CREATE_USER_ROLE.ROLE_NAME_MAX_LENGTH");
    }
    // Check for special characters (only allow letters, numbers, spaces, and basic punctuation)
    const roleNameRegex = REGEX_CONSTANTS.ROLE_NAME;
    if (!roleNameRegex.test(roleName.trim())) {
      return t("CREATE_USER_ROLE.ROLE_NAME_INVALID");
    }
    return "";
  };

  const validatePermissions = (permissions) => {
    const hasSelectedPermissions = Object.values(permissions).some(
      (modulePermissions) =>
        modulePermissions.some((permission) => permission.IsChecked)
    );
    if (!hasSelectedPermissions) {
      return t("CREATE_USER_ROLE.PERMISSIONS_REQUIRED");
    }
    return "";
  };

  /**
   * Live validation for a specific field
   */
  const validateField = useCallback(
    (name, value) => {
      let error = "";

      switch (name) {
        case "RoleName":
          error = validateRoleName(value);
          break;
        case "Permissions":
          error = validatePermissions(value);
          break;
        default:
          break;
      }

      setErrors((prev) => ({
        ...prev,
        [name]: error,
      }));

      setFieldValid((prev) => ({
        ...prev,
        [name]: !error && value !== "" && value !== null && value !== undefined,
      }));
    },
    [t]
  );

  const enforceViewLogicForModule = (permissionsObj, moduleName) => {
    if (!permissionsObj || !permissionsObj[moduleName]) return permissionsObj;

    const updated = { ...permissionsObj };
    const perms = [...updated[moduleName]];

    // Find the master view permission (basic view like "View Users", but not "View Categories", "View Brands", "View Attribute Types", "View Attributes", "View Specification Types", or "View Colours")
    const masterViewIndex = perms.findIndex((p) => {
      const name = p.Name.toLowerCase().trim();
      return name === "view users" || 
             name === "view stores" || 
             name === "view products" ||
             name === "view roles" ||
             name === "view banners" ||
             name === "view orders" ||
             name === "view customers" ||
             name === "view coupons" ||
             name === "view notifications" ||
             name === "view pages" ||
             (name.startsWith("view ") && !name.includes("details") && !name.includes("brands") && !name.includes("categories") && !name.includes("attribute types") && !name.includes("attributes") && !name.includes("specification types") && !name.includes("colours") && !name.includes("product groups"));
    });

    if (masterViewIndex !== -1) {
      const masterViewPermission = perms[masterViewIndex];
      
      if (!masterViewPermission.IsChecked) {
        // If master view permission is deselected, deselect ALL other permissions
        for (let i = 0; i < perms.length; i++) {
          if (i !== masterViewIndex && perms[i].IsChecked) {
            perms[i] = { ...perms[i], IsChecked: false };
          }
        }
      } else {
        // If master view permission is selected, enforce edit→view dependencies
        perms.forEach((permission, index) => {
          if (index !== masterViewIndex) {
            // Only enforce edit→view dependencies for edit permissions, but allow view permissions to be independent
            if (index !== masterViewIndex && isEditPermissionName(permission.Name)) {
              const requiredViewPermission = getViewPermissionForEdit(permission.Name);
              if (requiredViewPermission) {
                const viewPermissionIndex = perms.findIndex(
                  (p) => p.Name.toLowerCase().trim() === requiredViewPermission
                );
                if (viewPermissionIndex !== -1) {
                  // If edit is selected, auto-select view (but don't deselect view when edit is deselected)
                  if (permission.IsChecked && !perms[viewPermissionIndex].IsChecked) {
                    perms[viewPermissionIndex] = { ...perms[viewPermissionIndex], IsChecked: true };
                  }
                  // Remove reverse dependency - don't deselect view when edit is deselected
                }
              }
            }
          }
        });
      }
    } else {
      // Fallback: If no master view permission found, enforce edit→view dependencies
      perms.forEach((permission) => {
        if (permission.IsChecked) {
          // If edit permission is selected, auto-select corresponding view permission
          if (isEditPermissionName(permission.Name)) {
            const requiredViewPermission = getViewPermissionForEdit(permission.Name);
            if (requiredViewPermission) {
              const viewPermissionIndex = perms.findIndex(
                (p) => p.Name.toLowerCase().trim() === requiredViewPermission
              );
              if (viewPermissionIndex !== -1 && !perms[viewPermissionIndex].IsChecked) {
                perms[viewPermissionIndex] = { ...perms[viewPermissionIndex], IsChecked: true };
              }
            }
          }
        }
        // Remove reverse dependency - don't deselect view when edit is deselected
        // This allows view permissions to be independent
      });
    }

    updated[moduleName] = perms;
    return updated;
  };

  const enforceViewLogicAllModules = useCallback((permissionsObj, moduleName) => {
    if (!permissionsObj || !permissionsObj[moduleName]) return permissionsObj;
    let updated = { ...permissionsObj };
    const perms = [...updated[moduleName]];
    const hasAnyViewChecked = perms.some(p => 
      p.Name.toLowerCase().startsWith("view") && p.IsChecked
    );
    const masterViewIndex = perms.findIndex(p => {
       const name = p.Name.toLowerCase();
       return name.startsWith("view ") && !name.includes("details");
    });
    perms.forEach((permission, index) => {
      if (permission.IsChecked && !permission.Name.toLowerCase().startsWith("view")) {
        if (masterViewIndex !== -1 && !perms[masterViewIndex].IsChecked) {
          perms[masterViewIndex] = { ...perms[masterViewIndex], IsChecked: true };
        }
      }
    });
    updated[moduleName] = perms;
    return updated;
  }, []);

  const fetchPermissions = useCallback(async () => {
    setLoadingPermissions(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      let permissionsArr = [];
      if (roleId) {
        const rolePermRes = await apiGet(
          `${GET_ALL_PERMISSIONS_BY_ROLE_ID}/${roleId}`,
          {},
          token
        );
        const roleData = rolePermRes?.data;
        if (roleData?.status?.toUpperCase() === STATUS.SUCCESS.toUpperCase()) {
          if (Array.isArray(roleData.data?.result)) {
            permissionsArr = roleData.data.result;
          } else if (
            roleData.data?.data?.rows &&
            Array.isArray(roleData.data.data.rows)
          ) {
            permissionsArr = roleData.data.data.rows;
          } else if (roleData.data?.rows && Array.isArray(roleData.data.rows)) {
            permissionsArr = roleData.data.rows;
          } else if (Array.isArray(roleData.data)) {
            permissionsArr = roleData.data;
          } else if (Array.isArray(roleData.data?.permissions)) {
            permissionsArr = roleData.data.permissions;
            setRoleName(roleData.data.roleName || "");
            setIsActive(
              roleData.data.isActive !== undefined
                ? roleData.data.isActive
                : true
            );
          }
        }
      } else {
        const res = await apiGet(GET_ALL_PERMISSIONS, {}, token);
        const resData = res?.data;

        if (resData?.status?.toUpperCase() === STATUS.SUCCESS.toUpperCase()) {
          if (Array.isArray(resData.data)) {
            permissionsArr = resData.data;
          } else if (Array.isArray(resData.data?.result)) {
            permissionsArr = resData.data.result;
          } else if (
            resData.data?.data?.rows &&
            Array.isArray(resData.data.data.rows)
          ) {
            permissionsArr = resData.data.data.rows;
          } else if (resData.data?.rows && Array.isArray(resData.data.rows)) {
            permissionsArr = resData.data.rows;
          } else if (Array.isArray(resData.result)) {
            permissionsArr = resData.result;
          }
        }
      }

      if (permissionsArr.length > 0) {
        const categorizedPermissions = {};
        permissionsArr.forEach((permission) => {
          const module =
            permission.Module ||
            permission.PermissionModule ||
            permission.module;
          if (module === "Menu Management") return;
          const id =
            permission.PermissionID || permission.ID || permission.permissionId;
          const name =
            permission.PermissionName ||
            permission.Name ||
            permission.permissionName;
          const isChecked = permission.IsChecked || false;

          if (!categorizedPermissions[module]) {
            categorizedPermissions[module] = [];
          }
          categorizedPermissions[module].push({
            ID: id,
            Name: name,
            IsChecked: isChecked,
          });
        });
        let finalizedPermissions = {};
        Object.keys(categorizedPermissions).forEach(moduleKey => {
          finalizedPermissions = enforceViewLogicAllModules(categorizedPermissions, moduleKey);
        });
        setPermissionsByModule(finalizedPermissions);
      } else {
        setPermissionsByModule({});
        setError(t("CREATE_USER_ROLE.NO_PERMISSIONS_FOUND"));
      }
    } catch (err) {
      const backendMessage = err?.response?.data?.message;
      setPermissionsByModule({});
      setError(backendMessage);
    } finally {
      setLoadingPermissions(false);
    }
  }, [roleId, enforceViewLogicAllModules, t, validateField]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const handleCheckboxChange = useCallback(
    (moduleName, permissionId) => {
      if (isAdminRole()) return;
      setPermissionsByModule((prev) => {
        const updated = { ...prev };
        updated[moduleName] = updated[moduleName].map((p) =>
          p.ID === permissionId ? { ...p, IsChecked: !p.IsChecked } : p
        );
        const finalPermissions = enforceViewLogicForModule(updated, moduleName);

        // Clear permission error once user selects something
        setErrors((prev) => ({ ...prev, Permissions: "" }));

        return finalPermissions;
      });
    },
    [isAdminRole]
  );

  const handleSelectAllChange = useCallback(
    (moduleName, isChecked) => {
      if (isAdminRole()) return;
      setPermissionsByModule((prev) => {
        const updated = { ...prev };
        updated[moduleName] = updated[moduleName].map((p) => ({
          ...p,
          IsChecked: isChecked,
        }));

        const finalPermissions = enforceViewLogicForModule(updated, moduleName);

        // Clear permission error once user selects something
        setErrors((prev) => ({ ...prev, Permissions: "" }));

        return finalPermissions;
      });
    },
    [isAdminRole]
  );

  const handleClose = useCallback(() => {
    navigate("/userRoles");
  }, [navigate]);

  const validateRoleDataSubmit = useCallback(() => {
    const newErrors = {};

    newErrors.RoleName = validateRoleName(sRoleName);
    newErrors.Permissions = validatePermissions(oPermissionsByModule);

    // Update field validation states
    setFieldValid({
      RoleName: !newErrors.RoleName && sRoleName.trim() !== "",
      Permissions: !newErrors.Permissions,
    });

    // Return only errors that have messages
    const filteredErrors = Object.fromEntries(
      Object.entries(newErrors).filter(([_, value]) => value !== "")
    );

    setErrors(filteredErrors);
    return Object.keys(filteredErrors).length > 0;
  }, [sRoleName, oPermissionsByModule, t]);

  const handleRoleNameChange = (e) => {
    // Don't allow role name changes for admin roles during edit
    if (roleId && isAdminRole()) {
      return;
    }
    const newValue = e.target.value;
    setRoleName(newValue);
    validateField("RoleName", newValue);
  };

  /**
   * Handle field blur for additional validation
   */
  const handleRoleNameBlur = (e) => {
    const { value } = e.target;
    validateField("RoleName", value);
  };

  const handleStatusChange = (e) => {
    // Don't allow status changes for admin roles
    if (isAdminRole()) {
      return;
    }
    setIsActive(e.target.value === STATUS_VALUES.BOOLEAN_ACTIVE);
  };

  const handleSave = useCallback(
    async (event) => {
      event.preventDefault();
      
      const hasErrors = validateRoleDataSubmit();

      // IF validation fails
      if (hasErrors) {

        window.scrollTo({
          top: 0,
          behavior: SCROLL_CONSTANTS.BEHAVIOR || "smooth",
        });

     
        if (!sRoleName || !sRoleName.trim()) {
           setTimeout(() => {
             const element = document.getElementById("RoleName");
             if (element) element.focus();
           }, 100);
        }
        return;
      }

      setSubmitting(true);

      // Extract permissions in required format
      let permissions;

      if (!roleId) {
        permissions = Object.values(oPermissionsByModule)
          .flat()
          .filter((p) => p.IsChecked)
          .map((p) => p.ID);
      } else {
        permissions = Object.values(oPermissionsByModule)
          .flat()
          .map((permission) => ({
            permissionId: permission.ID,
            isChecked: permission.IsChecked,
          }));
      }

      const userId = localStorage.getItem("userId");
      const tenantID = localStorage.getItem("tenantID");

      // Base role data
      const roleData = {
        RoleName: sRoleName,
        IsActive: bIsActive,
        Permissions: permissions, 
      };

      // Add additional fields based on create vs update
      if (roleId) {
        // For update - include RoleID and UpdatedBy
        roleData.RoleID = roleId;
        roleData.UpdatedBy = userId;
      } else {
        // For create - include CreatedBy and TenantID
        roleData.CreatedBy = userId;
        roleData.TenantID = tenantID;
      }

      try {
        const token = localStorage.getItem("token");
        let res;

        const userId = localStorage.getItem("userId");
        
        if (roleId) {
          // Use PUT for update with updateRolePermission endpoint
          roleData.RoleID = roleId;
          roleData.UpdatedBy = userId;
          roleData.UpdatedOn = new Date().toISOString();
      
          res = await apiPut(UPDATE_ROLE_PERMISSION, roleData, token);
        } else {
          // Use POST for create with createRolePermission endpoint
          roleData.CreatedBy = userId;
          roleData.CreatedOn = new Date().toISOString();
          roleData.TenantID = localStorage.getItem("tenantID");
         
          res = await apiPost(CREATE_ROLE_PERMISSION, roleData, token);
        }

        const resData = res?.data;
        if (resData?.status?.toUpperCase() === STATUS.SUCCESS.toUpperCase()) {
          showEmsg(
            resData.message || t("CREATE_USER_ROLE.SAVE_SUCCESS"),
            STATUS.SUCCESS,
            3000,
            () => {
              navigate("/userRoles");
            }
          );
        } else {
          showEmsg(resData?.message || t("COMMON.API_ERROR"), STATUS.ERROR);
        }
      } catch (err) {
        const backendMessage =
          err?.response?.data?.message ||
          err?.message ||
          t("COMMON.API_ERROR");
        showEmsg(backendMessage, STATUS.ERROR);
      } finally {
        setSubmitting(false);
      }
    },
    [
      validateRoleDataSubmit,
      oPermissionsByModule,
      roleId,
      sRoleName,
      bIsActive,
      t,
      navigate,
      isAdminRole,
    ]
  );

  // Helper function to render label with required asterisk
  const renderLabel = (fieldName, translationKey) => {
    const isRequired = requiredFields[fieldName];
    return (
      <span>
        {t(translationKey)}
        {isRequired && <span className="text-red-500 ml-1">*</span>}
      </span>
    );
  };

  if (nError) {
    return <div>{t("CREATE_USER_ROLE.FAILED_TO_FETCH_PERMISSIONS")}</div>;
  }

  const loaderOverlay = bSubmitting ? (
    <div className="global-loader-overlay">
      <Loader />
    </div>
  ) : null;

  const isEditingAdmin = roleId && isAdminRole();

  return (
     <div className="w-full mx-auto pb-20 overflow-x-hidden">
      <ToastContainer />
      {loaderOverlay}

      {/* Main Content Area */}
      <div className="w-full flex-grow pb-24 px-4 lg:px-8">
        <div>
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <p className="text-gray-500 truncate">
                {t("CREATE_USER_ROLE.ADD_USER_ROLE_DESCRIPTION")}
              </p>
            </div>
          </div>
          <form onSubmit={handleSave}>
            <div className="flex flex-col md:flex-row md:space-x-4 mb-6">
              <div className="w-full md:w-1/2">
                {/* Added ID here to allow focus targeting */}
                <TextwithIcone
                  id="RoleName"
                  label={renderLabel("RoleName", "COMMON.ROLE")}
                  type="text"
                  value={sRoleName}
                  onChange={handleRoleNameChange}
                  onBlur={handleRoleNameBlur}
                  placeholder={t("CREATE_USER_ROLE.ROLE_ISREQUID")}
                  error={oErrors.RoleName}
                  isValid={oFieldValid.RoleName}
                  required={requiredFields.RoleName}
                  Icon={Shield}
                  disabled={isEditingAdmin}
                />
              </div>

              <div className="w-full md:w-1/2">
                <SelectWithIcon
                  label={t("PRODUCT_SETUP.CREATE_BRAND.STATUS_LABEL")}
                  id="IsActive"
                  name="IsActive"
                  value={bIsActive.toString()}
                  onChange={handleStatusChange}
                  options={STATUS_DROPDOWN_OPTIONS.map((opt) => ({
                    value: opt.value,
                    label: t(opt.labelKey),
                  }))}
                  Icon={Tag}
                  error={oErrors.IsActive}
                  disabled={!isEditingAdmin}
                  
                />
              </div>
            </div>

            <hr className="border-gray-300 my-4 mb-6" />

            <div className="permissions-section">
              {loadingPermissions ? (
                <div className="text-center py-8 truncate">
                  {t("COMMON.LOADING")}
                </div>
              ) : (
                <>
                  {/* Permissions validation error */}
                  {oErrors.Permissions && (
                    <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                      <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-red-600 font-medium">{oErrors.Permissions}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.keys(oPermissionsByModule).map((moduleName) => {
                      const isAllSelected = oPermissionsByModule[
                        moduleName
                      ].every((permission) => permission.IsChecked);

                      return (
                        <div
                          key={moduleName}
                          className={`border p-4 rounded-lg shadow ${
                            isEditingAdmin ? "bg-gray-100" : COLORS.GRAY_PRIMARY
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <h2 className="text-lg font-bold truncate">{moduleName}</h2>
                            <label className="text-sm">
                              <input
                                type="checkbox"
                                checked={isAllSelected}
                                onChange={(e) => handleSelectAllChange(moduleName, e.target.checked)}
                                className="mr-2"
                                disabled={isEditingAdmin}
                              />
                              {t("CREATE_USER_ROLE.SELECT_ALL")}
                            </label>
                          </div>
                          <hr className="border-gray-300 my-4 mt-2 mb-4" />
                          {oPermissionsByModule[moduleName].map(
                            (permission) => {
                              const tooltipText = getPermissionTooltip(permission, isEditingAdmin, isAdminRole(), oPermissionsByModule[moduleName], t);

                              return (
                                <div
                                  key={permission.ID}
                                  className="flex items-center mb-2"
                                >
                                  <Tooltip 
                                    text={tooltipText}
                                    position="top"
                                    align="left"
                                    showArrow={true}
                                  >
                                    <label className="truncate">
                                      <input
                                        type="checkbox"
                                        checked={permission.IsChecked}
                                        onChange={() =>
                                          handleCheckboxChange(
                                            moduleName,
                                            permission.ID
                                          )
                                        }
                                        className={`mr-2 form-checkbox h-[12px] w-[12px] ${
                                          isEditingAdmin
                                            ? "text-gray-400 cursor-not-allowed"
                                            : "text-blue-600"
                                        }`}
                                        disabled={isEditingAdmin}
                                      />
                                      {permission.Name}
                                    </label>
                                  </Tooltip>
                                </div>
                              );
                            }
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </form>
        </div>
      </div>

      <FloatingFooter
        onCancel={handleClose}
        onSubmit={handleSave}
        isSubmitting={bSubmitting}
        isEditMode={!!roleId}
      />
    </div>
  );
};

export default AddUserRole;