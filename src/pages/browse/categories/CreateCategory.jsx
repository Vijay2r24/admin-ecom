import { useState, useEffect, useRef, useCallback } from "react";
import { Tag, Info, Image, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchResource,
  clearResourceError,
} from "../../../store/slices/allDataSlice";
import {
  GET_CATEGORY_BY_ID,
  CREATE_CATEGORY,
  UPDATE_CATEGORY,
} from "../../../contants/apiRoutes";
import { apiPost, apiGet, apiPut } from "../../../utils/ApiUtils";
import { showEmsg } from "../../../utils/ShowEmsg";
import { FILETYPE, STATUS, TOOLTIPSTATUS } from "../../../contants/constants";
import { hideLoaderWithDelay } from "../../../utils/loaderUtils";

import TextInputWithIcon from "../../../components/TextInputWithIcon";
import SelectWithIcon from "../../../components/SelectWithIcon";
import TextAreaWithIcon from "../../../components/TextAreaWithIcon";
import BackButton from "../../../components/BackButton";
import ImageCropperModal from "../../../components/ImageCropperModal";
import { ToastContainer } from "react-toastify";
import Loader from "../../../components/Loader";

const FILE_CONSTANTS = {
  CATEGORY_IMAGE_PREFIX: "category",
  FILE_TYPE: FILETYPE,
};

const defaultFormData = {
  TenantID: localStorage.getItem("tenantID"),
  CategoryName: "",
  CategoryImage: null,
  CategoryDescription: "",
  ParentCategoryID: "",
  IsActive: true,
  CreatedBy: "",
  UpdatedBy: "",
  existingImage: null,
  existingImageDocumentId: null,
};

const CreateCategory = () => {
  const { id: categoryId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const isEditing = !!categoryId;
  const fileInputRef = useRef(null);

  const [oFormData, setFormData] = useState(defaultFormData);
  const [oErrors, setErrors] = useState({});
  const [oFieldValid, setFieldValid] = useState({});
  const [sImagePreview, setImagePreview] = useState(null);
  const [bSubmitting, setSubmitting] = useState(false);
  const [bShowCropper, setShowCropper] = useState(false);
  const [oImageToCrop, setImageToCrop] = useState(null);

  // Required fields configuration
  const requiredFields = {
    CategoryName: true,
    CategoryImage: !isEditing, // Image is required only for new categories
  };

  // Redux state for categories
  const categoriesState = useSelector(
    (state) => state.allData.resources.categories
  );
  const aCategories = categoriesState?.data || [];
  const bLoadingCategories = categoriesState?.loading || false;
  const categoriesError = categoriesState?.error;

  /**
   * Live validation functions
   */
  const validateCategoryName = (name) => {
    if (!name?.trim()) {
      return (
        t("PRODUCT_SETUP.CREATE_CATEGORY.NAME_ERROR")
      );
    }
    if (name.trim().length < 2) {
      return (
        t("PRODUCT_SETUP.CREATE_CATEGORY.NAME_MIN_LENGTH")
      );
    }
    if (name.trim().length > 100) {
      return (
        t("PRODUCT_SETUP.CREATE_CATEGORY.NAME_MAX_LENGTH")
      );
    }
    return "";
  };

  const validateCategoryDescription = (description) => {
    const descLength = description?.trim().length || 0;
    if (descLength < 10 && descLength > 0) {
      return (
        t("PRODUCT_SETUP.CREATE_CATEGORY.DESCRIPTION_MIN_LENGTH")
      );
    }
    if (descLength > 500) {
      return (
        t("PRODUCT_SETUP.CREATE_CATEGORY.DESCRIPTION_MAX_LENGTH")
      );
    }
    return "";
  };

  const validateCategoryImage = (hasImage) => {
    if (!isEditing && !hasImage) {
      return (
        t("PRODUCT_SETUP.CREATE_CATEGORY.IMAGE_REQUIRED")
      );
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

        case "IsActive":
          if (value === "" || value === null || value === undefined) {
            error = t("COMMON.STATUS_REQUIRED"); // add error message from translation
          }
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
        [name]: !error,
      }));
    },
    [t]
  );

  // Fetch categories on mount
  useEffect(() => {
    dispatch(fetchResource({ key: "categories", params: {} }));
  }, [dispatch]);

  // Cleanup errors on unmount
  useEffect(() => {
    return () => {
      if (categoriesError) {
        dispatch(clearResourceError("categories"));
      }
      if (
        sImagePreview &&
        typeof sImagePreview === "string" &&
        sImagePreview.startsWith("blob:")
      ) {
        URL.revokeObjectURL(sImagePreview);
      }
      // Cleanup cropper image URL
      if (oImageToCrop) {
        URL.revokeObjectURL(oImageToCrop);
      }
    };
  }, [categoriesError, sImagePreview, oImageToCrop, dispatch]);

  // Fetch category by ID (for edit)
  useEffect(() => {
    const fetchCategoryDetails = async () => {
      try {
        setSubmitting(true);
        const token = localStorage.getItem("token");
        const { data } = await apiGet(
          `${GET_CATEGORY_BY_ID}/${categoryId}`,
          {},
          token
        );

        if (data.status?.toUpperCase() === STATUS.SUCCESS.toUpperCase()) {
          const categoryData = data.data;

          if (categoryData) {
            setFormData({
              ...defaultFormData,
              ...categoryData,
              CategoryImage: null, // reset upload
              IsActive:
                categoryData.IsActive !== undefined
                  ? categoryData.IsActive
                  : categoryData.Status?.toLowerCase() === TOOLTIPSTATUS.ACTIVE,
              UpdatedBy: "",
            });

            // Handle image from documentMetadata if it exists
            let existingImageData = null;
            let existingDocumentId = null;

            if (
              categoryData.documentMetadata &&
              categoryData.documentMetadata.length > 0
            ) {
              existingImageData = categoryData.documentMetadata[0];
              existingDocumentId = categoryData.documentMetadata[0].documentId;
            } else if (categoryData.CategoryImages?.length > 0) {
              existingImageData = categoryData.CategoryImages[0];
              existingDocumentId = categoryData.CategoryImages[0].documentId;
            }

            if (existingImageData) {
              setFormData((prev) => ({
                ...prev,
                existingImage: existingImageData,
                existingImageDocumentId: existingDocumentId,
              }));
              setImagePreview(existingImageData.documentUrl);
            }

            // Validate initial data after setting
            setTimeout(() => {
              validateField("CategoryName", categoryData.CategoryName || "");
              validateField(
                "CategoryDescription",
                categoryData.CategoryDescription || ""
              );
              validateField("CategoryImage", existingImageData || null);
            }, 100);
          }
        }
      } catch (err) {
        const errorMsg =
          err?.response?.data?.message ||
          t("PRODUCT_SETUP.CREATE_CATEGORY.UNEXPECTED_ERROR");
        setErrors((prev) => ({ ...prev, api: errorMsg }));
      } finally {
        hideLoaderWithDelay(setSubmitting);
      }
    };

    if (isEditing && categoryId) {
      fetchCategoryDetails();
    }
  }, [categoryId, isEditing, t, validateField]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    validateField(name, newValue);
  };

  /**
   * Handle field blur for additional validation
   */
  const handleBlur = (e) => {
    const { name, value } = e.target;
    validateField(name, value);
  };

  /**
   * File upload handler - opens cropper instead of directly setting
   */
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      const error = t("PRODUCT_SETUP.CREATE_CATEGORY.IMAGE_ERROR");
      setErrors((prev) => ({
        ...prev,
        CategoryImage: error,
      }));
      setFieldValid((prev) => ({
        ...prev,
        CategoryImage: false,
      }));
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      const error = t("PRODUCT_SETUP.CREATE_CATEGORY.IMAGE_TYPE_ERROR");
      setErrors((prev) => ({
        ...prev,
        CategoryImage: error,
      }));
      setFieldValid((prev) => ({
        ...prev,
        CategoryImage: false,
      }));
      return;
    }

    // Create object URL and open cropper
    const imageUrl = URL.createObjectURL(file);
    setImageToCrop(imageUrl);
    setShowCropper(true);
  };

  /**
   * Handle crop completion
   */
  const handleCropComplete = (croppedBlob) => {
    if (!croppedBlob) {
      setShowCropper(false);
      return;
    }

    // Create preview URL from cropped blob
    const croppedImageUrl = URL.createObjectURL(croppedBlob);

    // Create a File object from the blob for form submission
    const croppedFile = new File(
      [croppedBlob],
      `${FILE_CONSTANTS.CATEGORY_IMAGE_PREFIX}-${Date.now()}.jpg`,
      {
        type: FILE_CONSTANTS.FILE_TYPE,
        lastModified: Date.now(),
      }
    );

    // Update form data with cropped image
    setFormData((prev) => ({
      ...prev,
      CategoryImage: croppedFile,
      existingImage: null, // Clear existing image when new file is uploaded
    }));

    // Set preview
    setImagePreview(croppedImageUrl);

    // Validate the image field
    validateField("CategoryImage", croppedFile);

    // Close cropper
    setShowCropper(false);

    // Clean up the original image URL
    if (oImageToCrop) {
      URL.revokeObjectURL(oImageToCrop);
      setImageToCrop(null);
    }
  };

  /**
   * Handle crop cancellation
   */
  const handleCropCancel = () => {
    setShowCropper(false);

    // Clean up the image URL
    if (oImageToCrop) {
      URL.revokeObjectURL(oImageToCrop);
      setImageToCrop(null);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = () => {
    if (
      sImagePreview &&
      typeof sImagePreview === "string" &&
      sImagePreview.startsWith("blob:")
    ) {
      URL.revokeObjectURL(sImagePreview);
    }
    setFormData((prev) => ({
      ...prev,
      CategoryImage: null,
      existingImage: null,
    }));
    setImagePreview(null);

    // Validate the image field after removal
    validateField("CategoryImage", null);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validateForm = () => {
    const errors = {};

    // Existing validations
    errors.CategoryName = validateCategoryName(oFormData.CategoryName);
    errors.CategoryDescription = validateCategoryDescription(
      oFormData.CategoryDescription
    );
    errors.CategoryImage = validateCategoryImage(
      oFormData.CategoryImage || sImagePreview
    );

    errors.IsActive =
      oFormData.IsActive === "" ||
      oFormData.IsActive === null ||
      oFormData.IsActive === undefined
        ? t("COMMON.STATUS_REQUIRED")
        : "";

    // Update field validation states
    setFieldValid({
      CategoryName:
        !errors.CategoryName && oFormData.CategoryName.trim() !== "",
      CategoryDescription: !errors.CategoryDescription,
      CategoryImage:
        !errors.CategoryImage && (oFormData.CategoryImage || sImagePreview),
      IsActive: !errors.IsActive,
    });

    // Return only fields that actually contain an error message
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
          element.scrollIntoView({ behavior: SCROLL_CONSTANTS.BEHAVIOR,
          block: SCROLL_CONSTANTS.BLOCK, });
          element.focus();
        }
      }
      return;
    }

    setSubmitting(true);
    const dataToSend = new FormData();
    const documentMetadata = [];

    // Handle image scenarios
    if (oFormData.CategoryImage) {
      // New image uploaded
      documentMetadata.push({
        image: "category1",
        sortOrder: 1,
        ...(isEditing &&
          oFormData.existingImageDocumentId && {
            DocumentID: oFormData.existingImageDocumentId,
          }),
      });
    } else if (
      isEditing &&
      !sImagePreview &&
      oFormData.existingImageDocumentId
    ) {
      // Editing and image removed - send remove action
      documentMetadata.push({
        action: "remove",
        DocumentID: oFormData.existingImageDocumentId,
      });
    } else if (
      isEditing &&
      sImagePreview &&
      !oFormData.CategoryImage &&
      oFormData.existingImageDocumentId
    ) {
      // Editing but keeping existing image - don't include documentMetadata at all
      // This is the key change: don't push anything to documentMetadata array
      // So the array remains empty and won't be included in the payload
    }

    // Prepare the JSON payload
    const jsonPayload = {
      TenantID: oFormData.TenantID,
      CategoryName: oFormData.CategoryName,
      CategoryDescription: oFormData.CategoryDescription,
      IsActive: oFormData.IsActive,
      ParentCategoryID: oFormData.ParentCategoryID || undefined,
      // Only include documentMetadata if the array is not empty
      ...(documentMetadata.length > 0 && { documentMetadata }),
      ...(isEditing
        ? {
            CategoryID: categoryId,
            UpdatedBy: localStorage.getItem("userId"),
          }
        : {
            CreatedBy: localStorage.getItem("userId"),
          }),
    };

    // Append the JSON payload
    dataToSend.append("data", JSON.stringify(jsonPayload));

    // Append the image file only if a new image was uploaded
    if (oFormData.CategoryImage) {
      dataToSend.append("category1", oFormData.CategoryImage);
    }

    try {
      const token = localStorage.getItem("token");
      let oResponse;

      if (isEditing) {
        // Use PUT for update with updateCategory endpoint
        oResponse = await apiPut(
          UPDATE_CATEGORY,
          dataToSend,
          token,
          true // multipart/form-data
        );
      } else {
        // Use POST for create with createCategory endpoint
        oResponse = await apiPost(
          CREATE_CATEGORY,
          dataToSend,
          token,
          true // multipart/form-data
        );
      }

      if (oResponse?.data?.status?.toUpperCase() === STATUS.SUCCESS.toUpperCase()) {
        showEmsg(oResponse.data.message, STATUS.SUCCESS, 3000, () => {
          navigate("/browse", { state: { fromCategoryEdit: true } });
        });
      } else if (oResponse) {
        showEmsg(oResponse.data.message, STATUS.WARNING);
        setErrors((prev) => ({ ...prev, api: oResponse.data.message }));
      }
    } catch (err) {
      const errorMessage =
        err?.response?.data?.message || err?.message || t("COMMON.API_ERROR");
      showEmsg(errorMessage, STATUS.ERROR);
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

  // Filter categories to only include active parent categories (ParentCategoryID is null AND IsActive is true)
  const parentCategories = [
    {
      value: "",
      label: t("PRODUCT_SETUP.CREATE_CATEGORY.SELECT_PARENT"),
    },
    ...aCategories
      .filter(
        (cat) =>
          (cat.ParentCategoryID === null || cat.ParentCategoryID === undefined) &&
          cat.IsActive === true
      )
      .map((cat) => ({
        value: cat.CategoryID,
        label: cat.CategoryName,
      })),
  ];

  return (
    <div className="w-full min-h-screen">
      {bSubmitting && (
        <div className="global-loader-overlay">
          <Loader />
        </div>
      )}

      {/* Image Cropper Modal */}
      {bShowCropper && (
        <ImageCropperModal
          image={oImageToCrop}
          queue={oImageToCrop ? [{ id: 'category', url: oImageToCrop }] : []}
          onCropComplete={handleCropComplete}
          onQueueUpdate={(newQueue) => { if (newQueue.length === 0) handleCropCancel(); }}
          onClose={handleCropCancel}
          aspectRatio={1}
          minWidth={200}
          minHeight={200}
          title={t("PRODUCT_SETUP.CREATE_CATEGORY.CROP_TITLE")}
          cancelText={t("COMMON.CANCEL")}
          saveText={t("COMMON.CROP_IMAGE")}
        />
      )}

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

      <div className="flex items-center mb-6">
        <BackButton
          onClick={() =>
            navigate("/browse", { state: { fromCategoryEdit: true } })
          }
        />
        <h2 className="text-xl font-bold text-gray-900">
          {isEditing
            ? t("PRODUCT_SETUP.CREATE_CATEGORY.EDIT_TITLE")
            : t("PRODUCT_SETUP.CREATE_CATEGORY.CREATE_TITLE")}
        </h2>
      </div>

      {/* Form */}
     {/* Form */}
     {/* Form */}
      <form className="space-y-6" onSubmit={handleSubmit}>
        
        {/* Row 1: Category Name and Status (Unchanged) */}
        <div className="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0">
          <div className="flex-1">
            <TextInputWithIcon
              label={renderLabel(
                "CategoryName",
                "PRODUCT_SETUP.CREATE_CATEGORY.NAME_LABEL"
              )}
              id="CategoryName"
              name="CategoryName"
              value={oFormData.CategoryName}
              onChange={handleInputChange}
              onBlur={handleBlur}
              placeholder={t("PRODUCT_SETUP.CREATE_CATEGORY.NAME_PLACEHOLDER")}
              error={oErrors.CategoryName}
              isValid={oFieldValid.CategoryName}
              required={requiredFields.CategoryName}
              Icon={Tag}
            />
          </div>

          <div className="flex-1">
            <SelectWithIcon
              label={t("PRODUCT_SETUP.CREATE_CATEGORY.STATUS_LABEL")}
              id="IsActive"
              name="IsActive"
              value={String(oFormData.IsActive)}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  IsActive: e.target.value === "true",
                }))
              }
              options={[
                { value: "true", label: t("COMMON.ACTIVE") },
                { value: "false", label: t("COMMON.INACTIVE") },
              ]}
              Icon={Tag}
              disabled={!isEditing}
            />
          </div>
        </div>

       
        <div className="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0 ">
          <div className="w-full md:w-1/2 flex flex-col space-y-4">
            <div>
              <SelectWithIcon
                label={t("PRODUCT_SETUP.CREATE_CATEGORY.PARENT_LABEL")}
                id="ParentCategoryID"
                name="ParentCategoryID"
                value={oFormData.ParentCategoryID}
                onChange={handleInputChange}
                options={parentCategories}
                loading={bLoadingCategories}
                placeholder={t("PRODUCT_SETUP.CREATE_CATEGORY.SELECT_PARENT")}
                Icon={Tag}
              />
            </div>

       
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {renderLabel(
                  "CategoryImage",
                  "PRODUCT_SETUP.CREATE_CATEGORY.IMAGE_LABEL"
                )}
              </label>
              <div
                className={`relative group rounded-xl border-2 ${
                  oErrors.CategoryImage
                    ? "border-red-300"
                    : oFieldValid.CategoryImage
                    ? "border-green-300"
                    : "border-gray-200"
                } border-dashed transition-all duration-200 hover:border-bg-hover bg-gray-50 hover:bg-gray-50/50`}
              >
                <div className="p-6">
                  <div className="space-y-3 text-center">
                    {!sImagePreview && (
                      <div className="flex justify-center">
                        <div className="p-3 rounded-full bg-white shadow-sm border border-gray-100">
                          <Image className="h-8 w-8 text-gray-400 group-hover:text-custom-bg transition-colors duration-200" />
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col items-center gap-2">
                      {!sImagePreview ? (
                        <>
                          <div className="flex text-sm text-gray-600 justify-center">
                            <label
                              htmlFor="file-upload"
                              className="relative cursor-pointer rounded-md font-medium text-custom-bg hover:text-[#4c39c7] underline"
                            >
                              <span>{t("COMMON.UPLOAD")}</span>
                              <input
                                id="file-upload"
                                ref={fileInputRef}
                                name="CategoryImage"
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="sr-only"
                              />
                            </label>
                            <p className="pl-1">{t("COMMON.DRAG_DROP_TEXT")}</p>
                          </div>
                          <p className="text-xs text-gray-500">
                            PNG, JPG, JPEG up to 10MB
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="relative">
                            <img
                              src={sImagePreview}
                              alt="Category Preview"
                              className="h-32 w-32 object-contain rounded-lg border-2 border-gray-200 bg-white p-2 shadow-sm mx-auto"
                            />
                            <button
                              type="button"
                              onClick={handleRemoveImage}
                              className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-all duration-200"
                               title={FILE_CONSTANTS.IMAGE_TITLE_TEXT}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            {t("COMMON.REMOVE_OR_UPLOAD_IMAGE")}
                          </p>
                        </>
                      )}
                    </div>

                    {oErrors.CategoryImage && (
                      <p className="text-sm text-red-600 flex items-center justify-center mt-2">
                        <span className="mr-1">⚠️</span>
                        {oErrors.CategoryImage}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

         
          <div className="w-full md:w-1/2">
            {/* Description */}
            <TextAreaWithIcon
              label={t("COMMON.DESCRIPTION")}
              name="CategoryDescription"
              value={oFormData.CategoryDescription}
              onChange={handleInputChange}
              onBlur={handleBlur}
              placeholder={t(
                "PRODUCT_SETUP.CREATE_CATEGORY.DESCRIPTION_PLACEHOLDER"
              )}
              error={oErrors.CategoryDescription}
              isValid={oFieldValid.CategoryDescription}
              icon={Info}
              showCharCount={true}
              maxChars={500}
              currentChars={oFormData.CategoryDescription?.length || 0}
              rows={4}
            />
          </div>

        </div>

        {/* API Error Display */}
        {oErrors.api && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-600">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{oErrors.api}</div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            className="btn-cancel"
            onClick={() =>
              navigate("/browse", { state: { fromCategoryEdit: true } })
            }
            disabled={bSubmitting}
          >
            {t("COMMON.CANCEL")}
          </button>
          <button type="submit" className="btn-primary" disabled={bSubmitting}>
            {bSubmitting
              ? t("COMMON.SUBMITTING")
              : isEditing
              ? t("COMMON.SAVE_BUTTON")
              : t("PRODUCT_SETUP.CREATE_CATEGORY.CREATE_BUTTON")}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateCategory;