import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { apiGet, apiPut, apiPatch } from "../../utils/ApiUtils.jsx";
import { GET_PRODUCT_VARIANT, UPDATE_STORE_INVENTORY, UPDATE_STORE_INVENTORY_STATUS } from "../../contants/apiRoutes";
const Loader = lazy(() => import("../../components/Loader"));
import { STATUS, MODULES, PERMISSIONS, LOCALES } from "../../contants/constants.jsx";
import {
  X,
  Package,
  Store,
  Tag,
  BarChart3,
  MapPin,
  ShoppingBag,
  DollarSign,
  Percent,
  Edit,
  Check,
  X as XIcon,
  Search,
} from "lucide-react";
import { showEmsg } from "../../utils/ShowEmsg";
const Switch = lazy(() => import("../../components/Switch.jsx"));
const FullscreenErrorPopup = lazy(() => import("../../components/FullscreenErrorPopup"));
import { getPermissionCode, hasPermissionId } from "../../utils/permissionUtils";
const ProductStoreInventoryPopup = ({ productVariantId, onClose }) => {
  const { t } = useTranslation();
  const [inventoryData, setInventoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [variantInfo, setVariantInfo] = useState(null);
  const [editingInventoryId, setEditingInventoryId] = useState(null);
  const [editedInventory, setEditedInventory] = useState({});
  const [saving, setSaving] = useState(false);
  const [mrp, setMrp] = useState(0);
  const [storeStatusPopup, setStoreStatusPopup] = useState({
    open: false,
    storeId: null,
    newStatus: null,
  });
  const [bSubmitting, setSubmitting] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef(null);

  // Permission checks
  const permissionIdForEditStoreInventory = getPermissionCode(
    MODULES.INVENTORY,
    PERMISSIONS.EDIT_STORE_INVENTORY
  );
  const permissionIdForUpdateStoreInventoryStatus = getPermissionCode(
    MODULES.INVENTORY,
    PERMISSIONS.UPDATE_STORE_INVENTORY_STATUS
  );

  const hasEditStoreInventoryPermission = hasPermissionId(permissionIdForEditStoreInventory);
  const hasUpdateStoreInventoryStatusPermission = hasPermissionId(permissionIdForUpdateStoreInventoryStatus);

  // Debounce search text to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    const fetchStoreInventory = async () => {
      try {
        // Only show main loading for initial load, not for search
        if (!debouncedSearchText) {
          setLoading(true);
        } else {
          setIsSearching(true);
        }
        setError(null);
        const token = localStorage.getItem("token");
        
        const queryParams = {};
        if (debouncedSearchText.trim()) {
          queryParams.searchText = debouncedSearchText.trim();
        }
        
        const response = await apiGet(
          `${GET_PRODUCT_VARIANT}/${productVariantId}`,
          queryParams,
          token
        );

        if (response?.data?.status === STATUS.SUCCESS.toUpperCase()) {
          const data = response.data.data;
          // Handle typo in API response - "Invenory" instead of "Inventory"
          setInventoryData(data.Inventory || data.Invenory || []);
          setVariantInfo(data);
          setMrp(data.MRP || 0);
        } else {
          setError(response?.data?.message || t("COMMON.API_ERROR"), STATUS.ERROR.toLowerCase());
        }
      } catch (err) {
        setError(err?.response?.data?.message || t("COMMON.API_ERROR"), STATUS.ERROR.toLowerCase());
      } finally {
        setLoading(false);
        setIsSearching(false);
        // Keep focus on search input after results are loaded
        if (searchInputRef.current && debouncedSearchText) {
          setTimeout(() => {
            searchInputRef.current.focus();
          }, 100);
        }
      }
    };

    if (productVariantId) {
      fetchStoreInventory();
    }
  }, [productVariantId, debouncedSearchText, t]);

  // Refetch inventory data
  const refetchInventory = async () => {
    try {
      setIsSearching(true);
      const token = localStorage.getItem("token");
      
      const queryParams = {};
      if (debouncedSearchText.trim()) {
        queryParams.searchText = debouncedSearchText.trim();
      }
      
      const response = await apiGet(
        `${GET_PRODUCT_VARIANT}/${productVariantId}`,
        queryParams,
        token
      );

      if (response?.data?.status === STATUS.SUCCESS.toUpperCase()) {
        const data = response.data.data;
        // Handle typo in API response - "Invenory" instead of "Inventory"
        setInventoryData(data.Inventory || data.Invenory || []);
        setVariantInfo(data);
        setMrp(data.MRP || 0);
      }
    } catch (err) {
      showEmsg(err?.response?.data?.message || t("COMMON.API_ERROR"), ERROR?.toLowerCase());
    } finally {
      setIsSearching(false);
      // Keep focus on search input after refetch
      if (searchInputRef.current && debouncedSearchText) {
        setTimeout(() => {
          searchInputRef.current.focus();
        }, 100);
      }
    }
  };

  // Handle editing inventory
  const handleEditInventory = (inventory) => {
    if (!hasEditStoreInventoryPermission) {
      showEmsg(t("COMMON.NO_PERMISSION"), STATUS.ERROR);
      return;
    }
    setEditingInventoryId(inventory.StoreID);
    setEditedInventory({
      Quantity: parseInt(inventory.Quantity) || 0,
      DiscountPercentage: parseFloat(inventory.DiscountPercentage) || 0,
    });
  };

  // Handle saving inventory changes
  const handleSaveInventory = async (storeId) => {
    if (!hasEditStoreInventoryPermission) {
      showEmsg(t("COMMON.NO_PERMISSION"), STATUS.ERROR);
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem("token");

      // Calculate selling price from MRP and discount
      const discountPercentage = parseFloat(editedInventory.DiscountPercentage) || 0;
      const calculatedSellingPrice = getDiscountedPrice(mrp, discountPercentage);

      const payload = {
        ProductVariantID: productVariantId,
        StoreID: storeId,
        Quantity: parseInt(editedInventory.Quantity),
        SellingPrice: Math.round(calculatedSellingPrice), // Remove decimals
        DiscountPercentage: discountPercentage,
      };

      const response = await apiPut(UPDATE_STORE_INVENTORY, payload, token);

      if (response.data.status === STATUS.SUCCESS?.toUpperCase()) {
        // Optimistic update
        setInventoryData((prevData) => 
          prevData.map((inv) => {
            if (inv.StoreID === storeId) {
              return {
                ...inv,
                Quantity: payload.Quantity,
                SellingPrice: payload.SellingPrice,
                DiscountPercentage: payload.DiscountPercentage,
              };
            }
            return inv;
          })
        );

        showEmsg(t("INVENTORY.INVENTORY_UPDATED"), STATUS.SUCCESS?.toLowerCase());
        setEditingInventoryId(null);
        setEditedInventory({});

        // Refetch to ensure consistency
        await refetchInventory();
      } else {
        showEmsg(response.data.message, STATUS.ERROR?.toLowerCase());
      }
    } catch (err) {
      showEmsg(err?.response?.data?.message, STATUS.ERROR?.toLowerCase());
    } finally {
      setSaving(false);
    }
  };

  // Handle canceling edit
  const handleCancelEdit = () => {
    setEditingInventoryId(null);
    setEditedInventory({});
  };

  // Handle store status toggle
  const handleToggleActive = (storeId, currentStatus) => {
    if (!hasUpdateStoreInventoryStatusPermission) {
      showEmsg(t("COMMON.NO_PERMISSION"), STATUS.ERROR);
      return;
    }
    setStoreStatusPopup({
      open: true,
      storeId,
      newStatus: !currentStatus,
    });
  };

  // Handle store status confirmation
  const handleStoreStatusConfirm = async () => {
    if (bSubmitting) return;

    const { storeId, newStatus } = storeStatusPopup;

    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");

      const response = await apiPatch(
        `${UPDATE_STORE_INVENTORY_STATUS}/${storeId}/${productVariantId}`,
        { IsActive: newStatus },
        token
      );

      if (response.data.status === STATUS.SUCCESS?.toUpperCase()) {
        // Optimistic update
        setInventoryData((prevData) =>
          prevData.map((inv) =>
            inv.StoreID === storeId ? { ...inv, IsActive: newStatus } : inv
          )
        );

        showEmsg(t("INVENTORY.STORE_INVENTORY_UPDATED"), STATUS.SUCCESS?.toLowerCase());

        // Refetch to ensure consistency
        await refetchInventory();
      } else {
        showEmsg(response.data.message, STATUS.ERROR?.toLowerCase());
      }
    } catch (err) {
      showEmsg(
        err?.response?.data?.message,
        STATUS.ERROR?.toLowerCase()
      );
    } finally {
      setStoreStatusPopup({
        open: false,
        storeId: null,
        newStatus: null,
      });
      setSubmitting(false);
    }
  };

  // Handle store status popup close
  const handleStoreStatusPopupClose = () => {
    setStoreStatusPopup({
      open: false,
      storeId: null,
      newStatus: null,
    });
  };

  // Calculate discounted price from MRP and discount percentage
  const getDiscountedPrice = (mrp, discountPercentage) => {
    if (!discountPercentage || !mrp) return mrp || 0;
    return mrp - (mrp * discountPercentage) / 100;
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Use inventoryData directly since API filtering is handled server-side
  const filteredInventoryData = inventoryData;

  const calculateSummary = (inventory) => {
    if (!inventory || inventory.length === 0) {
      return { totalStock: 0, activeStores: 0, avgPrice: 0, totalValue: 0 };
    }

    let totalStock = 0;
    let activeStores = 0;
    let totalValue = 0;
    let priceSum = 0;
    let priceCount = 0;

    inventory.forEach((inv) => {
      const quantity = parseInt(inv.Quantity) || 0;
      const price = parseFloat(inv.SellingPrice) || 0;
      
      totalStock += quantity;
      if (inv.IsActive) activeStores++;
      
      totalValue += quantity * price;
      
      if (price > 0) {
        priceSum += price;
        priceCount++;
      }
    });

    return {
      totalStock,
      activeStores,
      avgPrice: priceCount > 0 ? priceSum / priceCount : 0,
      totalValue,
    };
  };

  const summary = calculateSummary(filteredInventoryData);

  return (
    <Suspense fallback={<div className="flex items-center justify-center fixed inset-0 bg-black/70 backdrop-blur-sm z-50"><div className="text-center"><Loader /></div></div>}>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-2 animate-fadeIn">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden animate-slideUp">
        {/* Header - Compact */}
        <div className="sticky top-0 bg-custom-bg/20 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white rounded-md shadow-xs">
              <Store className="h-5 w-5 text-custom-bg" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {t("PRODUCTS.STORE_INVENTORY")}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex items-center gap-1">
                  <Tag className="h-2.5 w-2.5 text-gray-500" />
                  <span className="text-[10px] text-gray-600">
                    {t("PRODUCTS.VARIANT_ID")}: {productVariantId?.substring(0, 8)}...
                  </span>
                </div>
                {editingInventoryId && (
                  <span className="text-[10px] text-amber-600 font-medium px-1 py-0.5 bg-amber-100 rounded">
                   {t("COMMON.EDITING")}
                  </span>
                )}
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
            {/* Search Bar */}
            <div className="mb-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={t("COMMON.SEARCH_STORES")}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  disabled={isSearching}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {searchText && !isSearching && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button
                      onClick={() => {
                        setSearchText("");
                        // Keep focus after clearing search
                        setTimeout(() => {
                          if (searchInputRef.current) {
                            searchInputRef.current.focus();
                          }
                        }, 50);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {isSearching && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              {searchText && (
                <div className="mt-1 text-xs text-gray-600">
                  {filteredInventoryData.length} stores found
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-2">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-1 rounded border border-blue-200">
                <div className="flex items-center gap-1">
                  <div className="p-0.5 bg-blue-100 rounded">
                    <Store className="h-3 w-3 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-blue-700 font-medium">
                      {searchText ? t("COMMON.FILTERED_STORES") : t("COMMON.TOTAL_STORES")}
                    </p>
                    <p className="text-xs font-bold text-blue-900">
                      {inventoryData.length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-green-100 p-1 rounded border border-green-200">
                <div className="flex items-center gap-1">
                  <div className="p-0.5 bg-green-100 rounded">
                    <ShoppingBag className="h-3 w-3 text-green-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-green-700 font-medium">
                      {t("COMMON.TOTAL_STOCK")}
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
                    <Package className="h-3 w-3 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-purple-700 font-medium">
                      {t("COMMON.ACTIVE_STORES")}
                    </p>
                    <p className="text-xs font-bold text-purple-900">
                      {summary.activeStores}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-1 rounded border border-amber-200">
                <div className="flex items-center gap-1">
                  <div className="p-0.5 bg-amber-100 rounded text-amber-600">
                       ₹ 
                  </div>
                  <div>
                    <p className="text-[10px] text-amber-700 font-medium">
                      {t("COMMON.AVG_PRICE")}
                    </p>
                    <p className="text-xs font-bold text-amber-900">
                      ₹{summary.avgPrice.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 p-1 rounded border border-indigo-200">
                <div className="flex items-center gap-1">
                  <div className="p-0.5 bg-indigo-100 rounded">
                    <Tag className="h-3 w-3 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-indigo-700 font-medium">
                      {t("PRODUCT_CREATION.MRP")}
                    </p>
                    <p className="text-xs font-bold text-indigo-900">
                      ₹{mrp.toLocaleString(LOCALES.ENGLISH_INDIA)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="h-[calc(95vh-140px)] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader size="medium" />
              <p className="mt-2 text-xs text-gray-600">
                {t("COMMON.LOADING_STORE_INVENTORY")}
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-red-100 mb-2">
                <X className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                {t("COMMON.ERROR_LOADING_DATA")}
              </h3>
              <p className="text-xs text-gray-600">{error}</p>
              <button
                onClick={onClose}
                className="mt-3 px-4 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors"
              >
                {t("COMMON.CLOSE")}
              </button>
            </div>
          ) : inventoryData.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 mb-2">
                <Store className="h-5 w-5 text-gray-400" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
               {t("PRODUCTS.NO_STORE_INVENTORY")}
              </h3>
              <p className="text-xs text-gray-600">
                {t("PRODUCTS.NO_STORE_INVENTORY_CONFIGURED")}
              </p>
            </div>
          ) : filteredInventoryData.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 mb-2">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                {t("COMMON.NO_RESULTS_FOUND")}
              </h3>
              <p className="text-xs text-gray-600">
                {t("COMMON.NO_STORES_MATCH_SEARCH")}
              </p>
              <button
                onClick={() => {
                  setSearchText("");
                  // Keep focus after clearing search
                  setTimeout(() => {
                    if (searchInputRef.current) {
                      searchInputRef.current.focus();
                    }
                  }, 50);
                }}
                className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
              >
                {t("COMMON.CLEAR_SEARCH")}
              </button>
            </div>
          ) : (
            <div className="px-4 py-2">
              <div className="space-y-2">
                {filteredInventoryData.map((inventory, index) => {
                  const isActive = inventory.IsActive !== undefined ? inventory.IsActive : true;
                  const isEditing = editingInventoryId === inventory.StoreID;
                  const discountPercentage = isEditing
                    ? editedInventory.DiscountPercentage
                    : inventory.DiscountPercentage;
                  const finalPrice = getDiscountedPrice(mrp, discountPercentage);
                  
                  return (
                    <div
                      key={`${inventory.StoreID}-${index}`}
                      className={`border rounded p-2 transition-all ${
                        isActive
                          ? "bg-green-50 border-green-200"
                          : "bg-gray-50 border-gray-300"
                      } ${isEditing ? "ring-1 ring-blue-100" : ""}`}
                    >
                      {/* Store Header */}
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <div
                            className={`p-1 rounded ${
                              isActive ? "bg-green-100" : "bg-gray-200"
                            }`}
                          >
                            <MapPin
                              className={`h-3 w-3 ${
                                isActive ? "text-green-600" : "text-gray-600"
                              }`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h5 className="text-xs font-medium text-gray-900 truncate">
                                {inventory.Store?.StoreName || inventory.StoreName || `Store ${index + 1}`}
                              </h5>
                              <span
                                className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
                                  isActive
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {isActive ? t("COMMON.ACTIVE") : t("COMMON.INACTIVE")}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-500">
                              {t("PRODUCTS.STORE_ID")}: {inventory.StoreID?.substring(0, 6)}...
                            </p>
                          </div>
                        </div>

                        {/* Actions and Final Price */}
                        <div className="flex items-center gap-5">
                          <div className="mr-1">
                            <Switch
                              checked={isActive}
                              onChange={() =>
                                handleToggleActive(inventory.StoreID, isActive)
                              }
                              size="sm"
                              label=""
                              disabled={!hasUpdateStoreInventoryStatusPermission}
                            />
                          </div>

                          <div className="text-right mr-1">
                            <div className="text-sm font-bold text-blue-600">
                              ₹
                              {Math.round(finalPrice).toLocaleString(LOCALES.ENGLISH_INDIA)}
                            </div>
                            <div className="text-[10px] text-gray-500">
                              {t("PRODUCTS.FINAL_PRICE")}
                            </div>
                          </div>

                          <div className="flex items-center gap-5 ml-2">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => handleSaveInventory(inventory.StoreID)}
                                  disabled={saving}
                                  className="p-0.5 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors disabled:opacity-50 flex-shrink-0"
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
                                  className="p-0.5 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors flex-shrink-0"
                                  title={t("COMMON.CANCEL")}
                                >
                                  <XIcon className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleEditInventory(inventory)}
                                disabled={!hasEditStoreInventoryPermission}
                                className="p-0.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                title={hasEditStoreInventoryPermission ? "Edit" : t("COMMON.NO_PERMISSION")}
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Editable Fields */}
                      <div className="grid grid-cols-3 gap-1.5 mt-2">
                        {/* Quantity */}
                        <div className="bg-gray-50 rounded p-1.5">
                          <div className="flex items-center gap-1 mb-0.5">
                            <ShoppingBag className="h-2.5 w-2.5 text-gray-500" />
                            <span className="text-[10px] text-gray-600">
                              {t("COMMON.QUANTITY")}
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
                              {parseInt(inventory.Quantity) || 0}
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
                              ? Math.round(getDiscountedPrice(mrp, editedInventory.DiscountPercentage || 0)).toLocaleString(LOCALES.ENGLISH_INDIA)
                              : Math.round(parseFloat(inventory.SellingPrice || 0)).toLocaleString(LOCALES.ENGLISH_INDIA)
                            }
                          </div>
                          {isEditing && (
                            <div className="text-[8px] text-gray-500">
                              {t("PRODUCT_CREATION.MRP")}: ₹{Math.round(mrp).toLocaleString(LOCALES.ENGLISH_INDIA)}
                            </div>
                          )}
                        </div>

                        {/* Discount */}
                        <div className="bg-gray-50 rounded p-1.5">
                          <div className="flex items-center gap-1 mb-0.5">
                            <Percent className="h-2.5 w-2.5 text-gray-500" />
                            <span className="text-[10px] text-gray-600">
                              {t("INVENTORY.DISCOUNT_PERCENT")}
                            </span>
                          </div>
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={editedInventory.DiscountPercentage || 0}
                              onChange={(e) =>
                                setEditedInventory((prev) => ({
                                  ...prev,
                                  DiscountPercentage: e.target.value,
                                }))
                              }
                              className="w-full px-1.5 py-0.5 text-xs font-medium text-gray-900 bg-white border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          ) : parseFloat(inventory.DiscountPercentage) ? (
                            <div>
                              <div className="text-xs font-medium text-green-700">
                                {parseFloat(inventory.DiscountPercentage)}%
                              </div>
                              <div className="text-[10px] text-gray-500">
                                {t("COMMON.SAVE")}: ₹
                                {Math.round(
                                  (mrp * parseFloat(inventory.DiscountPercentage)) / 100
                                ).toLocaleString(LOCALES.ENGLISH_INDIA)}
                              </div>
                            </div>
                          ) : (
                            <div className="text-[10px] text-gray-500 italic">
                              {t("COMMON.NO_DISCOUNT")}
                            </div>
                          )}
                          {isEditing && editedInventory.DiscountPercentage > 0 && (
                            <div className="text-[8px] text-green-600 mt-0.5">
                             {t("COMMON.SAVE")}: ₹{Math.round((mrp * (editedInventory.DiscountPercentage || 0)) / 100).toLocaleString(LOCALES.ENGLISH_INDIA)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Editing Instructions */}
              {editingInventoryId && (
                <div className="mt-2 p-1.5 bg-blue-50 border border-blue-200 rounded">
                  <div className="flex items-start gap-1">
                    <div className="p-0.5 bg-blue-100 rounded">
                      <Edit className="h-3 w-3 text-blue-600" />
                    </div>
                    <div className="text-[10px] text-blue-800">
                      <p className="font-medium">{t("INVENTORY.EDITING_MODE_ACTIVE")}</p>
                      <p className="text-blue-700">
                        {t("INVENTORY.EDITING_INSTRUCTIONS")}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white px-6 py-3 border-t border-gray-200 flex justify-between items-center">
          <div className="text-xs text-gray-600">
            {inventoryData.length} {t("INVENTORY.STORE_LOCATIONS")} • {summary.totalStock} {t("INVENTORY.TOTAL_UNITS")} • {summary.activeStores} {t("INVENTORY.ACTIVE_STORES")}
            {editingInventoryId && " • " + t("COMMON.EDITING_MODE_ACTIVE")}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-colors font-medium"
          >
            {t("COMMON.CLOSE")}
          </button>
        </div>
      </div>

      {/* Store Status Confirmation Popup */}
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

export default ProductStoreInventoryPopup;
