import { useState, useEffect, useCallback } from "react";
import { Tag, Info, Ruler } from "lucide-react";
import TextInputWithIcon from "../../../components/TextInputWithIcon";
import TextAreaWithIcon from "../../../components/TextAreaWithIcon";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { apiPost, apiGet, apiPut } from "../../../utils/ApiUtils";
import {
  GET_ATTRIBUTE_TYPE_BY_ID,
  UPDATE_ATTRIBUTE_TYPE,
  CREATE_ATTRIBUTE_TYPE,
} from "../../../contants/apiRoutes";
import { showEmsg } from "../../../utils/ShowEmsg";
import {
  STATUS,
  STATUS_VALUES,
  STATUS_OPTIONS,
  SCROLL_CONSTANTS,
} from "../../../contants/constants";
import BackButton from "../../../components/BackButton";
import SelectWithIcon from "../../../components/SelectWithIcon";
import { ToastContainer } from "react-toastify";
import Loader from "../../../components/Loader";
import { hideLoaderWithDelay } from "../../../utils/loaderUtils";
import { fetchResource } from "../../../store/slices/allDataSlice";

const CreateAttributeType = () => {
  const { id: AttributeTypeID } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(AttributeTypeID);
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const token = localStorage.getItem("token");
  const tenantID = localStorage.getItem("tenantID");
  const userId = localStorage.getItem("userId");

  const [formData, setFormData] = useState({

    Name: "",
    AttributeTypeDescription: "",
    IsActive: STATUS_VALUES.BOOLEAN_ACTIVE,
    TenantID: tenantID,
  });

  const [errors, setErrors] = useState({});
  const [fieldValid, setFieldValid] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [localAttributeValues, setLocalAttributeValues] = useState(null);

  // Required fields configuration
  const requiredFields = {
    Name: true,
    AttributeTypeDescription: true,
  };

  // Get attributes from Redux store
  const {
    data: allAttributes = [],
    loading: attributesLoading = false,
    error: attributesError = null,
  } = useSelector((state) => state.allData.resources.attributes || {});

  const navigateBack = useCallback(() => {
    navigate("/browse", { state: { fromAttributeTypeEdit: true } });
  }, [navigate]);

  /**
   * Live validation functions
   */
  const validateName = (name) => {
    if (!name?.trim()) {
      return t("PRODUCT_SETUP.CREATE_ATTRIBUTE_TYPE.NAME_REQUIRED");
    }
    if (name.trim().length < 2) {
      return t("PRODUCT_SETUP.CREATE_ATTRIBUTE_TYPE.NAME_MIN_LENGTH");
    }
    if (name.trim().length > 100) {
      return t("PRODUCT_SETUP.CREATE_ATTRIBUTE_TYPE.NAME_MAX_LENGTH");
    }
    return "";
  };

  const validateDescription = (description) => {
    if (!description?.trim()) {
      return t("PRODUCT_SETUP.CREATE_ATTRIBUTE_TYPE.DESCRIPTION_REQUIRED");
    }
    if (description.trim().length < 10) {
      return t("PRODUCT_SETUP.CREATE_ATTRIBUTE_TYPE.DESCRIPTION_MIN_LENGTH");
    }
    if (description.trim().length > 500) {
      return t("PRODUCT_SETUP.CREATE_ATTRIBUTE_TYPE.DESCRIPTION_MAX_LENGTH");
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
        case "Name":
          error = validateName(value);
          break;
        case "AttributeTypeDescription":
          error = validateDescription(value);
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

  const fetchAttributeTypeDetails = useCallback(async () => {
    try {
      const response = await apiGet(
        `${GET_ATTRIBUTE_TYPE_BY_ID}/${AttributeTypeID}`,
        {},
        token
      );
      const data = response?.data?.data;

      if (response.data.status === STATUS.SUCCESS.toUpperCase() && data) {
        setFormData({
          Name: data.Name || "",
          AttributeTypeDescription: data.AttributeTypeDescription || "",
          IsActive: data.IsActive,
          TenantID: tenantID,
        });
        if (data.AttributeValues && Array.isArray(data.AttributeValues)) {
          setLocalAttributeValues(data.AttributeValues);
        } else if (data.Values && Array.isArray(data.Values)) {
          setLocalAttributeValues(data.Values);
        }

        // Validate initial data after setting
        setTimeout(() => {
          validateField("Name", data.Name || "");
          validateField(
            "AttributeTypeDescription",
            data.AttributeTypeDescription || ""
          );
        }, 100);
      } else {
        showEmsg(
          response.data.message ||
          t("PRODUCT_SETUP.CREATE_ATTRIBUTE_TYPE.FETCH_ERROR"),
          STATUS.ERROR
        );
      }
    } catch (err) {
      showEmsg(
        err?.response?.data?.MESSAGE || t("COMMON.API_ERROR"),
        STATUS.ERROR
      );
    }
  }, [AttributeTypeID, t, token, tenantID, validateField]);

  useEffect(() => {
    if (isEditing && AttributeTypeID) {

      const params = {
        AttributeTypeID: AttributeTypeID,
        AttributeTypeId: AttributeTypeID,
        attributeTypeId: AttributeTypeID,
        typeId: AttributeTypeID,
        pageSize: 1000,
        pageNumber: 1
      };

      dispatch(fetchResource({ key: "attributes", params }));
      fetchAttributeTypeDetails();
    }
  }, [isEditing, AttributeTypeID, fetchAttributeTypeDetails, dispatch]);

  // LOGIC: Prefer Local values (from details API) if available.
  // Otherwise, use Redux values (from list API), assuming params filtered them.
  const displayValues = localAttributeValues || allAttributes;

  const handleInputChange = useCallback(
    ({ target: { name, value, type, checked } }) => {
      const newValue = type === "checkbox" ? checked : value;

      setFormData((prev) => ({
        ...prev,
        [name]: newValue,
      }));

      validateField(name, newValue);
    },
    [validateField]
  );

  /**
   * Handle field blur for additional validation
   */
  const handleBlur = useCallback(
    (e) => {
      const { name, value } = e.target;
      validateField(name, value);
    },
    [validateField]
  );

  const validateForm = () => {
    const newErrors = {};

    newErrors.Name = validateName(formData.Name);
    newErrors.AttributeTypeDescription = validateDescription(
      formData.AttributeTypeDescription
    );

    // Update field validation states
    setFieldValid({
      Name: !newErrors.Name && formData.Name.trim() !== "",
      AttributeTypeDescription:
        !newErrors.AttributeTypeDescription &&
        formData.AttributeTypeDescription.trim() !== "",
    });

    // Return only errors that have messages
    const filteredErrors = Object.fromEntries(
      Object.entries(newErrors).filter(([_, value]) => value !== "")
    );

    setErrors(filteredErrors);
    return Object.keys(filteredErrors).length === 0;
  };

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      // Run validation
      if (!validateForm()) {
        // Scroll to first error
        const firstErrorField = Object.keys(errors)[0];
        if (firstErrorField) {
          const element = document.getElementById(firstErrorField);
          if (element) {
            element.scrollIntoView({
              behavior: SCROLL_CONSTANTS.BEHAVIOR,
              block: SCROLL_CONSTANTS.BLOCK,
            });
            element.focus();
          }
        }
        return;
      }

      setSubmitting(true);

      try {
        // Create the payload according to the API requirements
        const payload = {
          Name: formData.Name,
          AttributeTypeDescription: formData.AttributeTypeDescription,
          IsActive: formData.IsActive,
          TenantID: tenantID,
          ...(isEditing && {
            AttributeTypeID: AttributeTypeID,
            UpdatedBy: userId,
          }),
          ...(!isEditing && {
            CreatedBy: userId,
          }),
        };

        let response;

        if (isEditing) {
          // Use PUT for update operations
          response = await apiPut(
            UPDATE_ATTRIBUTE_TYPE, // Your update endpoint constant
            payload,
            token
          );
        } else {
          // Use POST for create operations
          response = await apiPost(
            CREATE_ATTRIBUTE_TYPE, // Your create endpoint constant
            payload,
            token
          );
        }

        if (response.data.status === STATUS.SUCCESS.toUpperCase()) {
          showEmsg(response.data.message, STATUS.SUCCESS, 3000, navigateBack);
        } else {
          showEmsg(response.data.message, STATUS.WARNING);
        }
      } catch (err) {
        showEmsg(
          err?.response?.data?.message || t("COMMON.API_ERROR"),
          STATUS.ERROR
        );
      } finally {
        hideLoaderWithDelay(setSubmitting);
      }
    },
    [
      formData,
      isEditing,
      AttributeTypeID,
      t,
      navigateBack,
      tenantID,
      token,
      userId,
      errors,
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

  // Filter STATUS_OPTIONS to exclude the "ALL" option and map to component format
  const statusOptions = STATUS_OPTIONS.filter(
    (option) => option.value !== STATUS_VALUES.ALL
  ).map((option) => ({
    value: option.value,
    label: t(option.labelKey),
  }));

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div>
      {submitting && (
        <div className="global-loader-overlay">
          <Loader />
        </div>
      )}
      {isEditing && <ToastContainer />}

      <div className="flex items-center mb-6">
        <BackButton onClick={navigateBack} />
        <h2 className="text-xl font-bold text-gray-900">
          {isEditing
            ? t("PRODUCT_SETUP.ATTRIBUTE_TYPE.EDIT_TITLE")
            : t("PRODUCT_SETUP.CREATE_ATTRIBUTE_TYPE.CREATE_TITLE")}
        </h2>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 p-2"
      >
        <div className="flex flex-col md:flex-row md:space-x-4">
          <div className="w-full md:w-1/2">
            <TextInputWithIcon
              label={renderLabel(
                "Name",
                "PRODUCT_SETUP.CREATE_ATTRIBUTE_TYPE.NAME_LABEL"
              )}
              id="Name"
              name="Name"
              value={formData.Name}
              onChange={handleInputChange}
              onBlur={handleBlur}
              placeholder={t(
                "PRODUCT_SETUP.CREATE_ATTRIBUTE_TYPE.NAME_PLACEHOLDER"
              )}
              error={errors.Name}
              isValid={fieldValid.Name}
              required={requiredFields.Name}
              Icon={Tag}
            />
          </div>
          <div className={`w-full md:w-1/2 `}>
            <SelectWithIcon
              label={t("PRODUCT_SETUP.CREATE_BRAND.STATUS_LABEL")}
              id="IsActive"
              name="IsActive"
              value={formData.IsActive}
              onChange={handleInputChange}
              options={statusOptions}
              Icon={Tag}
              error={errors.IsActive}
              disabled={!isEditing}
            />
          </div>
        </div>

        <div className="w-full">
          <TextAreaWithIcon
            label={renderLabel(
              "AttributeTypeDescription",
              "COMMON.DESCRIPTION"
            )}
            id="AttributeTypeDescription"
            name="AttributeTypeDescription"
            value={formData.AttributeTypeDescription}
            onChange={handleInputChange}
            onBlur={handleBlur}
            placeholder={t(
              "PRODUCT_SETUP.CREATE_ATTRIBUTE_TYPE.DESCRIPTION_PLACEHOLDER"
            )}
            error={errors.AttributeTypeDescription}
            isValid={fieldValid.AttributeTypeDescription}
            required={requiredFields.AttributeTypeDescription}
            icon={Info}
            showCharCount={true}
            maxChars={500}
            currentChars={formData.AttributeTypeDescription?.length || 0}
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={navigateBack}
            className="btn-cancel"
            disabled={submitting}
          >
            {t("COMMON.CANCEL")}
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting
              ? t("COMMON.SUBMITTING")
              : isEditing
                ? t("COMMON.SAVE_BUTTON")
                : t("PRODUCT_SETUP.CREATE_ATTRIBUTE_TYPE.CREATE_BUTTON")}
          </button>
        </div>

        {isEditing && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Ruler className="h-5 w-5 mr-2 text-custom-bg" />
              {t("PRODUCT_SETUP.TABS.ATTRIBUTES")}
              {displayValues.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({displayValues.length})
                </span>
              )}
            </h3>
            {attributesLoading ? (
              <div className="flex items-center justify-center py-8 h-40">
                <Loader />
              </div>
            ) : attributesError ? (
              <div className="text-center py-8 text-red-500 bg-red-50 rounded-lg p-4">
                <p className="font-medium">
                  {t("COMMON.ERROR")}: {attributesError}
                </p>
              </div>
            ) : displayValues.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {t("PRODUCT_SETUP.ATTRIBUTE_TYPE.NAME")}
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {t("COMMON.UNIT")}
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {t("COMMON.STATUS")}
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {t("PRODUCT_SETUP.BRANDS.TABLE.CREATED_AT")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {displayValues.map((attributeValue) => (
                      <tr
                        key={attributeValue.AttributeValueID}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {attributeValue.Value}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500 flex items-center">
                            {attributeValue.Unit ? (
                              <>
                                <Ruler className="h-4 w-4 mr-1 text-gray-400" />
                                {attributeValue.Unit}
                              </>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${attributeValue.IsActive
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                              }`}
                          >
                            {attributeValue.IsActive
                              ? t("COMMON.ACTIVE")
                              : t("COMMON.INACTIVE")}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(attributeValue.CreatedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Ruler className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">
                  {t("PRODUCT_SETUP.ATTRIBUTES.NO_ATTRIBUTE_VALUES")}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  {t("PRODUCT_SETUP.ATTRIBUTES.NO_ATTRIBUTE_VALUES_DESC")}
                </p>
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
};

export default CreateAttributeType;