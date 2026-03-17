import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { apiGet, apiPut, apiPatch } from "../../utils/ApiUtils.jsx";
import {
  GET_PRODUCT_BY_ID,
  UPDATE_STORE_INVENTORY,
  UPDATE_STORE_INVENTORY_STATUS,
  UPDATE_PRODUCT_VARIANT_STATUS,
} from "../../contants/apiRoutes";
import noImage from "../../../assets/images/missing-pictur.jpg";
import Loader from "../../components/Loader";
import {
  X,
  Package,
  Store,
  Tag,
  BarChart3,
  ChevronRight,
  ShoppingBag,
  MapPin,
  Percent,
  Edit,
  Check,
  X as XIcon,
} from "lucide-react";
import Switch from "../../components/Switch.jsx";
import FullscreenErrorPopup from "../../components/FullscreenErrorPopup";
import { STATUS, MODULES, PERMISSIONS } from "../../contants/constants.jsx";
import { showEmsg } from "../../utils/ShowEmsg";
import { getPermissionCode, hasPermissionId } from "../../utils/permissionUtils";
const ProductVariantsPopup = ({ productId, onClose }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [productData, setProductData] = useState(null);
  const [error, setError] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [inventoryPanelOpen, setInventoryPanelOpen] = useState(false);
  const [editingInventoryId, setEditingInventoryId] = useState(null);
  const [editedInventory, setEditedInventory] = useState({});
  const [saving, setSaving] = useState(false);
  const [statusPopup, setStatusPopup] = useState({
    open: false,
    variantId: null,
    newStatus: null,
  });
  const [storeStatusPopup, setStoreStatusPopup] = useState({
    open: false,
    storeId: null,
    variantId: null,
    newStatus: null,
  });
  const [bSubmitting, setSubmitting] = useState(false);
  const isMounted = useRef(true);

  // Permission checks
  const permissionIdForEditStoreInventory = getPermissionCode(
    MODULES.INVENTORY,
    PERMISSIONS.EDIT_STORE_INVENTORY
  );
  const permissionIdForUpdateStoreInventoryStatus = getPermissionCode(
    MODULES.INVENTORY,
    PERMISSIONS.UPDATE_STORE_INVENTORY_STATUS
  );
  const permissionIdForUpdateProductVariantStatus = getPermissionCode(
    MODULES.INVENTORY,
    PERMISSIONS.UPDATE_PRODUCT_VARIANT_STATUS
  );

  const hasEditStoreInventoryPermission = hasPermissionId(permissionIdForEditStoreInventory);
  const hasUpdateStoreInventoryStatusPermission = hasPermissionId(permissionIdForUpdateStoreInventoryStatus);
  const hasUpdateProductVariantStatusPermission = hasPermissionId(permissionIdForUpdateProductVariantStatus);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Fetch product details from API
  const fetchProductDetails = async (showLoader = false) => {
    // If showLoader is true, set loading state (for initial load)
    if (showLoader) setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await apiGet(
        `${GET_PRODUCT_BY_ID}/${productId}`,
        {},
        token,
      );

      if (!isMounted.current) return;

      if (response.data.status === STATUS.SUCCESS?.toUpperCase()) {
        const newData = response.data.data;
        setProductData(newData);

        // If a variant was selected, try to preserve it with updated data
        if (selectedVariant) {
          const updatedVariant = newData.Variants?.find(
            (v) => v.VariantID === selectedVariant.VariantID,
          );
          setSelectedVariant(updatedVariant || null);
          // Reset editing state as inventory data may have changed
          setEditingInventoryId(null);
          setEditedInventory({});
        }

        setError(null);
      } else {
        setError(response.data.message, STATUS.ERROR?.toLowerCase());
        if (!showLoader) {
          showEmsg(
            t("INVENTORY.FAILED_TO_REFRESH_PRODUCT_DETAILS"),
            STATUS.ERROR?.toLowerCase(),
          );
        }
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err?.response?.data?.message || t("COMMON.API_ERROR"));
        if (!showLoader) {
          showEmsg(
            err?.response?.data?.message || t("COMMON.API_ERROR"),
            STATUS.ERROR?.toLowerCase(),
          );
        }
      }
    } finally {
      if (isMounted.current && showLoader) {
        setLoading(false);
      }
    }
  };

  // Initial load
  useEffect(() => {
    if (productId) {
      fetchProductDetails(true);
    }
  }, [productId]);

  const getVariantImage = (variant) => {
    if (
      Array.isArray(variant.ProductVariantImages) &&
      variant.ProductVariantImages.length > 0
    ) {
      const sortedImages = variant.ProductVariantImages.sort(
        (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0),
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

  const getDiscountedPrice = (mrp, discountPercentage) => {
    if (!discountPercentage || !mrp) return mrp || 0;
    return mrp - (mrp * discountPercentage) / 100;
  };

  const openInventoryPanel = (variant) => {
    setSelectedVariant(variant);
    setInventoryPanelOpen(true);
    setEditingInventoryId(null);
  };

  const closeInventoryPanel = () => {
    setInventoryPanelOpen(false);
    setSelectedVariant(null);
    setEditingInventoryId(null);
  };

  const handleEditInventory = (inventory) => {
    if (!hasEditStoreInventoryPermission) {
      showEmsg(t("COMMON.NO_PERMISSION"), STATUS.ERROR);
      return;
    }
    setEditingInventoryId(inventory.StoreID);
    setEditedInventory({
      Quantity: inventory.Quantity || 0,
      SellingPrice: inventory.SellingPrice || 0,
      DiscountPercentage: inventory.DiscountPercentage || 0,
    });
  };

  const handleVariantStatusChange = (variantId, currentStatus) => {
    if (!hasUpdateProductVariantStatusPermission) {
      showEmsg(t("COMMON.NO_PERMISSION"), STATUS.ERROR);
      return;
    }
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
        token,
      );

      if (response.data.status === STATUS.SUCCESS?.toUpperCase()) {
        // Optimistic update
        setProductData((prev) => ({
          ...prev,
          Variants: prev.Variants.map((v) =>
            v.VariantID === variantId ? { ...v, IsActive: newStatus } : v,
          ),
        }));

        showEmsg(
          t("INVENTORY.VARIANT_STATUS_UPDATED"),
          STATUS.SUCCESS?.toLowerCase(),
        );

        // Refetch to ensure consistency
        await fetchProductDetails(false);
      } else {
        showEmsg(
          response.data.message,
          STATUS.ERROR?.toLowerCase(),
        );
      }
    } catch (error) {
      showEmsg(
        error?.response?.data?.message,
        STATUS.ERROR?.toLowerCase(),
      );
    } finally {
      setStatusPopup({ open: false, variantId: null, newStatus: null });
      setSubmitting(false);
    }
  };

  const handleVariantStatusPopupClose = () => {
    setStatusPopup({ open: false, variantId: null, newStatus: null });
  };

  const handleSaveInventory = async (variantId, storeId) => {
    if (!hasEditStoreInventoryPermission) {
      showEmsg(t("COMMON.NO_PERMISSION"), STATUS.ERROR);
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem("token");

      // Calculate selling price from MRP and discount
      const variant = productData.Variants.find(
        (v) => v.VariantID === variantId,
      );
      const mrp = variant?.MRP || 0;
      const discountPercentage =
        parseFloat(editedInventory.DiscountPercentage) || 0;
      const calculatedSellingPrice = getDiscountedPrice(
        mrp,
        discountPercentage,
      );

      const payload = {
        ProductVariantID: variantId,
        StoreID: storeId,
        Quantity: parseInt(editedInventory.Quantity),
        SellingPrice: calculatedSellingPrice,
        DiscountPercentage: discountPercentage,
      };

      const response = await apiPut(UPDATE_STORE_INVENTORY, payload, token);

      if (response.data.status === STATUS.SUCCESS?.toUpperCase()) {
        // Optimistic update
        setProductData((prevData) => {
          const updatedVariants = prevData.Variants.map((variant) => {
            if (variant.VariantID === variantId) {
              const updatedInventory = variant.Inventory.map((inv) => {
                if (inv.StoreID === storeId) {
                  return {
                    ...inv,
                    Quantity: payload.Quantity,
                    SellingPrice: payload.SellingPrice,
                    DiscountPercentage: payload.DiscountPercentage,
                  };
                }
                return inv;
              });
              return { ...variant, Inventory: updatedInventory };
            }
            return variant;
          });
          return { ...prevData, Variants: updatedVariants };
        });

        if (selectedVariant && selectedVariant.VariantID === variantId) {
          setSelectedVariant((prev) => {
            const updatedInventory = prev.Inventory.map((inv) => {
              if (inv.StoreID === storeId) {
                return {
                  ...inv,
                  Quantity: payload.Quantity,
                  SellingPrice: payload.SellingPrice,
                  DiscountPercentage: payload.DiscountPercentage,
                };
              }
              return inv;
            });
            return { ...prev, Inventory: updatedInventory };
          });
        }

        showEmsg(
          t("INVENTORY.INVENTORY_UPDATED"),
          STATUS.SUCCESS?.toLowerCase(),
        );
        setEditingInventoryId(null);

        // Refetch to ensure consistency
        await fetchProductDetails(false);
      } else {
        showEmsg(
          response.data.message,
          STATUS.ERROR?.toLowerCase(),
        );
      }
    } catch (err) {
      showEmsg(
        err?.response?.data?.message,
        STATUS.ERROR?.toLowerCase(),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingInventoryId(null);
    setEditedInventory({});
  };

  const handleToggleActive = (storeId, variantId, currentStatus) => {
    if (!hasUpdateStoreInventoryStatusPermission) {
      showEmsg(t("COMMON.NO_PERMISSION"), STATUS.ERROR);
      return;
    }
    setStoreStatusPopup({
      open: true,
      storeId,
      variantId,
      newStatus: !currentStatus,
    });
  };

  const handleStoreStatusConfirm = async () => {
    if (bSubmitting) return;

    const { storeId, variantId, newStatus } = storeStatusPopup;

    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");

      const response = await apiPatch(
        `${UPDATE_STORE_INVENTORY_STATUS}/${storeId}/${variantId}`,
        { IsActive: newStatus },
        token,
      );

      if (response.data.status === STATUS.SUCCESS?.toUpperCase()) {
        // Optimistic update
        setProductData((prevData) => ({
          ...prevData,
          Variants: prevData.Variants.map((variant) =>
            variant.VariantID === variantId
              ? {
                  ...variant,
                  Inventory: variant.Inventory.map((inv) =>
                    inv.StoreID === storeId
                      ? { ...inv, IsActive: newStatus }
                      : inv,
                  ),
                }
              : variant,
          ),
        }));

        if (selectedVariant?.VariantID === variantId) {
          setSelectedVariant((prev) => ({
            ...prev,
            Inventory: prev.Inventory.map((inv) =>
              inv.StoreID === storeId ? { ...inv, IsActive: newStatus } : inv,
            ),
          }));
        }

        showEmsg(
        t("INVENTORY.STORE_INVENTORY_UPDATED"),
          STATUS.SUCCESS?.toLowerCase(),
        );

        // Refetch to ensure consistency
        await fetchProductDetails(false);
      } else {
        showEmsg(
          response.data.message,
          STATUS.ERROR?.toLowerCase(),
        );
      }
    } catch (err) {
      showEmsg(
        err?.response?.data?.message,
        STATUS.ERROR?.toLowerCase(),
      );
    } finally {
      setStoreStatusPopup({
        open: false,
        storeId: null,
        variantId: null,
        newStatus: null,
      });
      setSubmitting(false);
    }
  };

  const handleStoreStatusPopupClose = () => {
    setStoreStatusPopup({
      open: false,
      storeId: null,
      variantId: null,
      newStatus: null,
    });
  };

  const calculateInventorySummary = (variants) => {
    if (!variants) return { totalStock: 0, totalStores: 0, totalMRP: 0 };

    let totalStock = 0;
    const storeSet = new Set();
    let totalMRP = 0;
    let variantCount = 0;

    variants.forEach((variant) => {
      totalStock += getTotalStock(variant.Inventory || []);
      totalMRP += variant.MRP || 0;
      variantCount++;

      (variant.Inventory || []).forEach((inv) => {
        if (inv.StoreID) storeSet.add(inv.StoreID);
      });
    });

    return {
      totalStock,
      totalStores: storeSet.size,
      totalMRP: variantCount > 0 ? totalMRP / variantCount : 0,
      variantCount,
    };
  };

  const summary = calculateInventorySummary(productData?.Variants);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-2 animate-fadeIn">
      <div
        className={`bg-white rounded-lg shadow-2xl w-full max-h-[95vh] overflow-hidden animate-slideUp ${
          inventoryPanelOpen ? "max-w-8xl" : "max-w-6xl"
        }`}
      >
        {/* Header - Compact */}
        <div className="sticky top-0 bg-custom-bg/20 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white rounded-md shadow-xs">
              <Package className="h-5 w-5 text-custom-bg" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {productData?.ProductName || "Product Details"}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex items-center gap-1">
                  <Tag className="h-2.5 w-2.5 text-gray-500" />
                  <span className="text-[10px] text-gray-600">
                    {t("PRODUCTS.PRODUCT_ID")}: {productId?.substring(0, 8)}...
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Store className="h-2.5 w-2.5 text-gray-500" />
                  <span className="text-[10px] text-gray-600">
                    {productData?.BrandName}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <BarChart3 className="h-2.5 w-2.5 text-gray-500" />
                  <span className="text-[10px] text-gray-600">
                    {productData?.CategoryName}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white rounded-md transition-all duration-200"
            title="Close"
          >
            <X className="h-4 w-4 text-gray-500 hover:text-gray-700" />
          </button>
        </div>

        {/* Summary Cards - Compact */}
        {!loading && !error && (
          <div className="px-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-1 rounded border border-blue-200">
                <div className="flex items-center gap-1">
                  <div className="p-0.5 bg-blue-100 rounded">
                    <Package className="h-3 w-3 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-blue-700 font-medium">
                      {t("ADD_VARIANT.TOTAL_VARIANTS")}
                    </p>
                    <p className="text-xs font-bold text-blue-900">
                      {summary.variantCount}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-green-100 p-1 rounded border border-green-200">
                <div className="flex items-center gap-1">
                  <div className="p-0.5 bg-green-100 rounded">
                    <Store className="h-3 w-3 text-green-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-green-700 font-medium">
                      {t("PRODUCTS.TOTAL_STOCK")}
                    </p>
                    <p className="text-xs font-bold text-green-900">
                      {summary.totalStock}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-1 rounded border border-purple-200">
                <div className="flex items-center gap-1">
                  <div className="p-0.5 bg-purple-100 rounded">
                    <Store className="h-3 w-3 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-purple-700 font-medium">
                      {t("INVENTORY.STORE_LOCATIONS")}
                    </p>
                    <p className="text-xs font-bold text-purple-900">
                      {summary.totalStores}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-1 rounded border border-amber-200">
                <div className="flex items-center gap-1">
                  <div className="p-0.5 bg-amber-100 rounded">
                    <Tag className="h-3 w-3 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-amber-700 font-medium">
                      {t("INVENTORY.AVG_MRP")}
                    </p>
                    <p className="text-xs font-bold text-amber-900">
                      ₹
                      {summary.totalMRP.toLocaleString("en-IN", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Split Layout */}
        <div className="flex h-[calc(95vh-140px)]">
          {/* Left Panel - Variants Table */}
          <div
            className={`transition-all duration-300 ${
              inventoryPanelOpen ? "w-7/12" : "w-full"
            }`}
          >
            <div className="h-full overflow-y-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <Loader size="medium" />
                  <p className="mt-2 text-xs text-gray-600">
                    {t("PRODUCTS.LOADING_DETAILS")}
                  </p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-red-100 mb-2">
                    <X className="h-5 w-5 text-red-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">
                    {t("PRODUCTS.ERROR_LOADING_DETAILS")}
                  </h3>
                  <p className="text-xs text-gray-600">{error}</p>
                  <button
                    onClick={onClose}
                    className="mt-3 px-4 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors"
                  >
                    {t("COMMON.CLOSE")}
                  </button>
                </div>
              ) : (
                <div className="h-full">
                  <div className="bg-white rounded border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="table-head-cell-floating text-center">
                              {t("PRODUCT_CREATION.VARIANT")}
                            </th>
                            <th className="table-head-cell-floating text-center">
                              {t("PRODUCT_SETUP.CATEGORIES.TABLE.IMAGE")}
                            </th>
                            <th className="table-head-cell-floating text-center">
                              {t("COMMON.PRICE")}
                            </th>
                            <th className="table-head-cell-floating text-center">
                              {t("PRODUCTS.STOCK")}
                            </th>
                            <th className="table-head-cell-floating text-center">
                              {t("COMMON.STATUS")}
                            </th>
                            <th className="table-head-cell-floating text-center">
                              {t("COMMON.ACTIONS")}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {productData?.Variants?.map((variant, index) => {
                            const totalStock = getTotalStock(
                              variant.Inventory || [],
                            );
                            const storeCount = variant.Inventory?.length || 0;

                            return (
                              <tr
                                key={variant.VariantID}
                                className={`hover:bg-gray-50 transition-colors ${
                                  selectedVariant?.VariantID ===
                                    variant.VariantID && inventoryPanelOpen
                                    ? "bg-blue-50 border-l-2 border-l-blue-500"
                                    : ""
                                }`}
                              >
                                <td className="table-cell text-center align-middle">
                                  <div>
                                    <div className="text-xs font-medium text-gray-900">
                                      {t("PRODUCT_CREATION.VARIANT")} #
                                      {index + 1}
                                    </div>
                                    {variant.Attributes?.length > 0 && (
                                      <div className="text-[10px] text-gray-500">
                                        {variant.Attributes.map(
                                          (attr) =>
                                            `${attr.Name}: ${attr.Value}`,
                                        ).join(", ")}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="table-cell text-center align-middle">
                                  <div className="h-8 w-8">
                                    <img
                                      src={getVariantImage(variant)}
                                      alt={`Variant ${index + 1}`}
                                      className="h-8 w-8 rounded object-cover border border-gray-200"
                                      onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = noImage;
                                      }}
                                    />
                                  </div>
                                </td>
                                <td className="table-cell text-center align-middle">
                                  <div>
                                    <div className="text-xs font-semibold text-gray-900">
                                      ₹{variant.MRP?.toLocaleString("en-IN")}
                                    </div>
                                    <div className="text-[10px] text-gray-500">
                                      {t("PRODUCT_CREATION.MRP")}
                                    </div>
                                  </div>
                                </td>
                                <td className="table-cell text-center align-middle">
                                  <div>
                                    <div className="text-xs font-semibold text-gray-900">
                                      {totalStock}
                                    </div>
                                    <div className="text-[10px] text-gray-500">
                                      {storeCount} {t("SIDEBAR.STORES")}
                                    </div>
                                  </div>
                                </td>
                                <td className="table-cell text-center align-middle">
                                  <div>
                                    <Switch
                                      checked={variant.IsActive}
                                      onChange={() =>
                                        handleVariantStatusChange(
                                          variant.VariantID,
                                          variant.IsActive,
                                        )
                                      }
                                      disabled={!hasUpdateProductVariantStatusPermission}
                                    />
                                  </div>
                                </td>
                                <td className="px-3 py-2">
                                  <button
                                    onClick={() => openInventoryPanel(variant)}
                                    className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded transition-all duration-200 ${
                                      selectedVariant?.VariantID ===
                                        variant.VariantID && inventoryPanelOpen
                                        ? "bg-blue-100 text-blue-700 ring-1 ring-blue-200"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    }`}
                                  >
                                    <ChevronRight className="ml-1 h-3 w-3" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {(!productData?.Variants ||
                    productData.Variants.length === 0) && (
                    <div className="text-center py-8">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 mb-2">
                        <Package className="h-5 w-5 text-gray-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">
                        {t("INVENTORY.NO_VARIANTS_FOUND")}
                      </h3>
                      <p className="text-xs text-gray-600">
                        {t("INVENTORY.NO_VARIANTS_CONFIGURED")}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Inventory Details */}
          {inventoryPanelOpen && selectedVariant && (
            <div className="w-10/12 border-l border-gray-200 animate-slideRight">
              <div className="h-full flex flex-col">
                {/* Inventory Panel Header */}
                <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-blue-100 rounded">
                      <ShoppingBag className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">
                        {t("INVENTORY.INVENTORY_DETAILS")}
                      </h3>
                      <p className="text-[10px] text-gray-500">
                        {t("PRODUCT_CREATION.VARIANT")} #
                        {productData?.Variants?.findIndex(
                          (v) => v.VariantID === selectedVariant.VariantID,
                        ) + 1}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {editingInventoryId && (
                      <span className="text-[10px] text-amber-600 font-medium px-1 py-0.5 bg-amber-100 rounded">
                        {t("COMMON.EDITING")}
                      </span>
                    )}
                    <button
                      onClick={closeInventoryPanel}
                      className="p-0.5 hover:bg-white rounded transition-colors"
                    >
                      <X className="h-3.5 w-3.5 text-gray-500" />
                    </button>
                  </div>
                </div>

                {/* Variant Status Switch (matches table) */}
                <div className="flex-1 overflow-y-auto">
                  <div className="px-4 py-2">
                    {/* Variant Status Switch */}
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="text-xs font-medium text-gray-900">
                          {t("PRODUCTS.STORE_INVENTORY")}
                        </h4>
                        <p className="text-[10px] text-gray-500">
                          {(selectedVariant.Inventory || []).length} locations •
                          Total:{" "}
                          {getTotalStock(selectedVariant.Inventory || [])} units
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {(selectedVariant.Inventory || []).length === 0 ? (
                        <div className="text-center py-4">
                          <Store className="h-8 w-8 text-gray-300 mx-auto mb-1" />
                          <p className="text-xs text-gray-500">
                            {t("INVENTORY.NO_STORE_INVENTORY")}
                          </p>
                        </div>
                      ) : (
                        (selectedVariant.Inventory || []).map((inv, index) => {
                          const isEditing = editingInventoryId === inv.StoreID;
                          const isInvActive =
                            inv.IsActive !== undefined ? inv.IsActive : true;
                          const mrp = selectedVariant.MRP || 0;
                          const discountPercentage = isEditing
                            ? editedInventory.DiscountPercentage
                            : inv.DiscountPercentage;
                          const finalPrice = getDiscountedPrice(
                            mrp,
                            discountPercentage,
                          );

                          return (
                            <div
                              key={`${inv.StoreID}-${index}`}
                              className={`border rounded p-2 transition-all ${
                                isInvActive
                                  ? "bg-green-50 border-green-200"
                                  : "bg-gray-50 border-gray-300"
                              } ${isEditing ? "ring-1 ring-blue-100" : ""}`}
                            >
                              {/* Store Header */}
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-1.5">
                                  <div
                                    className={`p-1 rounded ${
                                      isInvActive
                                        ? "bg-green-100"
                                        : "bg-gray-200"
                                    }`}
                                  >
                                    <MapPin
                                      className={`h-3 w-3 ${
                                        isInvActive
                                          ? "text-green-600"
                                          : "text-gray-600"
                                      }`}
                                    />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <h5 className="text-xs font-medium text-gray-900">
                                        {inv.StoreName || `Store ${index + 1}`}
                                      </h5>
                                      <span
                                        className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
                                          isInvActive
                                            ? "bg-green-100 text-green-700"
                                            : "bg-red-100 text-red-700"
                                        }`}
                                      >
                                        {isInvActive ? t("COMMON.ACTIVE") : t("COMMON.INACTIVE")}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-gray-500">
                                      {t("PRODUCTS.STORE_ID")}:{" "}
                                      {inv.StoreID?.substring(0, 6)}...
                                    </p>
                                  </div>
                                </div>

                                {/* Actions and Final Price */}
                                <div className="flex items-center gap-5">
                                  <div className="mr-1">
                                    <Switch
                                      checked={
                                        inv.IsActive !== undefined
                                          ? inv.IsActive
                                          : true
                                      }
                                      onChange={() =>
                                        handleToggleActive(
                                          inv.StoreID,
                                          selectedVariant.VariantID,
                                          isInvActive,
                                        )
                                      }
                                      size="sm"
                                      label=""
                                      disabled={!hasUpdateStoreInventoryStatusPermission}
                                    />
                                  </div>

                                  <div className="text-right mr-1">
                                    <div className="text-sm font-bold text-blue-600">
                                      ₹
                                      {finalPrice.toLocaleString("en-IN", {
                                        minimumFractionDigits: 0,
                                        maximumFractionDigits: 0,
                                      })}
                                    </div>
                                    <div className="text-[10px] text-gray-500">
                                      {t("PRODUCTS.FINAL_PRICE")}
                                    </div>
                                  </div>

                                  {isEditing ? (
                                    <>
                                      <button
                                        onClick={() =>
                                          handleSaveInventory(
                                            selectedVariant.VariantID,
                                            inv.StoreID,
                                          )
                                        }
                                        disabled={saving}
                                        className="p-0.5 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors disabled:opacity-50"
                                        title="Save"
                                      >
                                        {saving ? (
                                          <div className="h-3 w-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                          <Check className="h-4 w-4" />
                                        )}
                                      </button>
                                      <button
                                        onClick={handleCancelEdit}
                                        disabled={saving}
                                        className="p-0.5 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                                        title="Cancel"
                                      >
                                        <XIcon className="h-4 w-4" />
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => handleEditInventory(inv)}
                                      disabled={!hasEditStoreInventoryPermission}
                                      className="p-0.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      title={hasEditStoreInventoryPermission ? "Edit" : t("COMMON.NO_PERMISSION")}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Editable Fields */}
                              <div className="grid grid-cols-3 gap-1.5 mt-2">
                                {/* Quantity */}
                                <div className="bg-gray-50 rounded p-1.5">
                                  <div className="flex items-center gap-1 mb-0.5">
                                    <ShoppingBag className="h-2.5 w-2.5 text-gray-500" />
                                    <span className="text-[10px] text-gray-600">
                                      {t("INVENTORY.QUANTITY")}
                                    </span>
                                  </div>
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      min="0"
                                      value={editedInventory.Quantity || 0}
                                      onChange={(e) =>
                                        setEditedInventory((prev) => ({
                                          ...prev,
                                          Quantity: e.target.value,
                                        }))
                                      }
                                      className="w-full px-1.5 py-0.5 text-xs font-semibold text-gray-900 bg-white border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                  ) : (
                                    <div className="text-xs font-semibold text-gray-900">
                                      {inv.Quantity || 0}
                                    </div>
                                  )}
                                </div>

                                {/* Selling Price - Now calculated from MRP and discount */}
                                <div className="bg-gray-50 rounded p-1.5">
                                  <div className="flex items-center gap-1 mb-0.5">
                                    <span className="text-[10px] text-gray-600">
                                      ₹ {t("INVENTORY.SELLING_PRICE")}
                                    </span>
                                    <span className="text-[8px] text-blue-600 bg-blue-100 px-1 rounded">
                                      {t("INVENTORY.CALCULATED")}
                                    </span>
                                  </div>
                                  <div className="text-xs font-semibold text-gray-900">
                                    ₹
                                    {isEditing
                                      ? getDiscountedPrice(
                                          mrp,
                                          editedInventory.DiscountPercentage ||
                                            0,
                                        ).toLocaleString("en-IN")
                                      : inv.SellingPrice?.toLocaleString(
                                          "en-IN",
                                        )}
                                  </div>
                                  {isEditing && (
                                    <div className="text-[8px] text-gray-500">
                                      {t("PRODUCT_CREATION.MRP")}: ₹
                                      {mrp.toLocaleString("en-IN")}
                                    </div>
                                  )}
                                </div>

                                {/* Discount */}
                                <div className="bg-gray-50 rounded p-1.5">
                                  <div className="flex items-center gap-1 mb-0.5">
                                    <Percent className="h-2.5 w-2.5 text-gray-500" />
                                    <span className="text-[10px] text-gray-600">
                                      {t("INVENTORY.DISCOUNT")}
                                    </span>
                                  </div>
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.1"
                                      value={
                                        editedInventory.DiscountPercentage || 0
                                      }
                                      onChange={(e) =>
                                        setEditedInventory((prev) => ({
                                          ...prev,
                                          DiscountPercentage: e.target.value,
                                        }))
                                      }
                                      className="w-full px-1.5 py-0.5 text-xs font-medium text-gray-900 bg-white border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                  ) : inv.DiscountPercentage ? (
                                    <div>
                                      <div className="text-xs font-medium text-green-700">
                                        {inv.DiscountPercentage}%
                                      </div>
                                      <div className="text-[10px] text-gray-500">
                                        {t("COMMON.SAVE")}: ₹
                                        {(
                                          (mrp * inv.DiscountPercentage) /
                                          100
                                        ).toLocaleString("en-IN")}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-[10px] text-gray-500 italic">
                                      {t("COMMON.NO_DISCOUNT")}
                                    </div>
                                  )}
                                  {isEditing &&
                                    editedInventory.DiscountPercentage > 0 && (
                                      <div className="text-[8px] text-green-600 mt-0.5">
                                        {t("COMMON.SAVE")}: ₹
                                        {(
                                          (mrp *
                                            (editedInventory.DiscountPercentage ||
                                              0)) /
                                          100
                                        ).toLocaleString("en-IN")}
                                      </div>
                                    )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Editing Instructions */}
                    {editingInventoryId && (
                      <div className="mt-2 p-1.5 bg-blue-50 border border-blue-200 rounded">
                        <div className="flex items-start gap-1">
                          <div className="p-0.5 bg-blue-100 rounded">
                            <Edit className="h-3 w-3 text-blue-600" />
                          </div>
                          <div className="text-[10px] text-blue-800">
                            <p className="font-medium">
                              {t("INVENTORY.EDITING_MODE_ACTIVE")}
                            </p>
                            <p className="text-blue-700">
                              {t("INVENTORY.EDITING_INSTRUCTIONS")}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white px-6 py-2 border-t border-gray-200 flex justify-between items-center">
          <div className="text-[10px] text-gray-600">
            {productData?.Variants?.length || 0} {t("PRODUCTS.VARIANTS")}
            {selectedVariant &&
              inventoryPanelOpen &&
              ` • ${selectedVariant.Inventory?.length || 0} ${t("INVENTORY.INVENTORY_LOCATIONS")}`}
            {editingInventoryId && ` • ${t("COMMON.EDITING")}`}
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={onClose}
              className="px-3 py-1 border border-gray-300 text-gray-700 text-xs rounded hover:bg-gray-50 transition-colors font-medium"
            >
              {t("COMMON.CLOSE")}
            </button>
          </div>
        </div>
      </div>

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

      {storeStatusPopup.open && (
        <FullscreenErrorPopup
          title={t("PRODUCTS.CONFIRM_STATUS_TITLE")}
          message={
            storeStatusPopup.newStatus
              ? t("PRODUCTS.CONFIRM_ACTIVATE_INVENTORY")
              : t("PRODUCTS.CONFIRM_DEACTIVATE_INVENTORY")
          }
          onClose={handleStoreStatusPopupClose}
          onConfirm={handleStoreStatusConfirm}
          isSubmitting={bSubmitting}
        />
      )}
    </div>
  );
};

export default ProductVariantsPopup;
