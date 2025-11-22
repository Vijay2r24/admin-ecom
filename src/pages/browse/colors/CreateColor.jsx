import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Tag, Info, Palette } from "lucide-react";
import TextInputWithIcon from "../../../components/TextInputWithIcon";
import SelectWithIcon from "../../../components/SelectWithIcon";
import BackButton from "../../../components/BackButton";
import Loader from "../../../components/Loader";
import { ToastContainer } from "react-toastify";

import { CREATE_COLOUR } from "../../../contants/apiRoutes";
import { STATUS, STATUS_VALUES, STATUS_OPTIONS, DEFAULT_COLOR } from "../../../contants/constants";
import { apiPost } from "../../../utils/ApiUtils";
import { showEmsg } from "../../../utils/ShowEmsg";
import { hideLoaderWithDelay } from "../../../utils/loaderUtils";

const CreateColor = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const token = localStorage.getItem("token");
  const tenantID = localStorage.getItem("tenantID");
  const userId = localStorage.getItem("userId");

  const [oFormData, setFormData] = useState({
    TenantID: tenantID,
    Name: "",
    HexCode: DEFAULT_COLOR,
    IsActive: true,
    RgbCode: "",
    CreatedBy: userId,
  });

  const [oErrors, setErrors] = useState({});
  const [oFieldValid, setFieldValid] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Required fields configuration
  const requiredFields = {
    Name: true,
    HexCode: true,
  };

  /**
   * Live validation functions
   */
  const validateName = (name) => {
    if (!name?.trim()) {
      return t("PRODUCT_SETUP.CREATE_COLOR.ERRORS.NAME_REQUIRED");
    }
    if (name.trim().length < 2) {
      return t("PRODUCT_SETUP.CREATE_COLOR.ERRORS.NAME_MIN_LENGTH");
    }
    if (name.trim().length > 50) {
      return t("PRODUCT_SETUP.CREATE_COLOR.ERRORS.NAME_MAX_LENGTH");
    }
    return "";
  };

  const validateHexCode = (hexCode) => {
    if (!hexCode?.trim()) {
      return t("PRODUCT_SETUP.CREATE_COLOR.ERRORS.HEX_CODE_REQUIRED");
    }
    // Validate hex code format (# followed by 3 or 6 hex digits)
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexRegex.test(hexCode.trim())) {
      return t("PRODUCT_SETUP.CREATE_COLOR.ERRORS.HEX_CODE_INVALID");
    }
    return "";
  };

  const validateRgbCode = (rgbCode) => {
    if (rgbCode && rgbCode.trim() !== "") {
      // Validate RGB format (rgb(255, 255, 255))
      const rgbRegex = /^rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/;
      if (!rgbRegex.test(rgbCode.trim())) {
        return t("PRODUCT_SETUP.CREATE_COLOR.ERRORS.RGB_CODE_INVALID");
      }
    }
    return "";
  };

  /**
   * Live validation for a specific field
   */
  const validateField = useCallback((name, value) => {
    let error = "";
    
    switch (name) {
      case "Name":
        error = validateName(value);
        break;
      case "HexCode":
        error = validateHexCode(value);
        break;
      case "RgbCode":
        error = validateRgbCode(value);
        break;
      default:
        break;
    }

    setErrors(prev => ({
      ...prev,
      [name]: error
    }));

    setFieldValid(prev => ({
      ...prev,
      [name]: !error && (value !== "" && value !== null && value !== undefined)
    }));
  }, [t]);

  const hexToRgb = (hex) => {
    if (!hex || typeof hex !== "string") return "";
    const bigint = parseInt(hex.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgb(${r}, ${g}, ${b})`;
  };

  const handleInputChange = useCallback(
    (e) => {
      const { name, value, type, checked } = e.target;
      const newValue = type === "checkbox" ? checked : value;

      setFormData((prev) => ({
        ...prev,
        [name]: newValue,
        ...(name === "HexCode" && { RgbCode: hexToRgb(value) }),
      }));

      validateField(name, newValue);
    },
    [validateField]
  );

  /**
   * Handle field blur for additional validation
   */
  const handleBlur = useCallback((e) => {
    const { name, value } = e.target;
    validateField(name, value);
  }, [validateField]);

  const validateForm = () => {
    const errors = {};
    
    errors.Name = validateName(oFormData.Name);
    errors.HexCode = validateHexCode(oFormData.HexCode);
    errors.RgbCode = validateRgbCode(oFormData.RgbCode);

    // Update field validation states
    setFieldValid({
      Name: !errors.Name && oFormData.Name.trim() !== "",
      HexCode: !errors.HexCode && oFormData.HexCode.trim() !== "",
      RgbCode: !errors.RgbCode,
    });

    // Return only errors that have messages
    const filteredErrors = Object.fromEntries(
      Object.entries(errors).filter(([_, value]) => value !== "")
    );

    setErrors(filteredErrors);
    return Object.keys(filteredErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Run validation
    if (!validateForm()) {
      // Scroll to first error
      const firstErrorField = Object.keys(oErrors)[0];
      if (firstErrorField) {
        const element = document.getElementById(firstErrorField);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          element.focus();
        }
      }
      return;
    }

    setSubmitting(true);
    const payload = {
      Name: oFormData.Name,
      HexCode: oFormData.HexCode,
      RgbCode: oFormData.RgbCode,
      TenantID: oFormData.TenantID,
      IsActive: oFormData.IsActive,
      CreatedBy: userId,
    };

    try {
      const response = await apiPost(CREATE_COLOUR, payload, token);

      if (response.data.status === STATUS.SUCCESS.toUpperCase()) {
        showEmsg(response.data.message, STATUS.SUCCESS, 3000, () => {
          navigate("/browse", { state: { fromColorEdit: true } })
        });
      } else {
        showEmsg(response.data.message, STATUS.WARNING);
      }
    } catch (err) {
      showEmsg(err?.response?.data?.MESSAGE || t("COMMON.API_ERROR"), STATUS.ERROR);
    } finally {
      hideLoaderWithDelay(setSubmitting);
    }
  };
 
  const statusOptions = STATUS_OPTIONS.filter(option => option.value !== STATUS_VALUES.ALL)
    .map(option => ({
      value: option.value,
      label: t(option.labelKey)
    }));

  const handleCancel = () =>
    navigate("/browse", { state: { fromColorEdit: true } });

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

  return (
    <div>
      {submitting && (
        <div className="global-loader-overlay">
          <Loader />
        </div>
      )}
      <ToastContainer />

      <div className="flex items-center mb-6">
        <BackButton onClick={handleCancel} />
        <h2 className="text-xl font-bold text-gray-900">
          {t("PRODUCT_SETUP.CREATE_COLOR.CREATE_TITLE")}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col md:flex-row md:space-x-4">
          <div className="w-full md:w-1/2">
            <TextInputWithIcon
              label={renderLabel("Name", "PRODUCT_SETUP.CREATE_COLOR.NAME_LABEL")}
              id="Name"
              name="Name"
              value={oFormData.Name}
              onChange={handleInputChange}
              onBlur={handleBlur}
              placeholder={t("PRODUCT_SETUP.CREATE_COLOR.NAME_PLACEHOLDER")}
              error={oErrors.Name}
              isValid={oFieldValid.Name}
              required={requiredFields.Name}
              Icon={Tag}
            />
          </div>
          <div className="w-full md:w-1/2 mt-4 md:mt-0">
            <TextInputWithIcon
              label={renderLabel("HexCode", "PRODUCT_SETUP.CREATE_COLOR.HEX_CODE_LABEL")}
              id="HexCode"
              name="HexCode"
              value={oFormData.HexCode}
              onChange={handleInputChange}
              onBlur={handleBlur}
              placeholder={t("PRODUCT_SETUP.CREATE_COLOR.HEX_CODE_PLACEHOLDER")}
              error={oErrors.HexCode}
              isValid={oFieldValid.HexCode}
              required={requiredFields.HexCode}
              Icon={Palette}
              inputSlot={
                <div className="relative">
                  <input
                    type="color"
                    name="HexCode"
                    value={oFormData.HexCode}
                    onChange={handleInputChange}
                    className="h-10 w-10 rounded-lg border border-gray-200 cursor-pointer"
                    style={{ minWidth: 40, minHeight: 40, padding: 0 }}
                  />
                  {oFieldValid.HexCode && (
                    <div className="absolute -top-1 -right-1 p-1 bg-green-500 text-white rounded-full shadow-lg">
                      <svg className="h-2 w-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              }
            />
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:space-x-4">
          <div className="w-full md:w-1/2">
            <SelectWithIcon
              label={t("PRODUCT_SETUP.CREATE_COLOR.STATUS_LABEL")}
              id="IsActive"
              name="IsActive"
              value={oFormData.IsActive}
              onChange={handleInputChange}
              options={statusOptions}
              Icon={Tag}
              error={oErrors.IsActive}
            />
          </div>
          <div className="w-full md:w-1/2 mt-4 md:mt-0">
            <TextInputWithIcon
              label="RGB Code"
              id="RgbCode"
              name="RgbCode"
              value={oFormData.RgbCode}
              onChange={handleInputChange}
              onBlur={handleBlur}
              placeholder="e.g., rgb(255, 0, 0)"
              error={oErrors.RgbCode}
              isValid={oFieldValid.RgbCode}
              Icon={Info}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
          <button 
            type="button" 
            onClick={handleCancel} 
            className="btn-cancel"
            disabled={submitting}
          >
            {t("COMMON.CANCEL")}
          </button>
          <button 
            type="submit" 
            className="btn-primary"
            disabled={submitting}
          >
            {submitting ? t("COMMON.SUBMITTING") : t("PRODUCT_SETUP.CREATE_COLOR.CREATE_BUTTON")}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateColor;