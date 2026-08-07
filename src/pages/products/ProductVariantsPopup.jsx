import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { apiGet, apiPut, apiPatch } from "../../utils/ApiUtils.jsx";
import {
  GET_INVENTORY_VARIANTS,
  UPDATE_STORE_INVENTORY,
  UPDATE_STORE_INVENTORY_STATUS,
  UPDATE_PRODUCT_VARIANT_STATUS,
} from "../../contants/apiRoutes.jsx";
import noImage from "../../../assets/images/missing-pictur.jpg";
const SkeletonLoader = lazy(() => import("../../components/SkeletonLoader"));
const Loader = lazy(() => import("../../components/Loader"));
import { SKELETON_TYPES, LOCALES } from "../../contants/constants.jsx";
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
const Switch = lazy(() => import("../../components/Switch.jsx"));
const FullscreenErrorPopup = lazy(() => import("../../components/FullscreenErrorPopup"));
import { STATUS, MODULES, PERMISSIONS, FILTER_VALUES } from "../../contants/constants.jsx";
import { showEmsg } from "../../utils/ShowEmsg";
import { getPermissionCode, hasPermissionId } from "../../utils/permissionUtils";
const ProductVariantsPopup = ({ productId, groupByAttributeValue, onClose }) => {
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
  const [mobileExpandedVariantId, setMobileExpandedVariantId] = useState(null);
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

      const params = {};
      const groupBySegment = groupByAttributeValue || FILTER_VALUES.ALL;
      const url = `${GET_INVENTORY_VARIANTS}/${productId}/${groupBySegment}`;
      const response = await apiGet(
        url,
        params,
        token,
      );

      if (!isMounted.current) return;

      if (response.data.status.toUpperCase() === STATUS.SUCCESS?.toUpperCase()) {
        // The API returns a flat array of variant objects directly.
        const raw = response.data.data;
        const variants = Array.isArray(raw) ? raw : [];

        // Derive a product name from the first variant if available, or fall
        // back to a placeholder (the endpoint doesn't return product-level fields).
        const normalised = {
          ProductName: productData?.ProductName || "",
          BrandName: productData?.BrandName || "",
          CategoryName: productData?.CategoryName || "",
          Variants: variants.map((v) => ({
            VariantID: v.ProductVariantID,
            MRP: v.MRP,
            IsActive: v.IsActive,
            // Use TotalQuantity (new field name)
            Quantity: v.TotalQuantity ?? v.Quantity ?? 0,
            SKU: v.SKU || "",
            Attributes: v.Attributes || [],
            ProductVariantImages: v.ProductVariantImages || [],
            // StoreID is an array of IDs; build a minimal Inventory array so
            // the existing inventory panel renders store count correctly.
            Inventory: Array.isArray(v.StoreID)
              ? v.StoreID.map((id) => ({ StoreID: id, StoreName: "", Quantity: 0, IsActive: true }))
              : (v.Inventory || []),
          })),
        };

        setProductData(normalised);

        // Preserve selected variant with updated data
        if (selectedVariant) {
          const updatedVariant = normalised.Variants?.find(
            (v) => v.VariantID === selectedVariant.VariantID,
          );
          setSelectedVariant(updatedVariant || null);
          setEditingInventoryId(null);
          setEditedInventory({});
        }

        setError(null);
      } else {
        setError(response.data.message || t("COMMON.API_ERROR"));
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

  const getTotalStock = (inventory, variantQuantity) => {
    // If the variant carries its own total quantity (from TotalQuantity), use it.
    if (variantQuantity !== undefined && variantQuantity !== null) {
      return variantQuantity;
    }
    if (!Array.isArray(inventory) || inventory.length === 0) {
      return 0;
    }
    return inventory.reduce((total, item) => total + (item.Quantity || 0), 0);
  };

  const getDiscountedPrice = (mrp, discountPercentage) => {
    const safeMrp = parseFloat(mrp) || 0;
    const safeDiscount = parseFloat(discountPercentage) || 0;
    if (safeMrp <= 0) return 0;
    if (safeDiscount <= 0) return safeMrp;
    const calculated = safeMrp - (safeMrp * safeDiscount) / 100;
    // Never let the calculated price drop to 0 or below
    return calculated > 0 ? calculated : safeMrp;
  };

  // Returns the selling price to display in view mode (non-editing).
  // Prefers the stored SellingPrice from the API if it is positive,
  // otherwise falls back to calculating from MRP and discount.
  const getDisplaySellingPrice = (inv, mrp) => {
    if (inv.SellingPrice && inv.SellingPrice > 0) return inv.SellingPrice;
    const calculated = getDiscountedPrice(mrp, inv.DiscountPercentage);
    return calculated > 0 ? calculated : (parseFloat(mrp) || 0);
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

      if (response.data.status.toUpperCase() === STATUS.SUCCESS?.toUpperCase()) {
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

      // Guard: MRP must be set and final price must be positive
      if (!mrp || mrp <= 0) {
        showEmsg(t("INVENTORY.MRP_MUST_BE_POSITIVE"), STATUS.ERROR?.toLowerCase());
        setSaving(false);
        return;
      }
      if (calculatedSellingPrice <= 0) {
        showEmsg(t("INVENTORY.FINAL_PRICE_MUST_BE_POSITIVE"), STATUS.ERROR?.toLowerCase());
        setSaving(false);
        return;
      }

      const response = await apiPut(UPDATE_STORE_INVENTORY, payload, token);

      if (response.data.status.toUpperCase() === STATUS.SUCCESS?.toUpperCase()) {
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

  // Validates that the entered discount keeps the final price > 0.
  // Caps the discount at 99.99 so the price is always at least 0.01 Ã— MRP.
  const handleDiscountChange = (rawValue, mrp) => {
    let discount = parseFloat(rawValue);
    if (isNaN(discount) || discount < 0) discount = 0;

    const safeMrp = parseFloat(mrp) || 0;
    const maxDiscount = safeMrp > 0 ? 99.99 : 0;

    if (discount >= 100) {
      showEmsg(t("INVENTORY.DISCOUNT_MAKES_PRICE_ZERO"), STATUS.ERROR?.toLowerCase());
      discount = maxDiscount;
    } else if (safeMrp > 0) {
      const finalPrice = safeMrp - (safeMrp * discount) / 100;
      if (finalPrice <= 0) {
        showEmsg(t("INVENTORY.DISCOUNT_MAKES_PRICE_ZERO"), STATUS.ERROR?.toLowerCase());
        discount = maxDiscount;
      }
    }

    setEditedInventory((prev) => ({ ...prev, DiscountPercentage: String(discount) }));
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

      if (response.data.status.toUpperCase() === STATUS.SUCCESS?.toUpperCase()) {
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
      totalStock += getTotalStock(variant.Inventory || [], variant.Quantity);
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
    <Suspense fallback={<div className="flex items-center justify-center fixed inset-0 bg-black/70 backdrop-blur-sm z-50"><div className="text-center"><Loader /></div></div>}>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-1 sm:p-2 animate-fadeIn">
        <div
          className={`bg-white rounded-lg shadow-2xl w-full max-h-[98vh] sm:max-h-[95vh] overflow-hidden animate-slideUp flex flex-col ${
            inventoryPanelOpen ? "max-w-8xl" : "max-w-6xl"
          }`}
        >
        {/* Header */}
        <div className="flex-shrink-0 bg-custom-bg/20 px-3 sm:px-4 md:px-6 py-2 sm:py-3 border-b border-gray-200 flex justify-between items-start sm:items-center">
          <div className="flex items-start sm:items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
            <div className="p-1 sm:p-1.5 bg-white rounded-md shadow-xs flex-shrink-0">
              <Package className="h-4 w-4 sm:h-5 sm:w-5 text-custom-bg" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                {productData?.ProductName || "Product Details"}
              </h2>
              <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-0.5">
                <div className="flex items-center gap-0.5 sm:gap-1">
                  <Tag className="h-2 w-2 sm:h-2.5 sm:w-2.5 text-gray-500" />
                  <span className="text-[9px] sm:text-[10px] text-gray-600">
                    {t("PRODUCTS.PRODUCT_ID")}: {productId?.substring(0, 6)}...
                  </span>
                </div>
                <div className="hidden sm:flex items-center gap-1">
                  <Store className="h-2.5 w-2.5 text-gray-500" />
                  <span className="text-[10px] text-gray-600">
                    {productData?.BrandName}
                  </span>
                </div>
                <div className="hidden md:flex items-center gap-1">
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
            className="p-0.5 sm:p-1 hover:bg-white rounded-md transition-all duration-200 flex-shrink-0 ml-1"
            title="Close"
          >
            <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-500 hover:text-gray-700" />
          </button>
        </div>

        {/* Summary Cards - Compact */}
        {!loading && !error && (
          <div className="px-2 sm:px-4 md:px-6 pt-1.5 pb-0 flex-shrink-0">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-1.5">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-1 sm:p-1.5 rounded border border-blue-200">
                <div className="flex items-center gap-1">
                  <div className="p-0.5 bg-blue-100 rounded flex-shrink-0">
                    <Package className="h-3 w-3 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] sm:text-[10px] text-blue-700 font-medium truncate">
                      {t("ADD_VARIANT.TOTAL_VARIANTS")}
                    </p>
                    <p className="text-xs font-bold text-blue-900">
                      {summary.variantCount}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-green-100 p-1 sm:p-1.5 rounded border border-green-200">
                <div className="flex items-center gap-1">
                  <div className="p-0.5 bg-green-100 rounded flex-shrink-0">
                    <Store className="h-3 w-3 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] sm:text-[10px] text-green-700 font-medium truncate">
                      {t("PRODUCTS.TOTAL_STOCK")}
                    </p>
                    <p className="text-xs font-bold text-green-900">
                      {summary.totalStock}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-1 sm:p-1.5 rounded border border-purple-200">
                <div className="flex items-center gap-1">
                  <div className="p-0.5 bg-purple-100 rounded flex-shrink-0">
                    <Store className="h-3 w-3 text-purple-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] sm:text-[10px] text-purple-700 font-medium truncate">
                      {t("INVENTORY.STORE_LOCATIONS")}
                    </p>
                    <p className="text-xs font-bold text-purple-900">
                      {summary.totalStores}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-1 sm:p-1.5 rounded border border-amber-200">
                <div className="flex items-center gap-1">
                  <div className="p-0.5 bg-amber-100 rounded flex-shrink-0">
                    <Tag className="h-3 w-3 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] sm:text-[10px] text-amber-700 font-medium truncate">
                      {t("INVENTORY.AVG_MRP")}
                    </p>
                    <p className="text-xs font-bold text-amber-900">
                      ₹
                      {summary.totalMRP.toLocaleString(LOCALES.ENGLISH_INDIA, {
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

        {/* ── MOBILE VIEW: two-screen navigation ──────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-y-auto sm:hidden">
          {/* Mobile: Inventory Detail screen */}
          {mobileExpandedVariantId && (() => {
            const variant = productData?.Variants?.find(v => v.VariantID === mobileExpandedVariantId);
            if (!variant) return null;
            const variantIndex = productData.Variants.findIndex(v => v.VariantID === mobileExpandedVariantId);
            return (
              <div className="flex flex-col h-full">
                {/* Back header */}
                <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-200 flex-shrink-0">
                  <button
                    onClick={() => { setMobileExpandedVariantId(null); setEditingInventoryId(null); setEditedInventory({}); }}
                    className="flex items-center gap-1.5 text-blue-600 text-sm font-medium"
                  >
                    <ChevronRight className="h-4 w-4 rotate-180" />
                    {t("NOTFOUND.GO_BACK")}
                  </button>
                  <span className="text-gray-300">|</span>
                  <span className="text-xs font-semibold text-gray-700 truncate">
                    {t("PRODUCT_CREATION.VARIANT")} #{variantIndex + 1}
                    {variant.Attributes?.length > 0 && ` — ${variant.Attributes.map(a => a.Value).join(", ")}`}
                  </span>
                </div>
                {/* Inventory list */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    {t("PRODUCTS.STORE_INVENTORY")} — {(variant.Inventory || []).length} {t("INVENTORY.STORE_LOCATIONS")}
                  </p>
                  {(variant.Inventory || []).length === 0 ? (
                    <div className="text-center py-8">
                      <Store className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-xs text-gray-400">{t("INVENTORY.NO_STORE_INVENTORY")}</p>
                    </div>
                  ) : (
                    (variant.Inventory || []).map((inv, i) => {
                      const isEditing = editingInventoryId === inv.StoreID;
                      const isInvActive = inv.IsActive !== undefined ? inv.IsActive : true;
                      const mrp = variant.MRP || 0;
                      const discountPct = isEditing
                        ? parseFloat(editedInventory.DiscountPercentage) || 0
                        : inv.DiscountPercentage || 0;
                      const rawFinalPrice = isEditing
                        ? getDiscountedPrice(mrp, discountPct)
                        : getDisplaySellingPrice(inv, mrp);
                      // Final price must always be positive
                      const finalPrice = rawFinalPrice > 0 ? rawFinalPrice : mrp;
                      return (
                        <div
                          key={`mob-${inv.StoreID}-${i}`}
                          className={`rounded-xl border bg-white overflow-hidden transition-all ${isInvActive ? "border-green-200" : "border-gray-200"} ${isEditing ? "ring-2 ring-blue-300" : ""}`}
                        >
                          {/* Store row: name + badge + toggle */}
                          <div className={`flex items-center justify-between px-3 py-2 ${isInvActive ? "bg-green-50" : "bg-gray-50"}`}>
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className={`p-1 rounded-full flex-shrink-0 ${isInvActive ? "bg-green-100" : "bg-gray-200"}`}>
                                <MapPin className={`h-3 w-3 ${isInvActive ? "text-green-600" : "text-gray-500"}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-gray-900 truncate leading-tight">{inv.StoreName || `Store ${i + 1}`}</p>
                                <p className="text-[9px] text-gray-400 leading-tight">{inv.StoreID?.substring(0, 8)}...</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${isInvActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                                {isInvActive ? t("COMMON.ACTIVE") : t("COMMON.INACTIVE")}
                              </span>
                              <div onClick={e => e.stopPropagation()}>
                                <Switch
                                  checked={isInvActive}
                                  onChange={() => handleToggleActive(inv.StoreID, variant.VariantID, isInvActive)}
                                  size="sm" label=""
                                  disableTooltip={true}
                                  disabled={!hasUpdateStoreInventoryStatusPermission}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Stats row: Quantity | Selling Price | Final Price | Discount */}
                          <div className="grid grid-cols-4 divide-x divide-gray-100 border-t border-gray-100">
                            <div className="p-2 text-center">
                              <p className="text-[9px] text-gray-400 mb-0.5">{t("INVENTORY.QUANTITY")}</p>
                              {isEditing ? (
                                <input type="number" min="0"
                                  value={editedInventory.Quantity ?? 0}
                                  onChange={e => setEditedInventory(p => ({ ...p, Quantity: e.target.value }))}
                                  className="w-full text-center px-1 py-0.5 text-xs font-bold text-gray-900 bg-white border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              ) : (
                                <p className="text-xs font-bold text-gray-900">{inv.Quantity ?? 0}</p>
                              )}
                            </div>
                            <div className="p-2 text-center bg-gray-50/60">
                              <div className="flex items-center justify-center gap-0.5 mb-0.5">
                                <p className="text-[9px] text-gray-400">{t("INVENTORY.SELLING_PRICE")}</p>
                                <span className="text-[7px] text-blue-500 bg-blue-50 px-0.5 rounded leading-tight">{t("INVENTORY.CALCULATED")}</span>
                              </div>
                              <p className="text-xs font-bold text-gray-800">
                                ₹{(isEditing
                                  ? getDiscountedPrice(mrp, parseFloat(editedInventory.DiscountPercentage) || 0)
                                  : getDisplaySellingPrice(inv, mrp)
                                ).toLocaleString(LOCALES.ENGLISH_INDIA, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </p>
                            </div>
                            <div className="p-2 text-center bg-blue-50/40">
                              <p className="text-[9px] text-blue-500 mb-0.5">{t("PRODUCTS.FINAL_PRICE")}</p>
                              <p className="text-xs font-bold text-blue-700">
                                ₹{finalPrice.toLocaleString(LOCALES.ENGLISH_INDIA, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </p>
                            </div>
                            <div className="p-2 text-center">
                              <p className="text-[9px] text-gray-400 mb-0.5">{t("INVENTORY.DISCOUNT")}</p>
                              {isEditing ? (
                                <input type="number" min="0" max="99.99" step="0.1"
                                  value={editedInventory.DiscountPercentage ?? 0}
                                  onChange={e => handleDiscountChange(e.target.value, mrp)}
                                  className="w-full text-center px-1 py-0.5 text-xs font-bold text-gray-900 bg-white border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              ) : (
                                <p className="text-xs font-bold text-green-700">{inv.DiscountPercentage ? `${inv.DiscountPercentage}%` : "—"}</p>
                              )}
                            </div>
                          </div>

                          {/* Action row */}
                          <div className="flex justify-end gap-2 px-3 py-2 border-t border-gray-100">
                            {isEditing ? (
                              <>
                                <button onClick={() => handleSaveInventory(variant.VariantID, inv.StoreID)} disabled={saving}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white text-xs font-medium rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors">
                                  {saving ? <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="h-3 w-3" />}
                                  {t("COMMON.SAVE")}
                                </button>
                                <button onClick={handleCancelEdit} disabled={saving}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors">
                                  <XIcon className="h-3 w-3" />
                                  {t("COMMON.CANCEL")}
                                </button>
                              </>
                            ) : (
                              <button onClick={() => handleEditInventory(inv)} disabled={!hasEditStoreInventoryPermission}
                                className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                <Edit className="h-3 w-3" />
                                {t("COMMON.EDIT")}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })()}

          {/* Mobile: Variants list screen */}
          {!mobileExpandedVariantId && (
            <div>
              {error ? (
                <div className="text-center py-10 px-4">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-red-100 mb-2">
                    <X className="h-5 w-5 text-red-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">{t("PRODUCTS.ERROR_LOADING_DETAILS")}</h3>
                  <p className="text-xs text-gray-600">{error}</p>
                </div>
              ) : loading ? (
                <div className="p-3 space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="rounded-xl border border-gray-200 p-3 animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 bg-gray-200 rounded-lg flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-gray-200 rounded w-1/2" />
                          <div className="h-2 bg-gray-200 rounded w-3/4" />
                          <div className="h-2 bg-gray-200 rounded w-1/3" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !productData?.Variants?.length ? (
                <div className="text-center py-10 px-4">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 mb-2">
                    <Package className="h-5 w-5 text-gray-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">{t("INVENTORY.NO_VARIANTS_FOUND")}</h3>
                  <p className="text-xs text-gray-600">{t("INVENTORY.NO_VARIANTS_CONFIGURED")}</p>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {productData.Variants.map((variant, index) => {
                    const totalStock = getTotalStock(variant.Inventory || [], variant.Quantity);
                    const storeCount = variant.Inventory?.length || 0;
                    return (
                      <div key={variant.VariantID} className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                        <div className="flex items-center gap-3 p-3">
                          {/* Image */}
                          <img
                            src={getVariantImage(variant)}
                            alt={`Variant ${index + 1}`}
                            className="h-12 w-12 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                            onError={e => { e.target.onerror = null; e.target.src = noImage; }}
                          />
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-xs font-bold text-gray-900">{t("PRODUCT_CREATION.VARIANT")} #{index + 1}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${variant.IsActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                                {variant.IsActive ? t("COMMON.ACTIVE") : t("COMMON.INACTIVE")}
                              </span>
                            </div>
                            {variant.Attributes?.length > 0 && (
                              <p className="text-[10px] text-gray-500 truncate">{variant.Attributes.map(a => `${a.Name}: ${a.Value}`).join(" • ")}</p>
                            )}
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs font-semibold text-gray-800">₹{variant.MRP?.toLocaleString(LOCALES.ENGLISH_INDIA)}</span>
                              <span className="text-[10px] text-gray-500">{totalStock} {t("PRODUCTS.STOCK")} • {storeCount} {t("SIDEBAR.STORES")}</span>
                            </div>
                          </div>
                          {/* Status toggle — stop propagation so it doesn't navigate */}
                          <div className="flex items-center flex-shrink-0" onClick={e => e.stopPropagation()}>
                            <Switch
                              checked={variant.IsActive}
                              onChange={() => handleVariantStatusChange(variant.VariantID, variant.IsActive)}
                              disabled={!hasUpdateProductVariantStatusPermission}
                              disableTooltip={true}
                              size="sm"
                            />
                          </div>
                          {/* Navigate to inventory */}
                          <button
                            onClick={(e) => { e.stopPropagation(); setMobileExpandedVariantId(variant.VariantID); }}
                            className="flex items-center justify-center h-8 w-8 ml-3 rounded-lg bg-gray-100 hover:bg-blue-100 text-gray-500 hover:text-blue-600 transition-colors flex-shrink-0"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── DESKTOP VIEW: split panel table ──────────────────────────── */}
        <div className="hidden sm:flex flex-row flex-1 min-h-0">
          {/* Left Panel - Variants Table */}
          <div
            className={`transition-all duration-300 flex-1 min-h-0 ${
              inventoryPanelOpen ? "w-7/12 flex-shrink-0" : "w-full"
            }`}
          >
            <div className="h-full overflow-y-auto">
              {error ? (
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
                          {loading ? (
                            <SkeletonLoader type={SKELETON_TYPES.VARIANT_INVENTORY_TABLE} rows={5} />
                          ) : (
                            productData?.Variants?.map((variant, index) => {
                            const totalStock = getTotalStock(
                              variant.Inventory || [],
                              variant.Quantity,
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
                                    <div className="text-xs font-medium text-gray-900 whitespace-nowrap">
                                      {t("PRODUCT_CREATION.VARIANT")} #
                                      {index + 1}
                                    </div>
                                    {variant.Attributes?.length > 0 && (
                                      <div className="text-[10px] text-gray-500 max-w-[80px] sm:max-w-none truncate sm:whitespace-normal">
                                        {variant.Attributes.map(
                                          (attr) =>
                                            `${attr.Name}: ${attr.Value}`,
                                        ).join(", ")}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="table-cell text-center align-middle">
                                  <div className="flex justify-center">
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
                                    <div className="text-xs font-semibold text-gray-900 whitespace-nowrap">
                                      ₹{variant.MRP?.toLocaleString(LOCALES.ENGLISH_INDIA)}
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
                                    <div className="text-[10px] text-gray-500 whitespace-nowrap">
                                      {storeCount} {t("SIDEBAR.STORES")}
                                    </div>
                                  </div>
                                </td>
                                <td className="table-cell text-center align-middle">
                                  <div className="flex justify-center">
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
                                <td className="px-2 sm:px-3 py-2">
                                  <button
                                    onClick={() => openInventoryPanel(variant)}
                                    className={`inline-flex items-center px-1.5 sm:px-2 py-1 text-xs font-medium rounded transition-all duration-200 ${
                                      selectedVariant?.VariantID ===
                                        variant.VariantID && inventoryPanelOpen
                                        ? "bg-blue-100 text-blue-700 ring-1 ring-blue-200"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    }`}
                                  >
                                    <ChevronRight className="h-3 w-3" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {!loading && (!productData?.Variants ||
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

          {/* Right Panel - Inventory Details (desktop) */}
          {inventoryPanelOpen && selectedVariant && (
            <div className="w-5/12 border-l border-gray-200 animate-slideRight flex-shrink-0 flex flex-col min-h-0">
              <div className="h-full flex flex-col">
                {/* Inventory Panel Header */}
                <div className="px-3 sm:px-4 py-2 border-b border-gray-200 bg-gray-50 flex justify-between items-center flex-shrink-0">
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
                  <div className="px-3 sm:px-4 py-2">
                    {/* Variant Status Switch */}
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="text-xs font-medium text-gray-900">
                          {t("PRODUCTS.STORE_INVENTORY")}
                        </h4>
                        <p className="text-[10px] text-gray-500">
                          {(selectedVariant.Inventory || []).length} locations •
                          Total:{" "}
                          {getTotalStock(selectedVariant.Inventory || [], selectedVariant.Quantity)} units
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
                          const rawFinalPrice = isEditing
                            ? getDiscountedPrice(mrp, discountPercentage)
                            : getDisplaySellingPrice(inv, mrp);
                          // Final price must always be positive
                          const finalPrice = rawFinalPrice > 0 ? rawFinalPrice : mrp;

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
                              <div className="flex justify-between items-start mb-2 gap-1">
                                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                  <div
                                    className={`p-1 rounded flex-shrink-0 ${
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
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-1">
                                      <h5 className="text-xs font-medium text-gray-900 truncate">
                                        {inv.StoreName || `Store ${index + 1}`}
                                      </h5>
                                      <span
                                        className={`px-1 py-0.5 text-[9px] font-medium rounded-full flex-shrink-0 ${
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
                                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                                  <div>
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

                                  <div className="text-right">
                                    <div className="text-xs sm:text-sm font-bold text-blue-600 whitespace-nowrap">
                                      ₹
                                      {finalPrice.toLocaleString(LOCALES.ENGLISH_INDIA, {
                                        minimumFractionDigits: 0,
                                        maximumFractionDigits: 0,
                                      })}
                                    </div>
                                    <div className="text-[9px] sm:text-[10px] text-gray-500">
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
                              <div className="grid grid-cols-3 gap-1 sm:gap-1.5 mt-2">
                                {/* Quantity */}
                                <div className="bg-gray-50 rounded p-1 sm:p-1.5">
                                  <div className="flex items-center gap-0.5 sm:gap-1 mb-0.5">
                                    <ShoppingBag className="h-2.5 w-2.5 text-gray-500 flex-shrink-0" />
                                    <span className="text-[9px] sm:text-[10px] text-gray-600 truncate">
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
                                      className="w-full px-1 py-0.5 text-xs font-semibold text-gray-900 bg-white border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                  ) : (
                                    <div className="text-xs font-semibold text-gray-900">
                                      {inv.Quantity || 0}
                                    </div>
                                  )}
                                </div>

                                {/* Selling Price - Now calculated from MRP and discount */}
                                <div className="bg-gray-50 rounded p-1 sm:p-1.5">
                                  <div className="flex items-center gap-0.5 sm:gap-1 mb-0.5 flex-wrap">
                                    <span className="text-[9px] sm:text-[10px] text-gray-600">
                                      ₹ {t("INVENTORY.SELLING_PRICE")}
                                    </span>
                                    <span className="text-[8px] text-blue-600 bg-blue-100 px-0.5 rounded">
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
                                        ).toLocaleString(LOCALES.ENGLISH_INDIA)
                                      : getDisplaySellingPrice(inv, mrp).toLocaleString(
                                          LOCALES.ENGLISH_INDIA,
                                        )}
                                  </div>
                                  {isEditing && (
                                    <div className="text-[8px] text-gray-500">
                                      {t("PRODUCT_CREATION.MRP")}: ₹
                                      {mrp.toLocaleString(LOCALES.ENGLISH_INDIA)}
                                    </div>
                                  )}
                                </div>

                                {/* Discount */}
                                <div className="bg-gray-50 rounded p-1 sm:p-1.5">
                                  <div className="flex items-center gap-0.5 sm:gap-1 mb-0.5">
                                    <Percent className="h-2.5 w-2.5 text-gray-500 flex-shrink-0" />
                                    <span className="text-[9px] sm:text-[10px] text-gray-600 truncate">
                                      {t("INVENTORY.DISCOUNT")}
                                    </span>
                                  </div>
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      min="0"
                                      max="99.99"
                                      step="0.1"
                                      value={
                                        editedInventory.DiscountPercentage || 0
                                      }
                                      onChange={(e) =>
                                        handleDiscountChange(e.target.value, mrp)
                                      }
                                      className="w-full px-1 py-0.5 text-xs font-medium text-gray-900 bg-white border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                                        ).toLocaleString(LOCALES.ENGLISH_INDIA)}
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
                                        ).toLocaleString(LOCALES.ENGLISH_INDIA)}
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
                          <div className="p-0.5 bg-blue-100 rounded flex-shrink-0">
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
        </div>{/* end desktop split */}

        {/* Footer */}
        <div className="flex-shrink-0 bg-white px-3 sm:px-6 py-2 border-t border-gray-200 flex flex-wrap justify-between items-center gap-1">
          <div className="text-[10px] text-gray-600 truncate max-w-[60%]">
            {productData?.Variants?.length || 0} {t("PRODUCTS.VARIANTS")}
            {selectedVariant && inventoryPanelOpen && ` • ${selectedVariant.Inventory?.length || 0} ${t("INVENTORY.INVENTORY_LOCATIONS")}`}
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
    </Suspense>
  );
};

export default ProductVariantsPopup;
