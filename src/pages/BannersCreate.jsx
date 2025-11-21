import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { FiUpload } from "react-icons/fi";
import { MdOutlineCancel } from "react-icons/md";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { Tag, Layers, Percent } from "lucide-react";
import { toast } from "react-toastify";
import TextInputWithIcon from "../components/TextInputWithIcon";
import SelectWithIcon from "../components/SelectWithIcon";
import BackButton from "../components/BackButton";
import ImageCropperModal from "../components/ImageCropperModal";
import { useTitle } from "../context/TitleContext";
import { useDispatch, useSelector } from "react-redux";
import { fetchResource } from "../store/slices/allDataSlice";
import { apiPost, apiGet, apiPut } from "../utils/ApiUtils";
import {
  CREATE_BANNER,
  GET_BANNERS_BY_ID,
  UPDATE_BANNER,
} from "../contants/apiRoutes";
import {
  STATUS,
  DEFAULT_PAGE,
  BANNER_WIDTH,
  BANNER_HEIGHT,
} from "../contants/constants";
import { ToastContainer } from "react-toastify";
import Loader from "../components/Loader";

const BannerForm = () => {
  const { t } = useTranslation();
  const { setTitle, setBackButton } = useTitle();
  const navigate = useNavigate();
  const { bannerId } = useParams();
  const dispatch = useDispatch();

  // Redux selectors for categories and brands with active filter
  const categories = useSelector(
    (state) => state.allData.resources.categories?.data || []
  );
  const brands = useSelector(
    (state) => state.allData.resources.brands?.data || []
  );

  // Filter active categories and brands
  const activeCategories = useMemo(() => 
    categories.filter(category => category.IsActive === true), 
    [categories]
  );

  const activeBrands = useMemo(() => 
    brands.filter(brand => brand.IsActive === true), 
    [brands]
  );

  const [formData, setFormData] = useState({
    BannerName: "",
    preview: "",
    file: null,
    category: [],
    brand: [],
    discount: "",
    price: "",
    isActive: true,
  });
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [fieldValid, setFieldValid] = useState({});
  const [croppingImage, setCroppingImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [existingImageData, setExistingImageData] = useState(null);

  // Required fields configuration
  const requiredFields = {
    BannerName: true,
    preview: true,
    category: true,
    brand: true,
    discount: true,
    price: true,
  };

  // Refs to track if data has been fetched
  const hasFetchedCategories = useRef(false);
  const hasFetchedBrands = useRef(false);
  const hasFetchedBanner = useRef(false);

  /**
   * Live validation functions
   */
  const validateBannerName = useCallback((bannerName) => {
    if (!bannerName?.trim()) {
      return t("BANNER_FORM.VALIDATION.BANNER_NAME_REQUIRED");
    }
    if (bannerName.trim().length < 2) {
      return t("BANNER_FORM.VALIDATION.BANNER_NAME_MIN_LENGTH");
    }
    if (bannerName.trim().length > 100) {
      return t("BANNER_FORM.VALIDATION.BANNER_NAME_MAX_LENGTH");
    }
    return "";
  }, [t]);

  const validatePreview = useCallback((preview) => {
    if (!preview) {
      return t("BANNER_FORM.VALIDATION.IMAGE_REQUIRED");
    }
    return "";
  }, [t]);

  const validateCategory = useCallback((category) => {
    if (!category || category.length === 0) {
      return t("BANNER_FORM.VALIDATION.CATEGORY_REQUIRED");
    }
    return "";
  }, [t]);

  const validateBrand = useCallback((brand) => {
    if (!brand || brand.length === 0) {
      return t("BANNER_FORM.VALIDATION.BRAND_REQUIRED");
    }
    return "";
  }, [t]);

  const validateDiscount = useCallback((discount) => {
    if (!discount?.toString().trim()) {
      return t("BANNER_FORM.VALIDATION.DISCOUNT_REQUIRED");
    }
    
    const discountValue = parseFloat(discount);
    if (isNaN(discountValue)) {
      return t("BANNER_FORM.VALIDATION.DISCOUNT_NUMBER");
    }
    if (discountValue < 0) {
      return t("BANNER_FORM.VALIDATION.DISCOUNT_NON_NEGATIVE");
    }
    if (discountValue > 100) {
      return t("BANNER_FORM.VALIDATION.DISCOUNT_MAX_PERCENTAGE");
    }
    return "";
  }, [t]);

  const validatePrice = useCallback((price) => {
    if (!price?.toString().trim()) {
      return t("BANNER_FORM.VALIDATION.PRICE_REQUIRED");
    }
    
    const priceValue = parseFloat(price);
    if (isNaN(priceValue)) {
      return t("BANNER_FORM.VALIDATION.PRICE_NUMBER");
    }
    if (priceValue < 0) {
      return t("BANNER_FORM.VALIDATION.PRICE_NON_NEGATIVE");
    }
    return "";
  }, [t]);

  /**
   * Live validation for a specific field
   */
  const validateField = useCallback((name, value) => {
    let error = "";
    
    switch (name) {
      case "BannerName":
        error = validateBannerName(value);
        break;
      case "preview":
        error = validatePreview(value);
        break;
      case "category":
        error = validateCategory(value);
        break;
      case "brand":
        error = validateBrand(value);
        break;
      case "discount":
        error = validateDiscount(value);
        break;
      case "price":
        error = validatePrice(value);
        break;
      default:
        break;
    }

    setValidationErrors(prev => ({
      ...prev,
      [name]: error
    }));

    setFieldValid(prev => ({
      ...prev,
      [name]: !error && (value !== "" && value !== null && value !== undefined && 
               (!Array.isArray(value) || value.length > 0))
    }));
  }, [
    validateBannerName,
    validatePreview,
    validateCategory,
    validateBrand,
    validateDiscount,
    validatePrice
  ]);

  /**
   * Handle field blur for additional validation
   */
  const handleBlur = useCallback((e) => {
    const { name, value } = e.target;
    validateField(name, value);
  }, [validateField]);

  /**
   * Handle field change with live validation
   */
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Validate the field immediately
    validateField(name, value);
  }, [validateField]);

  /**
   * Handle select field changes
   */
  const handleSelectChange = useCallback((e) => {
    const { name, value } = e.target;
    
    let processedValue = value;
    if (Array.isArray(value)) {
      processedValue = value.filter(Boolean);
    }
    
    setFormData((prev) => ({ ...prev, [name]: processedValue }));
    validateField(name, processedValue);
  }, [validateField]);

  const fetchBanner = useCallback(async () => {
    if (!bannerId || hasFetchedBanner.current) return;

    hasFetchedBanner.current = true;

    try {
      const token = localStorage.getItem("token");
      const response = await apiGet(
        `${GET_BANNERS_BY_ID}/${bannerId}`,
        {},
        token
      );

      if (response?.data?.status === STATUS.SUCCESS.toUpperCase()) {
        const bannerData = response.data.data;
        const firstImage = bannerData.BannerImage?.[0] || {};

        const newFormData = {
          BannerName: bannerData.BannerName || "",
          preview: firstImage.documentUrl || "",
          category: bannerData.CategoryIDs || [],
          brand: bannerData.BrandIDs || [],
          discount: bannerData.Discount || "",
          price: bannerData.Price?.toString() || "",
          file: null,
          isActive:
            bannerData.IsActive !== undefined ? bannerData.IsActive : true,
        };

        setFormData(newFormData);
        setExistingImageData(firstImage);
        setError(null);

        // Validate initial data after setting
        setTimeout(() => {
          validateField("BannerName", newFormData.BannerName);
          validateField("preview", newFormData.preview);
          validateField("category", newFormData.category);
          validateField("brand", newFormData.brand);
          validateField("discount", newFormData.discount);
          validateField("price", newFormData.price);
        }, 100);
      } else {
        setError(response?.data?.message || t("COMMON.API_ERROR"));
      }
    } catch (error) {
      setError(error?.response?.data?.message || t("COMMON.API_ERROR"));
    }
  }, [bannerId, t, validateField]);

  useEffect(() => {
    setTitle(
      bannerId ? t("BANNER_FORM.EDIT_BANNER") : t("BANNER_FORM.UPLOAD_BANNER")
    );
    setBackButton(<BackButton onClick={() => navigate("/banners")} />);

    if (bannerId) {
      fetchBanner();
    }

    // Fetch categories and brands if not already fetched
    if (!hasFetchedCategories.current) {
      hasFetchedCategories.current = true;
      dispatch(fetchResource({ key: "categories" }));
    }

    if (!hasFetchedBrands.current) {
      hasFetchedBrands.current = true;
      dispatch(fetchResource({ key: "brands" }));
    }

    return () => {
      setBackButton(null);
      setTitle("");
    };
  }, [setTitle, setBackButton, t, navigate, bannerId, fetchBanner, dispatch]);

  const handleBannerUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.match("image.*")) {
      toast.error(t("BANNER_FORM.INVALID_IMAGE_TYPE"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        if (img.width < BANNER_WIDTH || img.height < BANNER_HEIGHT) {
          toast.error(
            t("BANNER_FORM.IMAGE_DIMENSIONS_TOO_SMALL", {
              width: BANNER_WIDTH,
              height: BANNER_HEIGHT,
            })
          );
          return;
        }
        setCroppingImage(reader.result);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (blob) => {
    const croppedFile = new File([blob], `cropped-image-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });

    const reader = new FileReader();
    reader.onloadend = () => {
      const previewUrl = reader.result;
      setFormData((prev) => ({
        ...prev,
        preview: previewUrl,
        file: croppedFile,
      }));
      setCroppingImage(null);
      
      // Validate the preview after setting
      validateField("preview", previewUrl);
    };
    reader.readAsDataURL(blob);
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({
      ...prev,
      file: null,
      preview: "",
    }));
    // Validate the preview after removal
    validateField("preview", "");
  };

  /**
   * Comprehensive form validation
   */
  const validateForm = useCallback(() => {
    const errors = {};
    
    errors.BannerName = validateBannerName(formData.BannerName);
    errors.preview = validatePreview(formData.preview);
    errors.category = validateCategory(formData.category);
    errors.brand = validateBrand(formData.brand);
    errors.discount = validateDiscount(formData.discount);
    errors.price = validatePrice(formData.price);

    // Update field validation states
    setFieldValid({
      BannerName: !errors.BannerName && formData.BannerName.trim() !== "",
      preview: !errors.preview && formData.preview !== "",
      category: !errors.category && formData.category.length > 0,
      brand: !errors.brand && formData.brand.length > 0,
      discount: !errors.discount && formData.discount.toString().trim() !== "",
      price: !errors.price && formData.price.toString().trim() !== "",
    });

    // Return only errors that have messages
    const filteredErrors = Object.fromEntries(
      Object.entries(errors).filter(([_, value]) => value !== "")
    );

    setValidationErrors(filteredErrors);
    return filteredErrors;
  }, [
    formData,
    validateBannerName,
    validatePreview,
    validateCategory,
    validateBrand,
    validateDiscount,
    validatePrice
  ]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Run comprehensive validation
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      // Scroll to first error
      const firstErrorField = Object.keys(validationErrors)[0];
      if (firstErrorField) {
        const element = document.getElementById(firstErrorField);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          element.focus();
        }
      }
      return;
    }

    setIsLoading(true);
    const token = localStorage.getItem("token");
    const data = new FormData();

    const mainData = {
      TenantID: localStorage.getItem("tenantID") || "1",
      BannerName: formData.BannerName,
      IsActive: formData.isActive,
      CategoryIDs: formData.category || [],
      BrandIDs: formData.brand || [],
      DiscountPercentage: Number(formData.discount) || 0,
      SortOrder: formData.sequence || DEFAULT_PAGE,
      SellingPrice: Number(formData.price) || 0,
      ...(bannerId
        ? {
            BannerID: bannerId,
            UpdatedBy: localStorage.getItem("userId") || "admin",
          }
        : {
            CreatedBy: localStorage.getItem("userId") || "admin",
          }),
    };

    // Handle document metadata for different scenarios
    if (bannerId) {
      // Update scenario
      if (formData.file) {
        // New image uploaded - include document metadata with new file
        mainData.documentMetadata = [
          {
            image: "image_0",
            sortOrder: parseInt(formData.sequence) || 1,
            ...(existingImageData?.documentId
              ? { DocumentID: existingImageData.documentId }
              : {}),
          },
        ];
      } else {
        // No new image uploaded - send empty documentMetadata array
        mainData.documentMetadata = [];
      }
    } else {
      // Create scenario - only include document metadata if there's a file
      if (formData.file) {
        mainData.documentMetadata = [
          {
            image: "image_0",
            sortOrder: parseInt(formData.sequence) || 1,
          },
        ];
      } else {
        // For create without image, send empty array
        mainData.documentMetadata = [];
      }
    }

    data.append("data", JSON.stringify(mainData));

    // Append file only if user selected a new one
    if (formData.file) {
      data.append("image_0", formData.file);
    }

    try {
      let response;

      if (bannerId) {
        // Use PUT for update with updateBanner endpoint
        response = await apiPut(UPDATE_BANNER, data, token, true);
      } else {
        // Use POST for create with createBanner endpoint
        response = await apiPost(CREATE_BANNER, data, token, true);
      }

      if (response?.data?.status === STATUS.SUCCESS.toUpperCase()) {
        toast.success(response?.data?.message || t("BANNER_FORM.SAVE_SUCCESS"));
        setTimeout(() => navigate("/banners"), 2000);
      } else {
        toast.error(response?.data?.message || t("COMMON.API_ERROR"));
      }
    } catch (error) {
      const errorMessage =
        error?.response?.data?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        t("COMMON.API_ERROR");
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
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

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-2 min-h-screen">
      <ToastContainer />

      {croppingImage && (
        <ImageCropperModal
          key={croppingImage}
          image={croppingImage}
          onCropComplete={handleCropComplete}
          onClose={() => {
            if (croppingImage?.startsWith("blob:")) {
              URL.revokeObjectURL(croppingImage);
            }
            setCroppingImage(null);
          }}
          aspectRatio={BANNER_WIDTH / BANNER_HEIGHT}
          minWidth={BANNER_WIDTH}
          minHeight={BANNER_HEIGHT}
          title={t("COMMON.CROP_IMAGE")}
          cancelText={t("COMMON.CANCEL")}
          saveText={t("COMMON.OK")}
        />
      )}

      <form onSubmit={handleSubmit}>
        <TextInputWithIcon
          label={renderLabel("BannerName", "BANNER_FORM.BANNER_NAME")}
          id="BannerName"
          name="BannerName"
          value={formData.BannerName}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={t("BANNER_FORM.ENTER_BANNER_NAME")}
          Icon={Tag}
          error={validationErrors.BannerName}
          isValid={fieldValid.BannerName}
          required={requiredFields.BannerName}
        />

        <div className="flex flex-col space-y-4 mt-4">
          <label className="font-semibold text-sm">
            {renderLabel("preview", "BANNER_FORM.UPLOAD_BANNERS_LABEL")}
          </label>

          <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4 border p-4 rounded-md">
            <div className="relative w-40 h-40 group overflow-hidden border rounded-md flex-shrink-0">
              {formData.preview ? (
                <>
                  <img
                    src={formData.preview}
                    alt={t("BANNER_FORM.UPLOAD_BANNER")}
                    className="object-contain w-full h-full"
                  />
                  <button
                    type="button"
                    className="absolute top-1 right-1 bg-white/80 rounded-full p-1 text-red-600 hover:bg-red-200"
                    onClick={handleRemoveImage}
                  >
                    <MdOutlineCancel className="h-4 w-4" />
                  </button>
                  <label
                    htmlFor="bannerUpload"
                    className="absolute bottom-1 left-1 bg-white/80 rounded-full p-1 text-custom-bg hover:bg-gray-200 cursor-pointer"
                    style={{ fontSize: 12 }}
                  >
                    <FiUpload className="h-4 w-4 inline" />
                    <input
                      id="bannerUpload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleBannerUpload}
                    />
                  </label>
                </>
              ) : (
                <label
                  htmlFor="bannerUpload"
                  className="flex items-center justify-center w-full h-full bg-gray-200 cursor-pointer"
                >
                  <FiUpload size={30} className="text-gray-400 mr-2" />
                  <span className="text-gray-700 text-sm">
                    {t("BANNER_FORM.CHOOSE_IMAGE")}
                  </span>
                  <input
                    id="bannerUpload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleBannerUpload}
                  />
                </label>
              )}
            </div>

            {validationErrors.preview && (
              <div className="text-red-500 text-sm mt-1">
                {validationErrors.preview}
              </div>
            )}

            {formData.preview && (
              <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4">
                <SelectWithIcon
                  label={renderLabel("category", "PRODUCT_CREATION.CATEGORY_ID")}
                  id="category"
                  name="category"
                  value={formData.category || []}
                  onChange={handleSelectChange}
                  onBlur={handleBlur}
                  options={activeCategories.map((cat) => ({
                    value: cat.CategoryID,
                    label: cat.CategoryName,
                  }))}
                  Icon={Layers}
                  onInputChange={(value) =>
                    dispatch(
                      fetchResource({
                        key: "categories",
                        params:
                          value && value.trim() !== ""
                            ? { searchText: value, isActive: true } // Filter active on server if supported
                            : { isActive: true }, // Always request active categories
                      })
                    )
                  }
                  error={validationErrors.category}
                  isValid={fieldValid.category}
                  multiple
                  placeholder={t("PRODUCT_CREATION.CATEGORY_ID_PLACEHOLDER")}
                  required={requiredFields.category}
                />

                <SelectWithIcon
                  label={renderLabel("brand", "COMMON.BRAND")}
                  id="brand"
                  name="brand"
                  value={formData.brand || []}
                  onChange={handleSelectChange}
                  onBlur={handleBlur}
                  options={activeBrands.map((b) => ({
                    value: b.BrandID,
                    label: b.BrandName,
                  }))}
                  Icon={Tag}
                  onInputChange={(value) =>
                    dispatch(
                      fetchResource({
                        key: "brands",
                        params:
                          value && value.trim() !== ""
                            ? { searchText: value, isActive: true } // Filter active on server if supported
                            : { isActive: true }, // Always request active brands
                      })
                    )
                  }
                  error={validationErrors.brand}
                  isValid={fieldValid.brand}
                  multiple
                  placeholder={t("PRODUCT_CREATION.BRAND_ID_PLACEHOLDER")}
                  required={requiredFields.brand}
                />

                <TextInputWithIcon
                  label={renderLabel("discount", "BANNER_FORM.DISCOUNT_PERCENTAGE")}
                  id="discount"
                  name="discount"
                  value={formData.discount || ""}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder={t("BANNER_FORM.ENTER_DISCOUNT_PERCENTAGE")}
                  Icon={Percent}
                  error={validationErrors.discount}
                  isValid={fieldValid.discount}
                  required={requiredFields.discount}
                  type="number"
                  min="0"
                  max="100"
                />

                <TextInputWithIcon
                  label={renderLabel("price", "COMMON.PRICE")}
                  id="price"
                  name="price"
                  value={formData.price || ""}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder={t("BANNER_FORM.ENTER_PRICE")}
                  Icon={() => (
                    <span
                      className="text-lg font-bold text-gray-400"
                      style={{ fontFamily: "inherit" }}
                    >
                      ₹
                    </span>
                  )}
                  error={validationErrors.price}
                  isValid={fieldValid.price}
                  required={requiredFields.price}
                  type="number"
                  min="0"
                />

                <SelectWithIcon
                  label={t("COMMON.STATUS")}
                  id="isActive"
                  name="isActive"
                  value={formData.isActive.toString()}
                  onChange={handleChange}
                  options={[
                    { value: "true", label: t("COMMON.ACTIVE") },
                    { value: "false", label: t("COMMON.INACTIVE") },
                  ]}
                  Icon={Tag}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end mt-8 gap-4">
          <button 
            type="submit" 
            className="btn-primary" 
            disabled={isLoading}
          >
            {isLoading ? t("COMMON.SAVING") : t("COMMON.SUBMIT")}
          </button>
          <button
            type="button"
            onClick={() => navigate("/banners")}
            className="btn-cancel ml-4"
          >
            {t("COMMON.CANCEL")}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BannerForm;