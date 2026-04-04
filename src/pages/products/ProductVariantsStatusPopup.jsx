import React, { useState, useEffect, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { apiGet, apiPatch } from "../../utils/ApiUtils.jsx";
import { GET_PRODUCT_BY_ID, UPDATE_PRODUCT_VARIANT_STATUS, UPDATE_PRODUCT_STATUS } from "../../contants/apiRoutes";
import noImage from "../../../assets/images/missing-pictur.jpg";
const SkeletonLoader = lazy(() => import("../../components/SkeletonLoader"));
const Loader = lazy(() => import("../../components/Loader"));
import { SKELETON_TYPES } from "../../contants/constants.jsx";
import { X, Package, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "react-toastify";
const Switch = lazy(() => import("../../components/Switch.jsx"));
const FullscreenErrorPopup = lazy(() => import("../../components/FullscreenErrorPopup"));
import { STATUS } from "../../contants/constants.jsx";

const ProductVariantsStatusPopup = ({ productId, onClose, onVariantStatusUpdate }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [productData, setProductData] = useState(null);
  const [error, setError] = useState(null);
  const [statusPopup, setStatusPopup] = useState({
    open: false,
    variantId: null,
    newStatus: null,
  });
  const [productStatusPopup, setProductStatusPopup] = useState({
    open: false,
    newStatus: null,
  });
  const [bSubmitting, setSubmitting] = useState(false);

  // Fetch product details from API
  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await apiGet(`${GET_PRODUCT_BY_ID}/${productId}`, {}, token);

      if (response.data.status === "SUCCESS") {
        setProductData(response.data.data);
        setError(null);
      } else {
        setError(response.data.message || t("COMMON.API_ERROR"));
      }
    } catch (err) {
      setError(err?.response?.data?.message || t("COMMON.API_ERROR"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (productId) {
      fetchProductDetails();
    }
  }, [productId]);

  const getVariantImage = (variant) => {
    if (
      Array.isArray(variant.ProductVariantImages) &&
      variant.ProductVariantImages.length > 0
    ) {
      const sortedImages = variant.ProductVariantImages.sort(
        (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)
      );
      return sortedImages[0].documentUrl;
    }
    return noImage;
  };

  const getTotalStock = (inventory) => {
    if (!Array.isArray(inventory) || inventory.length === 0) {
      return 0;
    }
    return inventory.reduce((total, item) => total + (item.Quantity || 0), 0);
  };

  const handleVariantStatusChange = (variantId, currentStatus) => {
    setStatusPopup({ open: true, variantId, newStatus: !currentStatus });
  };

  const handleVariantStatusConfirm = async () => {
    if (bSubmitting) return;

    const { variantId, newStatus } = statusPopup;

    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");

      const response = await apiPatch(
        `${UPDATE_PRODUCT_VARIANT_STATUS}/${variantId}`,
        { IsActive: newStatus },
        token
      );

      if (response.data.status === "SUCCESS") {
        // Update local state
        setProductData((prev) => ({
          ...prev,
          Variants: prev.Variants.map((v) =>
            v.VariantID === variantId ? { ...v, IsActive: newStatus } : v
          ),
        }));

        toast.success("Variant status updated successfully!");
        
        // Notify parent component about the update
        if (onVariantStatusUpdate) {
          onVariantStatusUpdate();
        }
      } else {
        toast.error(response.data.message || "Failed to update status");
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Error updating variant status"
      );
    } finally {
      setStatusPopup({ open: false, variantId: null, newStatus: null });
      setSubmitting(false);
    }
  };

  const handleVariantStatusPopupClose = () => {
    setStatusPopup({ open: false, variantId: null, newStatus: null });
  };

  const handleProductStatusChange = (newStatus) => {
    setProductStatusPopup({ open: true, newStatus });
  };

  const handleProductStatusConfirm = async () => {
    if (bSubmitting) return;

    const { newStatus } = productStatusPopup;

    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");

      // Update product status
      const productResponse = await apiPatch(
        `${UPDATE_PRODUCT_STATUS}/${productId}`,
        { IsActive: newStatus },
        token
      );

      if (productResponse.data.status === STATUS.SUCCESS.toUpperCase()) {
        // Update all variants to match the product status
        const variantUpdatePromises = productData.Variants.map(variant =>
          apiPatch(
            `${UPDATE_PRODUCT_VARIANT_STATUS}/${variant.VariantID}`,
            { IsActive: newStatus },
            token
          )
        );

        await Promise.all(variantUpdatePromises);

        // Update local state
        setProductData((prev) => ({
          ...prev,
          IsActive: newStatus,
          Variants: prev.Variants.map((v) => ({ ...v, IsActive: newStatus })),
        }));

        toast.success(
          `Product and all variants ${newStatus ? 'activated' : 'deactivated'} successfully!`
        );
        
        // Notify parent component about the update
        if (onVariantStatusUpdate) {
          onVariantStatusUpdate();
        }
      } else {
        toast.error(productResponse.data.message || "Failed to update product status");
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Error updating product status"
      );
    } finally {
      setProductStatusPopup({ open: false, newStatus: null });
      setSubmitting(false);
    }
  };

  const handleProductStatusPopupClose = () => {
    setProductStatusPopup({ open: false, newStatus: null });
  };

  return (
    <Suspense fallback={<div className="flex items-center justify-center fixed inset-0 bg-black/70 backdrop-blur-sm z-50"><div className="text-center"><Loader /></div></div>}>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-slideUp">
        {/* Header */}
        <div className="sticky top-0 bg-custom-bg/20 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-md shadow-sm">
              <Package className="h-5 w-5 text-custom-bg" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {t("PRODUCTS.VARIANT_STATUS_TITLE")}
              </h2>
              <p className="text-sm text-gray-600">
                {productData?.ProductName || t("COMMON.LOADING")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-md transition-all duration-200"
            title="Close"
          >
            <X className="h-5 w-5 text-gray-500 hover:text-gray-700" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {error ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
                <X className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t("COMMON.ERROR_LOADING_DATA")}
              </h3>
              <p className="text-sm text-gray-600 mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
              >
                {t("COMMON.CLOSE")}
              </button>
            </div>
          ) : (
            <div>
              {/* Product Info */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 flex-shrink-0">
                    <img
                      className="h-16 w-16 rounded-lg object-cover border border-gray-200"
                      src={productData?.ProductImage?.documentUrl || noImage}
                      alt={productData?.ProductName}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = noImage;
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {productData?.ProductName}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {t("COMMON.BRAND")}: {productData?.BrandName || "N/A"} | 
                      {t("COMMON.CATEGORY")}: {productData?.CategoryName || "N/A"}
                    </p>
                    <p className="text-sm text-gray-600">
                      {t("COMMON.TOTAL_VARIANTS")}: {productData?.Variants?.length || 0}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">
                       {t("PRODUCT_STATUS")}:
                      </span>
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full ${
                          productData?.IsActive
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {productData?.IsActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">
                        {productData?.IsActive ? t("COMMON.DEACTIVATE") : t("COMMON.ACTIVATE")} Product & All Variants
                      </span>
                      <Switch
                        checked={productData?.IsActive || false}
                        onChange={() => handleProductStatusChange(!productData?.IsActive)}
                      />
                    </div>
                  </div>
                </div>
              </div>
              {/* Variants List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-gray-900">
                    {t("VARIANT_CONTROLS")}
                  </h4>
                </div>
                
                {(!productData?.Variants || productData.Variants.length === 0) ? (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
                      <Package className="h-6 w-6 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                     {t("NO_VARIANTS_FOUND")}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {t("NO_VARIANTS_MESSAGE")}
                    </p>
                  </div>
                ) : (
                  <div className="table-container-floating">
                    <div className="table-wrapper-floating">
                      <table className="table-base table-fixed">
                        <thead className="table-head-floating">
                          <tr>
                            <th className="table-head-cell-floating text-left w-1/4 min-w-[200px]">
                              {t("INVENTORY.VARIANT")}
                            </th>
                            <th className="table-head-cell-floating text-center w-1/4 min-w-[150px]">
                              {t("INVENTORY.ATTRIBUTES")}
                            </th>
                            <th className="table-head-cell-floating text-center w-1/6 min-w-[100px]">
                              {t("INVENTORY.STOCK")}
                            </th>
                            <th className="table-head-cell-floating text-center w-1/6 min-w-[100px]">
                              {t("INVENTORY.MRP")}
                            </th>
                            <th className="table-head-cell-floating text-center w-1/6 min-w-[100px]">
                              {t("INVENTORY.STATUS")}
                            </th>
                            <th className="table-head-cell-floating text-center w-1/12 min-w-[80px]">
                              {t("COMMON.ACTIONS")}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="table-body">
                          {loading ? (
                            <SkeletonLoader type={SKELETON_TYPES.PRODUCT_TABLE} rows={5} />
                          ) : (
                            productData.Variants.map((variant, index) => {
                            const totalStock = getTotalStock(variant.Inventory || []);
                            const storeCount = variant.Inventory?.length || 0;

                            return (
                              <tr key={variant.VariantID} className="table-row">
                                {/* Variant Info */}
                                <td className="table-cell text-left align-middle w-1/4 min-w-[200px]">
                                  <div className="flex items-center p-2">
                                    <div className="h-10 w-10 flex-shrink-0">
                                      <img
                                        className="h-10 w-10 rounded object-cover"
                                        src={getVariantImage(variant)}
                                        alt={`Variant ${index + 1}`}
                                        onError={(e) => {
                                          e.target.onerror = null;
                                          e.target.src = noImage;
                                        }}
                                      />
                                    </div>
                                    <div className="ml-3 min-w-0 flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <div className="font-medium text-xs text-gray-900">
                                          {t("INVENTORY.VARIANT")} #{index + 1}
                                        </div>
                                      </div>
                                      <div className="text-xs text-gray-600">
                                        {storeCount} {t("INVENTORY.STORE")} {storeCount !== 1 ? t("INVENTORY.STORES") : ''}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* Attributes */}
                                <td className="table-cell text-center align-middle w-1/4 min-w-[150px]">
                                  <div className="text-xs text-gray-700 px-2">
                                    {variant.Attributes?.length > 0 ? (
                                      <div className="space-y-1">
                                        {variant.Attributes.map((attr, attrIndex) => (
                                          <div key={attrIndex} className="text-xs">
                                            <span className="font-medium">{attr.Name}:</span> {attr.Value}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">{t("INVENTORY.NO_ATTRIBUTES")}</span>
                                    )}
                                  </div>
                                </td>

                                {/* Stock */}
                                <td className="table-cell text-center align-middle w-1/6 min-w-[100px]">
                                  <div className="text-xs font-medium text-gray-900">
                                    {totalStock} {t("PRODUCTS.UNITS")}
                                  </div>
                                </td>

                                {/* MRP */}
                                <td className="table-cell text-center align-middle w-1/6 min-w-[100px]">
                                  <div className="text-xs font-medium text-gray-900">
                                    ₹{variant.MRP?.toLocaleString("en-IN") || "0"}
                                  </div>
                                </td>

                                {/* Status Badge */}
                                <td className="table-cell text-center align-middle w-1/6 min-w-[100px]">
                                  <span
                                    className={`px-3 py-1 text-xs font-medium rounded-full ${
                                      variant.IsActive
                                        ? "bg-green-100 text-green-700"
                                        : "bg-red-100 text-red-700"
                                    }`}
                                  >
                                    {variant.IsActive ? "Active" : "Inactive"}
                                  </span>
                                </td>

                                {/* Status Switch */}
                                <td className="table-cell text-center align-middle w-1/12 min-w-[80px]">
                                  <Switch
                                    checked={variant.IsActive}
                                    onChange={() =>
                                      handleVariantStatusChange(
                                        variant.VariantID,
                                        variant.IsActive
                                      )
                                    }
                                  />
                                </td>
                              </tr>
                            );
                          })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-colors font-medium"
          >
            {t("COMMON.CLOSE")}
          </button>
        </div>
      </div>

      {/* Status Confirmation Popup */}
      {statusPopup.open && (
        <FullscreenErrorPopup
          title={t("PRODUCTS.CONFIRM_STATUS_TITLE")}
          message={
            statusPopup.newStatus
              ? t("PRODUCTS.CONFIRM_ACTIVATE_MESSAGE")
              : t("PRODUCTS.CONFIRM_DEACTIVATE_MESSAGE")
          }
          onClose={handleVariantStatusPopupClose}
          onConfirm={handleVariantStatusConfirm}
          isSubmitting={bSubmitting}
        />
      )}

      {/* Product Status Confirmation Popup */}
      {productStatusPopup.open && (
        <FullscreenErrorPopup
          title={t("CONFIRM_PRODUCT_STATUS_TITLE")}
          message={
            productStatusPopup.newStatus
              ? t("CONFIRM_PRODUCT_ACTIVATE_MESSAGE")
              : t("CONFIRM_PRODUCT_DEACTIVATE_MESSAGE")
          }
          onClose={handleProductStatusPopupClose}
          onConfirm={handleProductStatusConfirm}
          isSubmitting={bSubmitting}
        />
      )}
    </div>
    </Suspense>
  );
};

export default ProductVariantsStatusPopup;