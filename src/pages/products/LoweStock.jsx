import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPut } from '../../utils/ApiUtils.jsx';
import { GET_PRODUCT_BY_ID, UPDATE_INVENTORY } from '../../contants/apiRoutes.jsx';
import noImage from "../../../assets/images/missing-pictur.jpg";
import Loader from "../../components/Loader.jsx";
import { X, ChevronRight, Package, Store, ShoppingBag, MapPin, DollarSign, Percent, Edit, Check, X as XIcon } from 'lucide-react';
import { toast } from 'react-toastify';
import Switch from "../../components/Switch.jsx";
import Toolbar from "../../components/Toolbar.jsx";
import Pagination from "../../components/Pagination.jsx";
import { useTitle } from "../../context/TitleContext.jsx";
import { VIEW_MODES, ITEMS_PER_PAGE, DEFAULT_PAGE } from "../../contants/constants.jsx";

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
  const [tableScrollTop, setTableScrollTop] = useState(0);
  const [nCurrentPage, setCurrentPage] = useState(DEFAULT_PAGE);
  const itemsPerPage = ITEMS_PER_PAGE;
  const tableRef = useRef(null);

  // Generate dummy data
  const generateDummyData = () => {
    const dummyProduct = {
      ProductName: "Premium Wireless Headphones",
      BrandName: "AudioTech",
      CategoryName: "Electronics & Audio",
      ProductID: productId || "prod_123456789",
      IsActive: true,
      Variants: []
    };

    // Generate 5 variants
    const variantNames = ["Black", "White", "Blue", "Red", "Silver"];
    const attributesOptions = [
      [{ Name: "Color", Value: "Matte Black" }, { Name: "Size", Value: "Standard" }],
      [{ Name: "Color", Value: "Pearl White" }, { Name: "Size", Value: "Standard" }],
      [{ Name: "Color", Value: "Ocean Blue" }, { Name: "Size", Value: "Standard" }],
      [{ Name: "Color", Value: "Crimson Red" }, { Name: "Size", Value: "Large" }],
      [{ Name: "Color", Value: "Metallic Silver" }, { Name: "Size", Value: "Large" }]
    ];

    const storeNames = [
      "Main Flagship Store",
      "Downtown Mall Branch",
      "Airport Terminal Shop",
      "Online Warehouse",
      "Express Delivery Center"
    ];

    for (let i = 0; i < 5; i++) {
      const variant = {
        VariantID: `var_${productId}_${i + 1}`,
        VariantName: `${variantNames[i]} Edition`,
        MRP: 12999 + (i * 500),
        Attributes: attributesOptions[i],
        ProductVariantImages: [
          {
            documentUrl: `https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8aGVhZHBob25lc3xlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=500&q=60`,
            sortOrder: 1
          }
        ],
        Inventory: []
      };

      // Generate 3-5 inventory items per variant
      const inventoryCount = 3 + Math.floor(Math.random() * 3);
      for (let j = 0; j < inventoryCount; j++) {
        const sellingPrice = variant.MRP * (0.85 + (Math.random() * 0.15));
        const discount = j === 0 ? 0 : Math.floor(Math.random() * 30);
        const quantity = Math.floor(Math.random() * 100) + 10;
        
        variant.Inventory.push({
          StoreID: `store_${j + 1}`,
          StoreName: storeNames[j] || `Store ${j + 1}`,
          Quantity: quantity,
          SellingPrice: Math.round(sellingPrice),
          DiscountPercentage: discount,
          IsActive: j < 3,
          Location: j === 0 ? "New York, NY" : 
                   j === 1 ? "Los Angeles, CA" : 
                   j === 2 ? "Chicago, IL" : 
                   j === 3 ? "Miami, FL" : "Seattle, WA"
        });
      }

      dummyProduct.Variants.push(variant);
    }

    return dummyProduct;
  };

  useEffect(() => {
    const fetchProductDetails = async () => {
      try {
        setTimeout(() => {
          const dummyData = generateDummyData();
          setProductData(dummyData);
          setLoading(false);
        }, 800);
      } catch (err) {
        const dummyData = generateDummyData();
        setProductData(dummyData);
        setLoading(false);
        console.log("Using dummy data due to API error:", err);
      }
    };

    if (productId) {
      fetchProductDetails();
    } else {
      const dummyData = generateDummyData();
      setProductData(dummyData);
      setLoading(false);
    }
  }, [productId, t]);

  const totalVariants = productData?.Variants?.length || 0;
  const totalPages = Math.max(1, Math.ceil(totalVariants / itemsPerPage));

  useEffect(() => {
    setCurrentPage(DEFAULT_PAGE);
  }, [productId, totalVariants]);

  useEffect(() => {
    if (nCurrentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [nCurrentPage, totalPages]);

  const paginatedVariants = productData?.Variants?.slice(
    (nCurrentPage - 1) * itemsPerPage,
    nCurrentPage * itemsPerPage
  ) || [];

  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () =>
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const handlePageClick = (page) => setCurrentPage(page);

  const handleTableScroll = () => {
    if (tableRef.current) {
      setTableScrollTop(tableRef.current.scrollTop);
    }
  };

  useEffect(() => {
    const tableElement = tableRef.current;
    if (tableElement) {
      tableElement.addEventListener('scroll', handleTableScroll);
      return () => {
        tableElement.removeEventListener('scroll', handleTableScroll);
      };
    }
  }, []);

  const getVariantImage = (variant) => {
    if (Array.isArray(variant.ProductVariantImages) && variant.ProductVariantImages.length > 0) {
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

  const getDiscountedPrice = (sellingPrice, discountPercentage) => {
    if (!discountPercentage) return sellingPrice;
    return sellingPrice - (sellingPrice * discountPercentage / 100);
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
    setEditingInventoryId(inventory.StoreID);
    setEditedInventory({
      Quantity: inventory.Quantity || 0,
      SellingPrice: inventory.SellingPrice || 0,
      DiscountPercentage: inventory.DiscountPercentage || 0
    });
  };

  const handleSaveInventory = async (variantId, storeId) => {
    try {
      setSaving(true);
      
      const payload = {
        variantId: variantId,
        storeId: storeId,
        quantity: parseInt(editedInventory.Quantity),
        sellingPrice: parseFloat(editedInventory.SellingPrice),
        discountPercentage: parseFloat(editedInventory.DiscountPercentage) || 0
      };

      setTimeout(() => {
        setProductData(prevData => {
          const updatedVariants = prevData.Variants.map(variant => {
            if (variant.VariantID === variantId) {
              const updatedInventory = variant.Inventory.map(inv => {
                if (inv.StoreID === storeId) {
                  return {
                    ...inv,
                    Quantity: payload.quantity,
                    SellingPrice: payload.sellingPrice,
                    DiscountPercentage: payload.discountPercentage
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
          setSelectedVariant(prev => {
            const updatedInventory = prev.Inventory.map(inv => {
              if (inv.StoreID === storeId) {
                return {
                  ...inv,
                  Quantity: payload.quantity,
                  SellingPrice: payload.sellingPrice,
                  DiscountPercentage: payload.discountPercentage
                };
              }
              return inv;
            });
            return { ...prev, Inventory: updatedInventory };
          });
        }

        toast.success(t("INVENTORY.INVENTORY_UPDATED"));
        setEditingInventoryId(null);
        setSaving(false);
      }, 500);

    } catch (err) {
      toast.error(err?.response?.data?.message || t("INVENTORY.ERROR_LOADING_DATA"));
      setSaving(false);
    }
  };

  const handleToggleActive = (storeId, variantId, isActive) => {
    setProductData(prevData => {
      const updatedVariants = prevData.Variants.map(variant => {
        if (variant.VariantID === variantId) {
          const updatedInventory = variant.Inventory.map(inv => {
            if (inv.StoreID === storeId) {
              return { ...inv, IsActive: isActive };
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
      setSelectedVariant(prev => {
        const updatedInventory = prev.Inventory.map(inv => {
          if (inv.StoreID === storeId) {
            return { ...inv, IsActive: isActive };
          }
          return inv;
        });
        return { ...prev, Inventory: updatedInventory };
      });
    }

    toast.success(isActive ? t("INVENTORY.STORE_INVENTORY_UPDATED") : t("INVENTORY.STORE_INVENTORY_UPDATED"));
  };

  const handleCancelEdit = () => {
    setEditingInventoryId(null);
    setEditedInventory({});
  };

  return (
    <div className="bg-white rounded-lg shadow-sm w-full h-full overflow-hidden flex flex-col">
      {/* Split Layout Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Variants Table */}
        <div className={`transition-all duration-300 ${inventoryPanelOpen ? 'w-2/5' : 'w-full'} overflow-hidden flex flex-col`}>
          <div className="flex-1 overflow-auto" ref={tableRef}>
            <table className="table-base w-full">
              {/* Floating Header */}
              <thead
                className={`table-head-floating ${tableScrollTop > 10 ? "table-head-floating-shadow" : ""
                  }`}
              >
                <tr>
                  <th className="table-head-cell-floating text-left">
                    {t("INVENTORY.VARIANT")}
                  </th>
                  <th className="table-head-cell-floating text-center">
                    {t("PRODUCTS.TITLE")}
                  </th>
                  <th className="table-head-cell-floating text-center">
                    {t("INVENTORY.PRICE")}
                  </th>
                  <th className="table-head-cell-floating text-center">
                    {t("PRODUCTS.STOCK")}
                  </th>
                  <th className="table-head-cell-floating text-center">
                    {t("COMMON.ACTIONS")}
                  </th>
                </tr>
              </thead>

              <tbody className="table-body">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Loader size="medium" />
                        <p className="mt-2 text-sm text-gray-600">{t("COMMON.LOADING")}</p>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-red-100 mb-2">
                        <X className="h-5 w-5 text-red-600" />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">{t("PRODUCTS.ERROR_LOADING_DETAILS")}</h3>
                      <p className="text-xs text-gray-600">{error}</p>
                    </td>
                  </tr>
                ) : productData?.Variants?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      {t("PRODUCTS.NO_VARIANTS_FOUND")}
                    </td>
                  </tr>
                ) : (
                  paginatedVariants.map((variant, index) => {
                    const variantIndex =
                      (nCurrentPage - 1) * itemsPerPage + index;
                    const totalStock = getTotalStock(variant.Inventory || []);
                    const storeCount = variant.Inventory?.length || 0;
                    
                    return (
                      <tr 
                        key={variant.VariantID} 
                        className={`table-row ${selectedVariant?.VariantID === variant.VariantID && inventoryPanelOpen
                            ? 'bg-blue-50 border-l-4 border-l-blue-500'
                            : ''
                          }`}
                      >
                        {/* Variant Name */}
                        <td className="table-cell text-left align-middle">
                          <div className="flex items-center p-2">
                            <div className="ml-3">
                              <div
                                className="font-medium text-xs text-gray-900 ellipsis-text"
                              >
                              {t("PRODUCTS.VARIANT_NUMBER", { n: variantIndex + 1 })}
                              </div>
                              {variant.Attributes?.length > 0 && (
                                <div className="text-xs text-gray-500">
                                  {variant.Attributes.map(attr => `${attr.Name}: ${attr.Value}`).join(', ')}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Image */}
                        <td className="table-cell text-center align-middle">
                          <div className="flex justify-center">
                            <div className="h-8 w-8 flex-shrink-0">
                              <img
                                className="h-8 w-8 rounded object-cover"
                                src={getVariantImage(variant)}
                                alt={t("PRODUCTS.VARIANT_NUMBER", { n: variantIndex + 1 })}
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = noImage;
                                }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Price */}
                        <td className="table-cell text-center align-middle">
                          <div className="text-xs text-gray-900 font-semibold">
                            ₹{variant.MRP?.toLocaleString('en-IN')}
                          </div>
                          <div className="text-xs text-gray-500">{t("INVENTORY.MRP")}</div>
                        </td>

                        {/* Stock */}
                        <td className="table-cell text-center align-middle">
                          <div className="text-xs text-gray-900 font-semibold">
                            {totalStock}
                          </div>
                          <div className="text-xs text-gray-500">{storeCount} {t("COMMON.STORES")}</div>
                        </td>

                        {/* Actions */}
                        <td className="table-cell text-center align-middle">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openInventoryPanel(variant)}
                              className={`p-1.5 rounded-lg transition-colors border ${
                                selectedVariant?.VariantID === variant.VariantID && inventoryPanelOpen
                                  ? 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-100'
                                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-100'
                              }`}
                              title={t("COMMON.VIEW")}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Panel - Inventory Details (Split View) */}
        {inventoryPanelOpen && selectedVariant && (
          <div className="w-3/5 border-l border-gray-200 animate-slideLeft overflow-hidden flex flex-col">
            {/* Panel Header */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 rounded-md">
                  <Package className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{t("INVENTORY.INVENTORY_DETAILS")}</h3>
                  <p className="text-xs text-gray-500">
                    {selectedVariant.VariantName || t("PRODUCTS.VARIANT_NUMBER", { n: (productData?.Variants?.findIndex(v => v.VariantID === selectedVariant.VariantID) ?? 0) + 1 })}
                  </p>
                </div>
              </div>
              <button
                onClick={closeInventoryPanel}
                className="p-1 hover:bg-white rounded-md transition-colors"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            {/* Inventory List */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-4">
                <h4 className="font-medium text-gray-900">{t("PRODUCTS.STORE_INVENTORY")}</h4>
                  <p className="text-xs text-gray-500">
                    {(selectedVariant.Inventory || []).length} {t("COMMON.STORES")} • {t("COMMON.TOTAL_STOCK")}: {getTotalStock(selectedVariant.Inventory || [])} {t("PRODUCTS.UNITS")}
                  </p>              </div>

              <div className="space-y-3">
                {(selectedVariant.Inventory || []).length === 0 ? (
                  <div className="text-center py-6">
                    <Store className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">{t("PRODUCTS.NO_STORE_INVENTORY")}</p>
                  </div>
                ) : (
                  (selectedVariant.Inventory || []).map((inv, index) => {
                    const isEditing = editingInventoryId === inv.StoreID;
                    const finalPrice = getDiscountedPrice(
                      isEditing ? editedInventory.SellingPrice : inv.SellingPrice,
                      isEditing ? editedInventory.DiscountPercentage : inv.DiscountPercentage
                    );
                    
                    return (
                      <div 
                        key={`${inv.StoreID}-${index}`} 
                        className={`bg-white border rounded-lg p-3 transition-all ${
                          isEditing 
                            ? 'border-blue-300 ring-1 ring-blue-100' 
                            : 'border-gray-200 hover:shadow-sm'
                        }`}
                      >
                        {/* Store Header */}
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <div className="p-1 bg-gray-100 rounded-md">
                              <Store className="h-3.5 w-3.5 text-gray-600" />
                            </div>
                            <div>
                              <h5 className="font-medium text-gray-900 text-sm">{inv.StoreName}</h5>
                              <p className="text-xs text-gray-500">{inv.Location}</p>
                            </div>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-1.5">
                            <Switch
                              checked={inv.IsActive || false}
                              onChange={() => handleToggleActive(inv.StoreID, selectedVariant.VariantID, !inv.IsActive)}
                              size="sm"
                              label=""
                            />
                            
                            <div className="text-right ml-2">
                              <div className="text-base font-bold text-blue-600">
                                ₹{finalPrice.toLocaleString('en-IN', { 
                                  minimumFractionDigits: 0, 
                                  maximumFractionDigits: 0 
                                })}
                              </div>
                              <div className="text-xs text-gray-500">{t("PRODUCTS.FINAL_PRICE")}</div>
                            </div>
                            
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => handleSaveInventory(selectedVariant.VariantID, inv.StoreID)}
                                  disabled={saving}
                                  className="p-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors disabled:opacity-50"
                                  title={t("COMMON.SAVE")}
                                >
                                  {saving ? (
                                    <div className="h-3.5 w-3.5 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                                  ) : (
                                    <Check className="h-3.5 w-3.5" />
                                  )}
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  disabled={saving}
                                  className="p-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                                  title={t("COMMON.CANCEL")}
                                >
                                  <XIcon className="h-3.5 w-3.5" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleEditInventory(inv)}
                                className="p-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                                title={t("COMMON.EDIT")}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {/* Inventory Details */}
                        <div className="grid grid-cols-3 gap-2">
                          {/* Quantity */}
                          <div className="bg-gray-50 rounded-md p-2">
                            <div className="flex items-center gap-1.5 mb-1">
                              <ShoppingBag className="h-3 w-3 text-gray-500" />
                              <span className="text-xs text-gray-600">{t("INVENTORY.QUANTITY")}</span>
                            </div>
                            {isEditing ? (
                              <input
                                type="number"
                                min="0"
                                value={editedInventory.Quantity || 0}
                                onChange={(e) => setEditedInventory(prev => ({
                                  ...prev,
                                  Quantity: e.target.value
                                }))}
                                className="w-full px-2 py-1 text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            ) : (
                              <div className="text-sm font-semibold text-gray-900">
                                {inv.Quantity || 0}
                              </div>
                            )}
                          </div>
                          
                          {/* Selling Price */}
                          <div className="bg-gray-50 rounded-md p-2">
                            <div className="flex items-center gap-1.5 mb-1">
                              <DollarSign className="h-3 w-3 text-gray-500" />
                              <span className="text-xs text-gray-600">{t("INVENTORY.SELLING_PRICE")}</span>
                            </div>
                            {isEditing ? (
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={editedInventory.SellingPrice || 0}
                                onChange={(e) => setEditedInventory(prev => ({
                                  ...prev,
                                  SellingPrice: e.target.value
                                }))}
                                className="w-full px-2 py-1 text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            ) : (
                              <div className="text-sm font-semibold text-gray-900">
                                ₹{inv.SellingPrice?.toLocaleString('en-IN')}
                              </div>
                            )}
                          </div>
                          
                          {/* Discount */}
                          <div className="bg-gray-50 rounded-md p-2">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Percent className="h-3 w-3 text-gray-500" />
                              <span className="text-xs text-gray-600">{t("INVENTORY.DISCOUNT")}</span>
                            </div>
                            {isEditing ? (
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={editedInventory.DiscountPercentage || 0}
                                onChange={(e) => setEditedInventory(prev => ({
                                  ...prev,
                                  DiscountPercentage: e.target.value
                                }))}
                                className="w-full px-2 py-1 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            ) : inv.DiscountPercentage ? (
                              <div>
                                <div className="text-sm font-medium text-green-700">
                                  {inv.DiscountPercentage}%
                                </div>
                                <div className="text-xs text-gray-500">
                                  {`Save: ₹${((inv.SellingPrice * inv.DiscountPercentage) / 100).toLocaleString('en-IN')}`}
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-gray-500 italic">{t("COMMON.NO_DISCOUNT")}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {!loading && totalVariants > 0 && (
        <div className="border-t border-gray-200 flex-shrink-0">
          <Pagination
            currentPage={nCurrentPage}
            totalPages={totalPages}
            totalItems={totalVariants}
            itemsPerPage={itemsPerPage}
            handlePrevPage={handlePrevPage}
            handleNextPage={handleNextPage}
            handlePageClick={handlePageClick}
          />
        </div>
      )}
    </div>
  );
};

const LowStock = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setTitle } = useTitle();
  const [sSearchTerm, setSearchTerm] = useState("");
  const [sViewMode, setViewMode] = useState(VIEW_MODES.TABLE);
  const [bShowFilterDropdown, setShowFilterDropdown] = useState(false);
  const [additionalFilters, setAdditionalFilters] = useState([]);

  useEffect(() => {
    setTitle(t("SIDEBAR.LOW_STOCK"));
    return () => {
      setTitle("");
    };
  }, [setTitle, t]);

  const handleFilterChange = (e, filterName) => {
    const { value } = e.target;
    setAdditionalFilters((prev) => {
      const existingFilter = prev.find((f) => f.name === filterName);
      if (existingFilter) {
        return prev.map((f) =>
          f.name === filterName ? { ...f, value } : f
        );
      }
      return [...prev, { name: filterName, value }];
    });
  };

  const handleClearFilters = () => {
    setAdditionalFilters([]);
  };

  const handleCreate = () => {
    navigate("/Addproduct");
  };

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-2 min-h-screen bg-gray-50">
      <Toolbar
        searchTerm={sSearchTerm}
        setSearchTerm={setSearchTerm}
        viewMode={sViewMode}
        setViewMode={setViewMode}
        showFilterDropdown={bShowFilterDropdown}
        setShowFilterDropdown={setShowFilterDropdown}
        additionalFilters={additionalFilters}
        handleFilterChange={handleFilterChange}
        searchPlaceholder={t("PRODUCTS.SEARCH_PLACEHOLDER")}
        onClearFilters={handleClearFilters}
        onCreate={handleCreate}
        createLabel={t("PRODUCTS.ADD_BTN")}
        showViewToggle={false}
      />
      
      <div className="bg-white rounded-lg shadow-sm">
        <ProductVariantsPopup productId={null} onClose={() => {}} />
      </div>
    </div>
  );
};

export default LowStock;