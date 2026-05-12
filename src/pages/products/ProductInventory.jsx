import { useState, useEffect, useCallback, lazy, Suspense, startTransition } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import Toolbar from "../../components/Toolbar";
import Pagination from "../../components/Pagination";
import ActionButtons from "../../components/ActionButtons";
import { useTranslation } from "react-i18next";
import { apiGet } from "../../utils/ApiUtils.jsx";
import {
  GETPRODUCTDETAILS,
  UPDATE_PRODUCT_STATUS,
  UPDATE_PRODUCT_VARIANT_STATUS,
} from "../../contants/apiRoutes";
import Switch from "../../components/Switch.jsx";
import { useTitle } from "../../context/TitleContext";
import {
  ITEMS_PER_PAGE,
  STATUS,
  STATUS_OPTIONS,
  STOCK_SORT_OPTIONS,
  STATUS_BADGE_CLASSES,
  DEFAULT_PAGE,
  VIEW_MODES,
  SCROLL_SHADOW_THRESHOLD,
  FILTER_VALUES,
  PRODUCT_STATUS_VALUES,
  MODULES,
  PERMISSIONS,
  BODY_OVERFLOW,
  PRODUCT_ID_FIELDS,
} from "../../contants/constants.jsx";
import { X } from "lucide-react";
import {
  fetchResource,
  updateStatusById,
} from "../../store/slices/allDataSlice.jsx";
import { getPermissionCode, hasPermissionId } from "../../utils/permissionUtils";
import FullscreenErrorPopup from "../../components/FullscreenErrorPopup";
import { ToastContainer } from "react-toastify";
import { exportProductReport } from "../../store/slices/exportSlice";
import noImage from "../../../assets/images/missing-pictur.jpg";
import { showEmsg } from "../../utils/ShowEmsg.jsx";
import SkeletonLoader from "../../components/SkeletonLoader";
import Loader from "../../components/Loader.jsx";
import { SKELETON_TYPES } from "../../contants/constants.jsx";
import { hideLoaderWithDelay } from "../../utils/loaderUtils";
import PlanGate from "../PlanGate";
const ProductVariantsPopup = lazy(() => import("../../pages/products/ProductVariantsPopup.jsx"));
const ProductVariantsStatusPopup = lazy(() => import("../../pages/products/ProductVariantsStatusPopup.jsx"));
const ProductStoreInventoryPopup = lazy(() => import("../../pages/products/ProductStoreInventoryPopup.jsx"));
const getStatusBadgeClass = (status) => {
  if (status === PRODUCT_STATUS_VALUES.ACTIVE) return STATUS_BADGE_CLASSES.ACTIVE;
  if (status === PRODUCT_STATUS_VALUES.OUT_OF_STOCK) return STATUS_BADGE_CLASSES.OUT_OF_STOCK;
  return STATUS_BADGE_CLASSES.INACTIVE;
};

const ProductInventory = () => {
  const [sSearchTerm, setSearchTerm] = useState("");
  const [sViewMode, setViewMode] = useState(VIEW_MODES.TABLE);
  const [nCurrentPage, setCurrentPage] = useState(DEFAULT_PAGE);
  const { t } = useTranslation();
  const itemsPerPage = ITEMS_PER_PAGE;
  const navigate = useNavigate();
  const [bShowFilterDropdown, setShowFilterDropdown] = useState(false);
  const [aProducts, setProducts] = useState([]);
  const [bLoading, setLoading] = useState(true);
  const [sError, setError] = useState(null);
  const [nTotalItems, setTotalItems] = useState(0);
  const [nTotalPages, setTotalPages] = useState(0);
  const { setTitle } = useTitle();
  const [deletePopup, setDeletePopup] = useState({
    open: false,
    productId: null,
  });
  const [statusPopup, setStatusPopup] = useState({
    open: false,
    productId: null,
    newStatus: null,
  });
  const [variantPopup, setVariantPopup] = useState({
    open: false,
    productId: null,
    groupByAttributeValue: null,
  });
  const [variantStatusPopup, setVariantStatusPopup] = useState({
    open: false,
    productId: null,
  });
  const [storeInventoryPopup, setStoreInventoryPopup] = useState({
    open: false,
    productVariantId: null,
  });
  // Add this function to handle viewing variants
  const handleViewVariants = (productId, groupByAttributeValue) => {
    startTransition(() => {
      setVariantPopup({
        open: true,
        productId,
        groupByAttributeValue: groupByAttributeValue ?? null,
      });
    });
  };

  // Add this function to handle viewing store inventory
  const handleViewStoreInventory = (productVariantId) => {
    startTransition(() => {
      setStoreInventoryPopup({
        open: true,
        productVariantId,
      });
    });
  };

  // Add this function to handle viewing store inventory with permission check
  const handleViewStoreInventoryWithPermission = (productVariantId) => {
    if (!hasViewVariantStoresPermission) {
      showEmsg(t("COMMON.NO_PERMISSION_TO_VIEW_VARIANT_STORES"), STATUS.ERROR);
      return;
    }
    handleViewStoreInventory(productVariantId);
  };

  // Add this function to close the popup
  const handleCloseVariantPopup = () => {
    setVariantPopup({
      open: false,
      productId: null,
      groupByAttributeValue: null,
    });
  };

  // Add this function to handle variant status popup
  const handleOpenVariantStatusPopup = (productId) => {
    startTransition(() => {
      setVariantStatusPopup({
        open: true,
        productId,
      });
    });
  };

  // Add this function to close the variant status popup
  const handleCloseVariantStatusPopup = () => {
    setVariantStatusPopup({
      open: false,
      productId: null,
    });
  };

  // Add this function to close the store inventory popup
  const handleCloseStoreInventoryPopup = () => {
    setStoreInventoryPopup({
      open: false,
      productVariantId: null,
    });
  };

  // Add this function to handle variant status updates
  const handleVariantStatusUpdate = () => {
    // Refetch products to reflect the updated status
    fetchProducts();
  };
  const [bFilterLoading, setFilterLoading] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [bSubmitting, setSubmitting] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [tableScrollTop, setTableScrollTop] = useState(0); // For floating header
  const dispatch = useDispatch();

  // Permission checks
  const permissionIdForViewInventory = getPermissionCode(
    MODULES.INVENTORY,
    PERMISSIONS.VIEW_INVENTORY
  );
  const permissionIdForUpdateProductVariantStatus = getPermissionCode(
    MODULES.INVENTORY,
    PERMISSIONS.UPDATE_PRODUCT_VARIANT_STATUS
  );
  const permissionIdForViewVariantStores = getPermissionCode(
    MODULES.PRODUCT,
    PERMISSIONS.VIEW_VARIANT_STORES
  );

  const hasViewInventoryPermission = hasPermissionId(permissionIdForViewInventory);
  const hasUpdateProductVariantStatusPermission = hasPermissionId(permissionIdForUpdateProductVariantStatus);
  const hasViewVariantStoresPermission = hasPermissionId(permissionIdForViewVariantStores);

  const stockSortOptions = STOCK_SORT_OPTIONS.map((opt) => ({
    value: opt.value,
    label: t(opt.labelKey),
  }));

  useEffect(() => {
    document.body.style.overflow = BODY_OVERFLOW.HIDDEN;
    return () => {
      document.body.style.overflow = BODY_OVERFLOW.UNSET;
    };
  }, []);

  // Handle table scroll for floating header
  const handleTableScroll = useCallback((e) => {
    setTableScrollTop(e.target.scrollTop);
  }, []);

  // Fetch categories, brands, and stores from Redux
  const categories = useSelector(
    (state) => state.allData.resources.categories?.data || [],
  );
  const brands = useSelector(
    (state) => state.allData.resources.brands?.data || [],
  );
  const stores = useSelector(
    (state) => state.allData.resources.stores?.data || [],
  );

  // Fetch categories, brands, and stores when filter dropdown is opened
  useEffect(() => {
    if (bShowFilterDropdown) {
      dispatch(fetchResource({ key: "categories" }));
      dispatch(fetchResource({ key: "brands" }));
      dispatch(fetchResource({ key: "stores" }));
    }
  }, [bShowFilterDropdown, dispatch]);

  const defaultFilters = {
    category: FILTER_VALUES.ALL,
    brand: FILTER_VALUES.ALL,
    store: FILTER_VALUES.ALL,
    status: FILTER_VALUES.ALL,
    stockSort: FILTER_VALUES.NONE,
  };
  const [oFilters, setFilters] = useState(defaultFilters);

  const handleClearFilters = () => {
    setFilters(defaultFilters);
    setCurrentPage(1);
  };

  const handleEdit = (productId) => {
    navigate(`/edit-product/${productId}`);
  };

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");

      const params = {
        pageNumber: nCurrentPage,
        pageSize: itemsPerPage,
        searchText: sSearchTerm,
      };

      // Stock sorting
      if (oFilters.stockSort === "stock_asc") {
        params.sortBy = "quantity";
        params.sortOrder = "asc";
      }

      if (oFilters.stockSort === "stock_desc") {
        params.sortBy = "quantity";
        params.sortOrder = "desc";
      }

      // Status filter
      if (oFilters.status && oFilters.status !== FILTER_VALUES.ALL) {
        params.status = oFilters.status === FILTER_VALUES.TRUE;
      }

      // Brand filter
      if (oFilters.brand && oFilters.brand !== FILTER_VALUES.ALL) {
        const selectedBrand = brands.find(
          (b) => b.BrandName === oFilters.brand,
        );
        if (selectedBrand) params.brandId = [selectedBrand.BrandID];
      }

      // Category filter
      if (oFilters.category && oFilters.category !== FILTER_VALUES.ALL) {
        const selectedCategory = categories.find(
          (c) => c.CategoryName === oFilters.category,
        );
        if (selectedCategory) params.categoryId = [selectedCategory.CategoryID];
      }

      if (oFilters.store && oFilters.store !== FILTER_VALUES.ALL) {
        const selectedStore = stores.find(
          (s) => s.StoreName === oFilters.store,
        );
        if (selectedStore) params.storeId = [selectedStore.StoreID];
      }

      const oResponse = await apiGet(GETPRODUCTDETAILS, params, token);
      const resData = oResponse?.data;

      if (resData?.status.toUpperCase() === STATUS.SUCCESS.toUpperCase()) {
        const rawProducts = Array.isArray(resData.data) ? resData.data : [];

        const transformedProducts = rawProducts.map((product) => {
          // Aggregate quantity across all variants
          const totalQuantity = Array.isArray(product.Variants)
            ? product.Variants.reduce((sum, v) => sum + (v.Quantity || 0), 0)
            : 0;

          // Determine active status: product is active if any variant is active
          const isActive = Array.isArray(product.Variants)
            ? product.Variants.some((v) => v.IsActive)
            : false;

          // First image from first variant
          const firstVariant = Array.isArray(product.Variants) && product.Variants.length > 0
            ? product.Variants[0]
            : null;
          const firstImage =
            firstVariant?.ProductVariantImages?.[0]?.documentUrl || null;

          return {
            ProductID: product.ProductId,
            ProductName: product.ProductName,
            Quantity: totalQuantity,
            IsActive: isActive,
            GroupByAttributeValue: firstVariant?.GroupByAttributeValue ?? null,
            firstImage,
            status:
              isActive && totalQuantity > 0
                ? PRODUCT_STATUS_VALUES.ACTIVE
                : isActive && totalQuantity <= 0
                  ? PRODUCT_STATUS_VALUES.OUT_OF_STOCK
                  : PRODUCT_STATUS_VALUES.INACTIVE,
          };
        });

        setProducts(transformedProducts);
        setTotalItems(resData.pagination?.totalRecords || 0);
        setTotalPages(resData.pagination?.totalPages || 0);
      } else {
        setError(resData?.message || t("COMMON.API_ERROR"));
        setProducts([]);
        setTotalItems(0);
        setTotalPages(0);
      }
    } catch (err) {
      if (err?.response?.status === 403) {
        setProducts([]);
        setTotalItems(0);
        setTotalPages(0);
        return;
      }
      setError(err?.response?.data?.message || t("COMMON.API_ERROR"));
      setProducts([]);
      setTotalItems(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
      setFilterLoading(false);
      if (!initialLoadComplete) {
        setInitialLoadComplete(true);
      }
    }
  }, [nCurrentPage, itemsPerPage, sSearchTerm, oFilters, t]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    setTitle(t("PRODUCT_INVENTORY.TITLE"));
  }, [setTitle, t]);

  const storeOptions = [
    { value: FILTER_VALUES.ALL, label: t("COMMON.ALL") },
    ...stores.map((store) => ({
      value: store.StoreName,
      label: store.StoreName,
    })),
  ];

  const statusOptions = STATUS_OPTIONS.map((opt) => ({
    value: opt.value,
    label: t(opt.labelKey),
  }));

  const handleDropdownInputChange = (inputValue, filterName) => {
    if (filterName === "category") {
      dispatch(
        fetchResource({
          key: "categories",
          params:
            inputValue && inputValue.trim() !== ""
              ? { searchText: inputValue }
              : {},
        }),
      );
    } else if (filterName === "store") {
      dispatch(
        fetchResource({
          key: "stores",
          params:
            inputValue && inputValue.trim() !== ""
              ? { searchText: inputValue }
              : {},
        }),
      );
    }
  };

  const additionalFilters = [
    {
      label: t("COMMON.SORT_BY_STOCK"),
      name: "stockSort",
      value: oFilters.stockSort,
      options: stockSortOptions,
    },
    {
      label: t("COMMON.STATUS"),
      name: "status",
      value: oFilters.status,
      options: statusOptions,
    },
    {
      label: t("COMMON.STORE"),
      name: "store",
      value: oFilters.store,
      options: storeOptions,
      placeholder: t("USERS.FILTERS.STORE"),
      searchable: true,
      searchPlaceholder: t("COMMON.SEARCH_STORE"),
      onInputChange: (inputValue) =>
        handleDropdownInputChange(inputValue, "store"),
    },
  ];

  const handleFilterChange = (e, filterName) => {
    if (initialLoadComplete) {
      setFilterLoading(true);
    }

    setFilters({
      ...oFilters,
      [filterName]: e.target.value,
    });
    setCurrentPage(1);
  };

  const handleExportProducts = async () => {
    setExportLoading(true);
    try {
      // Find the brand and category IDs from the Redux state
      const brand = brands.find((b) => b.BrandName === oFilters.brand);
      const category = categories.find(
        (c) => c.CategoryName === oFilters.category,
      );

      const isActiveFilter =
        oFilters.status === FILTER_VALUES.ALL ? undefined : oFilters.status === FILTER_VALUES.TRUE;

      await dispatch(
        exportProductReport({
          searchText: sSearchTerm,
          isActive: isActiveFilter,
          brandId: brand ? [brand.BrandID] : undefined,
          categoryId: category ? [category.CategoryID] : undefined,
        }),
      ).unwrap();

      // Optional: show success message
      // toast.success(t('PRODUCTS.EXPORT_SUCCESS'));
    } catch (error) {
    } finally {
      setExportLoading(false);
    }
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, nTotalPages));
  };

  const handlePageClick = (page) => {
    setCurrentPage(page);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [sSearchTerm, oFilters]);

  // --- Status Update Handlers ---
  const handleStatusChange = (productId, currentIsActive) => {
    if (!hasUpdateProductVariantStatusPermission) {
      showEmsg(t("COMMON.NO_PERMISSION"), STATUS.ERROR);
      return;
    }

    // Always show variants popup since we're at product level
    handleOpenVariantStatusPopup(productId);
  };

  const handleStatusConfirm = async () => {
    if (setSubmitting) setSubmitting(true);
    const { productId, newStatus } = statusPopup;

    try {
      const result = await dispatch(
        updateStatusById({
          key: "products",
          id: productId,
          newStatus,
          apiRoute: UPDATE_PRODUCT_STATUS,
          idField: PRODUCT_ID_FIELDS.PRODUCT_ID,
        }),
      ).unwrap();

      showEmsg(result.message, STATUS.SUCCESS);
      await fetchProducts();
    } catch (err) {
      showEmsg(err?.message || t("COMMON.API_ERROR"), STATUS.ERROR);
    } finally {
      setStatusPopup({ open: false, productId: null, newStatus: null });
      hideLoaderWithDelay(setSubmitting);
    }
  };

  const handleStatusPopupClose = () => {
    setStatusPopup({ open: false, productId: null, newStatus: null });
  };

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-2 min-h-screen bg-gray-50">
      <ToastContainer />
          <Toolbar
        searchTerm={sSearchTerm}
        setSearchTerm={setSearchTerm}
        viewMode={sViewMode}
        setViewMode={setViewMode}
        showFilterDropdown={bShowFilterDropdown}
        setShowFilterDropdown={setShowFilterDropdown}
        additionalFilters={additionalFilters}
        handleFilterChange={handleFilterChange}
        searchPlaceholder={t("PRODUCT_INVENTORY.SEARCH_PLACEHOLDER")}
        onClearFilters={handleClearFilters}
        onExport={handleExportProducts}
        exportLabel={exportLoading ? t("COMMON.EXPORTING") : t("COMMON.EXPORT")}
      />

      {sError ? (
        <PlanGate
          embed
          sectionTitle={t("PLAN_GATE.SECTIONS.PRODUCT_INVENTORY")}
        />
      ) : sViewMode === VIEW_MODES.TABLE ? (
        <div className="table-container-floating">
          <div className="table-wrapper-floating" onScroll={handleTableScroll}>
            <table className="table-base">
              {/* Floating Header */}
              <thead
                className={`table-head-floating ${
                  tableScrollTop > SCROLL_SHADOW_THRESHOLD ? "table-head-floating-shadow" : ""
                }`}
              >
                <tr>
                  <th className="table-head-cell-floating text-left">
                    {t("COMMON.PRODUCTS")}
                  </th>
                  <th className="table-head-cell-floating text-center">
                    {t("COMMON.QUANTITY")}
                  </th>
                  <th className="table-head-cell-floating text-center">
                    {t("COMMON.STATUS")}
                  </th>
                  <th className="table-head-cell-floating text-center">
                    {t("COMMON.ACTIONS")}
                  </th>
                </tr>
              </thead>

              <tbody className="table-body">
                {bLoading || bFilterLoading ? (
                  <SkeletonLoader type={SKELETON_TYPES.PRODUCT_INVENTORY_TABLE} rows={itemsPerPage} />
                ) : aProducts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-8 text-center text-gray-500"
                    >
                      {t("PRODUCT_INVENTORY.NO_PRODUCTS")}
                    </td>
                  </tr>
                ) : (
                  aProducts.map((product) => (
                    <tr
                      key={product.ProductID}
                      className="table-row"
                    >
                      {/* Product Name */}
                      <td className="table-cell text-left align-middle">
                        <div className="flex items-center p-2">
                          <div className="h-10 w-10 flex-shrink-0">
                            <img
                              className="h-10 w-10 rounded object-cover"
                              src={
                                product?.firstImage &&
                                product.firstImage.startsWith("http")
                                  ? product.firstImage
                                  : noImage
                              }
                              alt={product?.ProductName || "Product"}
                              onError={(e) => {
                                e.target.src = noImage;
                              }}
                            />
                          </div>
                          <div className="ml-3">
                            <div
                              className="font-medium text-xs text-gray-900 ellipsis-text"
                              title={product.ProductName}
                            >
                              {product.ProductName}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Quantity */}
                      <td className="table-cell text-center align-middle">
                        <div
                          className={`ellipsis-text ${product.Quantity <= 0 ? "text-red-600 font-medium" : ""}`}
                          title={product.Quantity}
                        >
                          {product.Quantity}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="table-cell text-center align-middle">
                        <Switch
                          checked={product.IsActive}
                          onChange={() =>
                            handleStatusChange(
                              product.ProductID,
                              product.IsActive,
                            )
                          }
                          disabled={!hasUpdateProductVariantStatusPermission}
                        />
                      </td>

                      {/* Actions */}
                      <td className="table-cell text-center align-middle">
                        <ActionButtons
                          id={product.ProductID}
                          onViewVariants={() =>
                            handleViewVariants(product.ProductID, product.GroupByAttributeValue)
                          }
                          variantButtonText={t("PRODUCT_INVENTORY.VIEW_VARIANTS")}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="table-wrapper-floating">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {bLoading || bFilterLoading ? (
              <SkeletonLoader type={SKELETON_TYPES.PRODUCT_GRID} rows={itemsPerPage} />
            ) : aProducts.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">
                {t("PRODUCT_INVENTORY.NO_PRODUCTS")}
              </div>
            ) : (
              aProducts.map((product) => (
                <div
                  key={product.ProductID}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-lg transition-shadow duration-200"
                >
                  <div className="relative h-[60%] min-h-[220px] bg-gray-100">
                    <img
                      src={product.firstImage}
                      alt={product.ProductName}
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = noImage;
                        e.target.classList.remove("object-cover");
                        e.target.classList.add("object-contain", "bg-white");
                      }}
                    />

                    {/* Status badge */}
                    <span
                      className={`absolute top-3 left-3 px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(
                        product.status,
                      )}`}
                    >
                      {product.status === PRODUCT_STATUS_VALUES.ACTIVE ? t("PRODUCT_INVENTORY.STATUS_ACTIVE") : t("PRODUCT_INVENTORY.STATUS_OUT_OF_STOCK")}
                    </span>

                    {/* Status Switch */}
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur rounded-lg px-2 py-1 shadow-sm">
                      <Switch
                        checked={product.IsActive}
                        onChange={() =>
                          handleStatusChange(
                            product.ProductID,
                            product.IsActive,
                          )
                        }
                        disabled={!hasUpdateProductVariantStatusPermission}
                      />
                    </div>
                  </div>

                  <div className="p-4 flex flex-col gap-3">
                    {/* Product Name */}
                    <div
                      className="text-xs font-semibold text-gray-900 line-clamp-2"
                      title={product.ProductName}
                    >
                      {product.ProductName}
                    </div>

                    {/* Product Details */}
                    <div className="flex flex-col gap-1 min-w-0">
                      {/* Quantity */}
                      <div className="text-xs text-gray-700">
                        <span className="font-medium">
                          {t("COMMON.QUANTITY")}:
                        </span>{" "}
                        <span
                          className={
                            product.Quantity <= 0
                              ? "text-red-600 font-medium"
                              : ""
                          }
                        >
                          {product.Quantity}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end">
                      <ActionButtons
                        id={product.ProductID}
                        onEdit={handleEdit}
                        viewLink={`/productdetails/${product.ProductID}`}
                        onViewVariants={() =>
                          handleViewVariants(product.ProductID, product.GroupByAttributeValue)
                        }
                        variantButtonText={t("PRODUCT_INVENTORY.VIEW_VARIANTS")}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      {!bLoading && !sError && nTotalItems > 0 && (
        <Pagination
          currentPage={nCurrentPage}
          totalPages={nTotalPages}
          totalItems={nTotalItems}
          itemsPerPage={itemsPerPage}
          handlePrevPage={handlePrevPage}
          handleNextPage={handleNextPage}
          handlePageClick={handlePageClick}
        />
      )}
      {variantPopup.open && (
        <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"><Loader /></div>}>
          <ProductVariantsPopup
            productId={variantPopup.productId}
            groupByAttributeValue={variantPopup.groupByAttributeValue}
            onClose={handleCloseVariantPopup}
          />
        </Suspense>
      )}

      {variantStatusPopup.open && (
        <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"><Loader /></div>}>
          <ProductVariantsStatusPopup
            productId={variantStatusPopup.productId}
            onClose={handleCloseVariantStatusPopup}
            onVariantStatusUpdate={handleVariantStatusUpdate}
          />
        </Suspense>
      )}

      {storeInventoryPopup.open && (
        <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"><Loader /></div>}>
          <ProductStoreInventoryPopup
            productVariantId={storeInventoryPopup.productVariantId}
            onClose={handleCloseStoreInventoryPopup}
          />
        </Suspense>
      )}

      {statusPopup.open && (
        <FullscreenErrorPopup
          title={t("PRODUCT_INVENTORY.CONFIRM_STATUS_TITLE")}
          message={
            statusPopup.newStatus
              ? t("PRODUCT_INVENTORY.CONFIRM_ACTIVATE_MESSAGE")
              : t("PRODUCT_INVENTORY.CONFIRM_DEACTIVATE_MESSAGE")
          }
          onClose={handleStatusPopupClose}
          onConfirm={handleStatusConfirm}
          isSubmitting={bSubmitting}
        />
      )}
    </div>
  );
};

export default ProductInventory;
