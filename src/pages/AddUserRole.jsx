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
  STATUS_DROPDOWN_OPTIONS,
  STATUS_VALUES,
} from "../contants/constants";
import BackButton from "../components/BackButton";
import { ToastContainer } from "react-toastify";
import SelectWithIcon from "../components/SelectWithIcon";
import FloatingFooter from "../components/FloatingFooter";

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

  const isViewPermissionName = (name) => {
    if (!name || typeof name !== "string") return false;
    const lower = name.toLowerCase().trim();
    return (
      lower.startsWith("view") ||
      lower.includes(" view") ||
      /\bview\b/.test(lower)
    );
  };

  const enforceViewLogicForModule = (permissionsObj, moduleName) => {
    if (!permissionsObj || !permissionsObj[moduleName]) return permissionsObj;

    if (moduleName === "Menu Management") return permissionsObj;

    const updated = { ...permissionsObj };
    const perms = [...updated[moduleName]];

    const viewIndex = perms.findIndex((p) =>
      isViewPermissionName(p.Name || "")
    );

    const anyNonViewSelected = perms.some(
      (p) => !isViewPermissionName(p.Name || "") && p.IsChecked
    );

    if (anyNonViewSelected && viewIndex !== -1 && !perms[viewIndex].IsChecked) {
      perms[viewIndex] = { ...perms[viewIndex], IsChecked: true };
    }

    if (viewIndex !== -1 && !perms[viewIndex].IsChecked) {
      for (let i = 0; i < perms.length; i++) {
        if (i === viewIndex) continue;
        if (perms[i].IsChecked) {
          perms[i] = { ...perms[i], IsChecked: false };
        }
      }
    }

    updated[moduleName] = perms;
    return updated;
  };

  const enforceViewLogicAllModules = useCallback((permissionsObj) => {
    if (!permissionsObj) return permissionsObj;
    let updated = { ...permissionsObj };
    Object.keys(updated).forEach((moduleName) => {
      if (moduleName === "Menu Management") return;
      updated = enforceViewLogicForModule(updated, moduleName);
    });
    return updated;
  }, []);

  const syncMenuManagement = useCallback(
    (permissions) => {
      const menuModule = "Menu Management";
      if (!permissions[menuModule]) return permissions;

      permissions[menuModule] = permissions[menuModule].map((p) =>
        p.Name.toLowerCase().includes("dashboard")
          ? { ...p, IsChecked: true }
          : p
      );

      Object.keys(permissions).forEach((moduleName) => {
        if (moduleName === menuModule) return;

        const keyword = moduleName
          .toLowerCase()
          .replace("management", "")
          .replace("setup", "")
          .trim();

        const anySelected = permissions[moduleName].some((p) => p.IsChecked);

        permissions[menuModule] = permissions[menuModule].map((menuItem) => {
          if (menuItem.Name.toLowerCase().includes(keyword)) {
            return { ...menuItem, IsChecked: anySelected };
          }
          return menuItem;
        });
      });

      const productManagementSelected = permissions["Product Management"]
        ? permissions["Product Management"].some((p) => p.IsChecked)
        : false;

      const productSetupSelected = permissions["Product Setup"]
        ? permissions["Product Setup"].some((p) => p.IsChecked)
        : false;

      const shouldCheckProducts =
        productManagementSelected || productSetupSelected;

      permissions[menuModule] = permissions[menuModule].map((menuItem) => {
        if (menuItem.Name.toLowerCase() === "products") {
          return { ...menuItem, IsChecked: shouldCheckProducts };
        }
        return menuItem;
      });

      const final = enforceViewLogicAllModules(permissions);
      return final;
    },
    [enforceViewLogicAllModules]
  );

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
        if (roleData?.status === STATUS.SUCCESS.toUpperCase()) {
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

        if (resData?.status === STATUS.SUCCESS.toUpperCase()) {
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

        const syncedPermissions = (() => {
          const updated = { ...categorizedPermissions };
          const menuModule = "Menu Management";
          if (!updated[menuModule]) return updated;

          updated[menuModule] = updated[menuModule].map((p) =>
            p.Name.toLowerCase().includes("dashboard")
              ? { ...p, IsChecked: true }
              : p
          );

          Object.keys(updated).forEach((moduleName) => {
            if (moduleName === menuModule) return;
            const keyword = moduleName
              .toLowerCase()
              .replace("management", "")
              .replace("setup", "")
              .trim();

            const anySelected = updated[moduleName].some((p) => p.IsChecked);
            updated[menuModule] = updated[menuModule].map((menuItem) =>
              menuItem.Name.toLowerCase().includes(keyword)
                ? { ...menuItem, IsChecked: anySelected }
                : menuItem
            );
          });

          return updated;
        })();

        const enforced = enforceViewLogicAllModules(syncedPermissions);

        const ordered = {};
        if (enforced["Menu Management"]) {
          ordered["Menu Management"] = enforced["Menu Management"];
        }
        Object.keys(enforced)
          .filter((key) => key !== "Menu Management")
          .forEach((key) => {
            ordered[key] = enforced[key];
          });

        setPermissionsByModule(ordered);

        // Validate permissions after setting
        setTimeout(() => {
          validateField("Permissions", ordered);
        }, 100);
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

        const afterViewEnforce = enforceViewLogicForModule(updated, moduleName);
        const finalPermissions = syncMenuManagement(afterViewEnforce);

        // Validate permissions after change
        validateField("Permissions", finalPermissions);

        return finalPermissions;
      });
    },
    [isAdminRole, syncMenuManagement, validateField]
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

        const afterViewEnforce = enforceViewLogicForModule(updated, moduleName);
        const finalPermissions = syncMenuManagement(afterViewEnforce);

        // Validate permissions after change
        validateField("Permissions", finalPermissions);

        return finalPermissions;
      });
    },
    [isAdminRole, syncMenuManagement, validateField]
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
      if (validateRoleDataSubmit()) {
        // Scroll to first error
        const firstErrorField = Object.keys(oErrors)[0];
        if (firstErrorField) {
          const element = document.getElementById(firstErrorField);
          if (element) {
            element.scrollIntoView({
              behavior: SCROLL_CONSTANTS.BEHAVIOR,
              block: SCROLL_CONSTANTS.BLOCK,
            });
            element.focus();
          } else if (firstErrorField === "Permissions") {
            // Scroll to permissions section if permissions error
            const permissionsSection = document.querySelector(
              ".permissions-section"
            );
            if (permissionsSection) {
              permissionsSection.scrollIntoView({
                behavior: SCROLL_CONSTANTS.BEHAVIOR,
                block: SCROLL_CONSTANTS.BLOCK,
              });
            }
          }
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
        Permissions: permissions, // Send array of permission objects with permissionId and isChecked
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

        if (roleId) {
          // Use PUT for update with updateRolePermission endpoint
          res = await apiPut(UPDATE_ROLE_PERMISSION, roleData, token);
        } else {
          // Use POST for create with createRolePermission endpoint
          res = await apiPost(CREATE_ROLE_PERMISSION, roleData, token);
        }

        const resData = res?.data;
        if (resData?.status === STATUS.SUCCESS.toUpperCase()) {
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
        showEmsg(
          err.response?.data?.message || t("COMMON.API_ERROR"),
          STATUS.ERROR
        );
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
      oErrors,
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

  // Count selected permissions for feedback
  const selectedPermissionsCount = Object.values(oPermissionsByModule)
    .flat()
    .filter((permission) => permission.IsChecked).length;

  return (
    <div className="flex flex-col min-h-screen">
      <ToastContainer />
      {loaderOverlay}

      {/* Main Content Area */}
      <div className={`max-w-8xl mx-auto w-full flex-grow pb-24 px-4 lg:px-8`}>
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
                <TextwithIcone
                  label={renderLabel("RoleName", "COMMON.ROLE")}
                  type="text"
                  value={sRoleName}
                  onChange={handleRoleNameChange}
                  onBlur={handleRoleNameBlur}
                  placeholder={t("CREATE_USER_ROLE.ENTER_ROLE_NAME")}
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
                  disabled={isEditingAdmin}
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
                            <h2 className="text-lg font-bold truncate">
                              {moduleName}
                            </h2>
                            <label className="text-sm truncate">
                              <input
                                type="checkbox"
                                checked={isAllSelected}
                                onChange={(e) =>
                                  handleSelectAllChange(
                                    moduleName,
                                    e.target.checked
                                  )
                                }
                                className={`mr-2 form-checkbox h-[12px] w-[12px] ${
                                  isEditingAdmin
                                    ? "text-gray-400 cursor-not-allowed"
                                    : "text-blue-600"
                                }`}
                                disabled={isEditingAdmin}
                              />
                              {t("CREATE_USER_ROLE.SELECT_ALL")}
                            </label>
                          </div>
                          <hr className="border-gray-300 my-4 mt-2 mb-4" />
                          {oPermissionsByModule[moduleName].map(
                            (permission) => (
                              <div
                                key={permission.ID}
                                className="flex items-center mb-2"
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
                              </div>
                            )
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
