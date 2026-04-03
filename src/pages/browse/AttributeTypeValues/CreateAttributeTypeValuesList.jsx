import { useState, useEffect, useCallback } from "react";
import { Tag, Info } from "lucide-react";
import TextInputWithIcon from "../../../components/TextInputWithIcon";
import SelectWithIcon from "../../../components/SelectWithIcon";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchResource, clearResourceError } from "../../../store/slices/allDataSlice";
import { apiGet, apiPost, apiPut } from "../../../utils/ApiUtils";
import {
  GET_ATTRIBUTE_BY_ID,
  UPDATE_ATTRIBUTE_VALUE,
  CREATE_ATTRIBUTE_VALUE,
} from "../../../contants/apiRoutes";
import { showEmsg } from "../../../utils/ShowEmsg";
import { STATUS, STATUS_VALUES, STATUS_OPTIONS, SCROLL_CONSTANTS } from "../../../contants/constants";
import BackButton from "../../../components/BackButton";
import { ToastContainer } from "react-toastify";
import Loader from "../../../components/Loader";
import { hideLoaderWithDelay } from "../../../utils/loaderUtils";

const CreateAttribute = () => {
  const { t } = useTranslation();
  const { id: attributeValueId } = useParams(); 
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isEditing = Boolean(attributeValueId);

  const tenantID = localStorage.getItem("tenantID");
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");

  const [oFormData, setFormData] = useState({
    Value: "",
    Unit: "",
    AttributeTypeID: "",
    TenantID: tenantID,
    IsActive: STATUS_VALUES.BOOLEAN_ACTIVE,
  });

  const [oErrors, setErrors] = useState({});
  const [oFieldValid, setFieldValid] = useState({});
  const [oFieldTouched, setFieldTouched] = useState({});
  const [bSubmitting, setSubmitting] = useState(false);

  // Required fields configuration
  const requiredFields = {
    Value: true,
    AttributeTypeID: true,
  };

  // Redux state for attribute types
  const attributeTypesState = useSelector((state) => state.allData.resources.attributeTypes);
  const aAttributeTypes = attributeTypesState?.data || [];
  const attributeTypesLoading = attributeTypesState?.loading || false;
  const attributeTypesError = attributeTypesState?.error;

  // Filter active attribute types
  const activeAttributeTypes = aAttributeTypes.filter(attrType => attrType.IsActive === true);

  const goBackToBrowse = () => {
    navigate("/browse", { state: { fromAttributeEdit: true } });
  };

  /**
   * Live validation functions
   */
  const validateValue = (value) => {
    // No validation - allow any input including single characters and numbers
    return "";
  };

  const validateAttributeType = (typeId) => {
    if (!typeId) {
      return t("PRODUCT_SETUP.CREATE_ATTRIBUTES.TYPE_REQUIRED");
    }
    return "";
  };

  const validateUnit = (unit) => {
    if (unit && unit.trim().length > 50) {
      return t("PRODUCT_SETUP.CREATE_ATTRIBUTES.UNIT_MAX_LENGTH");
    }
    return "";
  };

  /**
   * Live validation for a specific field
   */
  const validateField = useCallback((name, value, forceShowError = false) => {
    let error = "";
    
    switch (name) {
      case "Value":
        error = validateValue(value);
        break;
      case "AttributeTypeID":
        error = validateAttributeType(value);
        break;
      case "Unit":
        error = validateUnit(value);
        break;
      default:
        break;
    }

    // Only show error if field is touched or we're forcing the error display
    const shouldShowError = forceShowError || oFieldTouched[name];

    setErrors(prev => ({
      ...prev,
      [name]: shouldShowError ? error : ""
    }));

    setFieldValid(prev => ({
      ...prev,
      [name]: !error && (value !== "" && value !== null && value !== undefined)
    }));

    return error;
  }, [t, oFieldTouched]);

  /**
   * Mark field as touched
   */
  const markFieldTouched = useCallback((fieldName) => {
    setFieldTouched(prev => ({
      ...prev,
      [fieldName]: true
    }));
    // Validate the field when it's touched (force error display)
    validateField(fieldName, oFormData[fieldName], true);
  }, [oFormData, validateField]);

  /**
   * Handle field blur for validation - especially important for Value field
   */
  const handleBlur = useCallback((e) => {
    const { name, value } = e.target;
    markFieldTouched(name);
    // Always validate on blur, including Value field
    validateField(name, value, true);
  }, [markFieldTouched, validateField]);

  /**
   * Handle select field changes
   */
  const handleSelectChange = useCallback((e) => {
    const { name, value } = e.target;
    
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    validateField(name, value, true);
  }, [validateField]);

  /**
   * Handle select blur - specifically for dropdowns
   */
  const handleSelectBlur = useCallback((fieldName) => {
    markFieldTouched(fieldName);
    validateField(fieldName, oFormData[fieldName], true);
  }, [markFieldTouched, validateField, oFormData]);

  const fetchAttributeDetails = useCallback(async () => {
    setSubmitting(true);
    try {
      const response = await apiGet(
        `${GET_ATTRIBUTE_BY_ID}/${attributeValueId}`,
        {},
        token
      );
      if (
        response.data.status?.toUpperCase() === STATUS.SUCCESS.toUpperCase() &&
        response.data.data
      ) {
        const attributeData = response.data.data;
        setFormData((prev) => ({
          ...prev,
          Value: attributeData.Value || "",
          Unit: attributeData.Unit || "",
          AttributeTypeID: attributeData.AttributeTypeID || "",
          TenantID: tenantID,
          IsActive: attributeData.IsActive,
        }));

        // Mark all fields as touched for edit mode to show validation immediately
        setTimeout(() => {
          const fieldsToValidate = ["Value", "AttributeTypeID", "Unit"];
          fieldsToValidate.forEach(field => {
            markFieldTouched(field);
            validateField(field, 
              field === "Value" ? attributeData.Value || "" :
              field === "AttributeTypeID" ? attributeData.AttributeTypeID || "" :
              field === "Unit" ? attributeData.Unit || "" :
              "", 
              true
            );
          });
        }, 100);
      } else {
        showEmsg(response.data.message || t("COMMON.ERROR"), STATUS.WARNING);
      }
    } catch (err) {
      showEmsg(
        err?.response?.data?.message || t("COMMON.API_ERROR"),
        STATUS.ERROR
      );
    } finally {
      hideLoaderWithDelay(setSubmitting);
    }
  }, [attributeValueId, token, tenantID, t, validateField, markFieldTouched]);

  useEffect(() => {
    // Fetch attribute types on component mount - only active ones
    dispatch(fetchResource({ key: "attributeTypes", params: { IsActive: true } }));

    if (isEditing && attributeValueId) {
      fetchAttributeDetails();
    }

    // Cleanup errors on unmount
    return () => {
      if (attributeTypesError) {
        dispatch(clearResourceError("attributeTypes"));
      }
    };
  }, [dispatch, isEditing, attributeValueId]); // Removed fetchAttributeDetails and attributeTypesError from dependencies

  /** Input change with reduced validation frequency */
  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;
    
    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    // Only validate on blur for Value field to reduce API calls and improve performance
    // Don't validate on every keystroke
    if (name !== "Value") {
      validateField(name, newValue, oFieldTouched[name]);
      markFieldTouched(name);
    }
  }, [validateField, markFieldTouched, oFieldTouched]);

  /** Validation */
  const validateForm = () => {
    // Mark all required fields as touched before validation
    Object.keys(requiredFields).forEach(field => {
      if (requiredFields[field]) {
        markFieldTouched(field);
      }
    });

    const errors = {};
    
    errors.Value = validateValue(oFormData.Value);
    errors.AttributeTypeID = validateAttributeType(oFormData.AttributeTypeID);
    errors.Unit = validateUnit(oFormData.Unit);

    // Update field validation states
    setFieldValid({
      Value: !errors.Value && oFormData.Value.trim() !== "",
      AttributeTypeID: !errors.AttributeTypeID && oFormData.AttributeTypeID !== "",
      Unit: !errors.Unit,
    });

    // Return only errors that have messages
    const filteredErrors = Object.fromEntries(
      Object.entries(errors).filter(([_, value]) => value !== "")
    );

    setErrors(filteredErrors);
    return Object.keys(filteredErrors).length === 0;
  };

  /** Submit */
 const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Run validation
  if (!validateForm()) {
    // Scroll to first error
    const firstErrorField = Object.keys(oErrors)[0];
    if (firstErrorField) {
      const element = document.getElementById(firstErrorField);
      if (element) {
        element.scrollIntoView({ behavior: SCROLL_CONSTANTS.BEHAVIOR,
        block: SCROLL_CONSTANTS.BLOCK, });
        element.focus();
      }
    }
    return;
  }

  setSubmitting(true);

  const payload = {
    TenantID: tenantID,
    Value: oFormData.Value,
    Unit: oFormData.Unit,
    AttributeTypeID: oFormData.AttributeTypeID,
    IsActive: oFormData.IsActive,
    ...(isEditing
      ? { AttributeValueID: attributeValueId, UpdatedBy: userId }
      : { CreatedBy: userId }),
  };

  try {
    let response;
    
    if (isEditing) {
      // Use PUT for update with updateAttributeValue endpoint
      response = await apiPut(UPDATE_ATTRIBUTE_VALUE, payload, token);
    } else {
      // Use POST for create with createAttributeValue endpoint
      response = await apiPost(CREATE_ATTRIBUTE_VALUE, payload, token);
    }

    if (response.data.status?.toUpperCase() === STATUS.SUCCESS.toUpperCase()) {
      showEmsg(response.data.message, STATUS.SUCCESS, 3000, goBackToBrowse);
    } else {
      showEmsg(response.data.message || t("COMMON.ERROR"), STATUS.ERROR);
    }
  } catch (err) {
    showEmsg(
      err?.response?.data?.message || t("COMMON.API_ERROR"),
      STATUS.ERROR
    );
  } finally {
    hideLoaderWithDelay(setSubmitting);
  }
};

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

  // Prepare attribute types options with proper field mapping - using active attribute types
  const attributeTypeOptions = [
    {
      value: "",
      label: attributeTypesLoading
        ? t("COMMON.LOADING")
        : attributeTypesError
        ? t("COMMON.ERROR")
        : t("PRODUCT_SETUP.CREATE_ATTRIBUTES.SELECT_TYPE"),
    },
    ...activeAttributeTypes.map((type) => ({
      value: type.AttributeTypeID, 
      label: type.Name, 
    })),
  ];

  // Filter STATUS_OPTIONS to exclude the "ALL" option and map to component format
  const statusOptions = STATUS_OPTIONS.filter(option => option.value !== STATUS_VALUES.ALL)
    .map(option => ({
      value: option.value ? "Active" : "Inactive",
      label: t(option.labelKey)
    }));

  return (
    <div>
      {bSubmitting && (
        <div className="global-loader-overlay">
          <Loader />
        </div>
      )}

      <ToastContainer />

      <div className="flex items-center mb-6">
        <BackButton onClick={goBackToBrowse} />
        <h2 className="text-xl font-bold text-gray-900">
          {isEditing
            ? t("PRODUCT_SETUP.ATTRIBUTES.EDIT_TITLE")
            : t("PRODUCT_SETUP.CREATE_ATTRIBUTES.CREATE_TITLE")}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Value + Unit */}
        <div className="flex flex-col md:flex-row md:space-x-4">
          <div className="w-full md:w-1/2">
            <TextInputWithIcon
              label={renderLabel("Value", "PRODUCT_SETUP.CREATE_ATTRIBUTES.NAME_LABEL")}
              id="Value"
              name="Value"
              value={oFormData.Value}
              onChange={handleInputChange}
              onBlur={handleBlur}
              placeholder={t("PRODUCT_SETUP.CREATE_ATTRIBUTES.NAME_PLACEHOLDER")}
              error={oErrors.Value}
              isValid={oFieldValid.Value}
              required={requiredFields.Value}
              Icon={Tag}
            />
          </div>
          <div className="w-full md:w-1/2">
            <TextInputWithIcon
              label={t("COMMON.UNIT")}
              id="Unit"
              name="Unit"
              value={oFormData.Unit}
              onChange={handleInputChange}
              onBlur={handleBlur}
              placeholder={t("COMMON.UNIT")}
              error={oErrors.Unit}
              isValid={oFieldValid.Unit}
              Icon={Info}
              showCharCount={true}
              maxChars={50}
              currentChars={oFormData.Unit?.length || 0}
            />
          </div>
        </div>

        {/* Attribute Type + Status */}
        <div className="flex flex-col md:flex-row md:space-x-4">
          <div className="w-full md:w-1/2">
            <SelectWithIcon
              label={renderLabel("AttributeTypeID", "PRODUCT_SETUP.CREATE_ATTRIBUTES.TYPE_LABEL")}
              id="AttributeTypeID"
              name="AttributeTypeID"
              value={oFormData.AttributeTypeID}
              onChange={handleSelectChange}
              onBlur={() => handleSelectBlur("AttributeTypeID")}
              options={attributeTypeOptions}
              Icon={Tag}
              error={oErrors.AttributeTypeID}
              isValid={oFieldValid.AttributeTypeID}
              required={requiredFields.AttributeTypeID}
              disabled={attributeTypesLoading}
              onInputChange={(value) => {
                if (value && value.length >= 2) {
                  dispatch(fetchResource({ 
                    key: "attributeTypes", 
                    params: { 
                      searchText: value,
                      IsActive: true  // Only search active attribute types
                    } 
                  }));
                } else if (!value) {
                  // Fetch all active attribute types if search is cleared
                  dispatch(fetchResource({ 
                    key: "attributeTypes",
                    params: { IsActive: true }
                  }));
                }
              }}
            />
          </div>

          <div className="w-full md:w-1/2">
            <SelectWithIcon
              label={t("COMMON.STATUS")}
              id="IsActive"
              name="IsActive"
              value={oFormData.IsActive ? "Active" : "Inactive"}
              onChange={handleSelectChange}
              onBlur={() => handleSelectBlur("IsActive")}
              options={statusOptions}
              Icon={Tag}
               disabled={!isEditing}
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
          <button 
            type="button" 
            onClick={goBackToBrowse} 
            className="btn-cancel"
            disabled={bSubmitting}
          >
            {t("COMMON.CANCEL")}
          </button>
          <button 
            type="submit" 
            className="btn-primary" 
            disabled={bSubmitting}
          >
            {bSubmitting ? t("COMMON.SUBMITTING") : isEditing ? t("COMMON.SAVE_BUTTON") : t("PRODUCT_SETUP.CREATE_ATTRIBUTES.CREATE_TITLE")}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateAttribute;