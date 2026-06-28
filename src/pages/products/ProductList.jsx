import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import Toolbar from "../../components/Toolbar";
import Pagination from "../../components/Pagination";
import ActionButtons from "../../components/ActionButtons";
import { useTranslation } from "react-i18next";
import { apiGet, apiPatch } from "../../utils/ApiUtils.jsx";
import { SKELETON_TYPES } from "../../contants/constants";
import {
  GETPRODUCTDETAILS,
  UPDATE_PRODUCT_STATUS,
} from "../../contants/apiRoutes";
import Switch from "../../components/Switch.jsx";
import { useTitle } from "../../context/TitleContext";
import {
  ITEMS_PER_PAGE,
  STATUS,
  STATUS_OPTIONS,
} from "../../contants/constants.jsx";
import { PRODUCT_STATUS, PRODUCT_STATUS_LABELS } from "../../contants/constants";
import {
  fetchResource,
  updateStatusById,
} from "../../store/slices/allDataSlice.jsx";
import FullscreenErrorPopup from "../../components/FullscreenErrorPopup";
import { ToastContainer } from "react-toastify";
import { exportProductReport } from "../../store/slices/exportSlice";
import noImage from "../../../assets/images/missing-pictur.jpg";
import { showEmsg } from "../../utils/ShowEmsg.jsx";
import Tooltip from "../../components/Tooltip";
import SkeletonLoader from "../../components/SkeletonLoader";
<<<<<<< Updated upstream
import { getPermissionCode } from "../../utils/permissionUtils";
import { MODULES, PERMISSIONS, PLAN_LIMIT_RESOURCE } from "../../contants/constants.jsx";
import { useCreateAccess } from "../../hooks/useCreateAccess";
import { updatePlanResourceUsage } from "../../utils/planAccessUtils";
=======
import EmptyState from "../../components/EmptyState";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
>>>>>>> Stashed changes

const getStatusBadgeClass = (status) => {
  if (status === "active") return "status-active";
  if (status === "out-of-stock") return "status-inactive";
  return "status-active";
};

const getTotalStock = (variant) => {
  // New API: Quantity directly on variant
  if (variant?.Quantity !== undefined) return variant.Quantity || 0;
  // Old API: Inventory array
  if (Array.isArray(variant?.Inventory)) {
    return variant.Inventory.reduce((total, item) => total + (item.Quantity || 0), 0);
  }
  return 0;
};

const getFirstImage = (productVariantImages) => {
  if (Array.isArray(productVariantImages) && productVariantImages.length > 0) {
    const sortedImages = productVariantImages.sort(
      (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)
    );
    return sortedImages[0].documentUrl;
  }
  return noImage;
};

const getBrandName = (product) => product.BrandName || "N/A";

const ProductList = () => {
  const [sSearchTerm, setSearchTerm] = useState("");
  const [sViewMode, setViewMode] = useState("table");
  const [nCurrentPage, setCurrentPage] = useState(1);
  const { t } = useTranslation();
  const itemsPerPage = ITEMS_PER_PAGE;
  const navigate = useNavigate();
  const [bShowFilterDropdown, setShowFilterDropdown] = useState(false);
  const [aProducts, setProducts] = useState([]);
  const [bLoading, setLoading] = useState(true);
  const [sError, setError] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [nTotalItems, setTotalItems] = useState(0);
  const [nTotalPages, setTotalPages] = useState(0);
  const { setTitle } = useTitle();
  const [statusPopup, setStatusPopup] = useState({ open: false, productId: null, newStatus: null });
  const [bFilterLoading, setFilterLoading] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [bSubmitting, setSubmitting] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [tableScrollTop, setTableScrollTop] = useState(0);
  const dispatch = useDispatch();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = "unset"; };
  }, []);

  const handleTableScroll = useCallback((e) => {
    setTableScrollTop(e.target.scrollTop);
  }, []);

  const categories = useSelector((state) => state.allData.resources.categories?.data || []);
  const brands = useSelector((state) => state.allData.resources.brands?.data || []);
  const stores = useSelector((state) => state.allData.resources.stores?.data || []);

  // Create access — permission + limit check
  const addProductPermissionCode = getPermissionCode(MODULES.PRODUCT, PERMISSIONS.CREATE_PRODUCT);
  const { canCreate: canAddProduct, disabledReason: addProductDisabledReason } =
    useCreateAccess(addProductPermissionCode, {
      actionType: "PRODUCT",
      noPermissionMsg: t("PRODUCTS.NO_CREATE_PERMISSION"),
      limitReachedMsg: t("PRODUCTS.LIMIT_REACHED"),
      planNotAvailableMsg: t("CREATE_ACTION.PLAN_NOT_AVAILABLE"),
    });

  useEffect(() => {
    if (bShowFilterDropdown) {
      dispatch(fetchResource({ key: "categories" }));
      dispatch(fetchResource({ key: "brands" }));
      dispatch(fetchResource({ key: "stores" }));
    }
  }, [bShowFilterDropdown, dispatch]);

  const defaultFilters = { category: "all", brand: "all", store: "all", status: "all" };
  const [oFilters, setFilters] = useState(defaultFilters);

  const handleClearFilters = () => {
    setFilters(defaultFilters);
    setCurrentPage(1);
  };

  const handleEdit = (productId) => navigate(`/edit-product/${productId}`);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");

      const params = {
        pageNumber: nCurrentPage,
        pageSize: itemsPerPage,
        searchText: sSearchTerm,
        isUserProductList: true,
      };

      if (oFilters.status && oFilters.status !== "all") {
        params.IsActive = oFilters.status === "true" ? true : false;
      }
      if (oFilters.brand && oFilters.brand !== "all") {
        const selectedBrand = brands.find((b) => b.BrandName === oFilters.brand);
        if (selectedBrand) params.brandId = [selectedBrand.BrandID];
      }
      if (oFilters.category && oFilters.category !== "all") {
        const selectedCategory = categories.find((c) => c.CategoryName === oFilters.category);
        if (selectedCategory) params.categoryId = [selectedCategory.CategoryID];
      }

      const oResponse = await apiGet(GETPRODUCTDETAILS, params, token);
      const resData = oResponse?.data;

      if (resData?.status?.toUpperCase() === STATUS.SUCCESS.toUpperCase()) {
        const rawProducts = Array.isArray(resData.data) ? resData.data : [];
        const transformedProducts = rawProducts.map((product) => {
          const variants = Array.isArray(product.Variants) ? product.Variants : [];
          const firstVariant = variants.find((v) => v.IsActive) || variants[0] || {};
          const stock = getTotalStock(firstVariant);
          const productId = product.ProductID || product.ProductId;
          // IsActive: use product root if present, else derive from variants
          const isActive = product.IsActive !== undefined && product.IsActive !== null
            ? Boolean(product.IsActive)
            : variants.length > 0
              ? variants.some((v) => v.IsActive === true)
              : false;
          return {
            ...product,
            ProductID: productId,
            IsActive: isActive,
            subCategory: product.CategoryName,
            MRP: firstVariant.MRP || "0.00",
            quantity: stock,
            brandName: getBrandName(product),
            firstImage: getFirstImage(firstVariant.ProductVariantImages || []),
            status: isActive && stock > 0 ? "active" : "out-of-stock",
          };
        });
        setProducts(transformedProducts);
        const totalRecords = resData.pagination?.totalRecords || 0;
        setTotalItems(totalRecords);
        setTotalPages(resData.pagination?.totalPages || 0);
        updatePlanResourceUsage(PLAN_LIMIT_RESOURCE.PRODUCTS, totalRecords);
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
    }
  }, [nCurrentPage, itemsPerPage, sSearchTerm, oFilters, t]);

  useEffect(() => {
    setInitialLoading(true);
    const timer = setTimeout(() => setInitialLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!bLoading && initialLoading) setInitialLoading(false);
  }, [bLoading, initialLoading]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => { setTitle(t("PRODUCTS.TITLE")); }, [setTitle, t]);

  const categoryOptions = [
    { value: "all", label: t("COMMON.ALL") },
    ...categories.map((cat) => ({ value: cat.CategoryName, label: cat.CategoryName })),
  ];
  const brandOptions = [
    { value: "all", label: t("COMMON.ALL") },
    ...brands.map((brand) => ({ value: brand.BrandName, label: brand.BrandName })),
  ];
  const storeOptions = [
    { value: "all", label: t("COMMON.ALL") },
    ...stores.map((store) => ({ value: store.StoreName, label: store.StoreName })),
  ];
  const statusOptions = STATUS_OPTIONS.map((opt) => ({ value: opt.value, label: t(opt.labelKey) }));

  const handleDropdownInputChange = (inputValue, filterName) => {
    const key = filterName === "category" ? "categories" : filterName === "brand" ? "brands" : "stores";
    dispatch(fetchResource({
      key,
      params: inputValue?.trim() ? { searchText: inputValue } : {},
    }));
  };

  const additionalFilters = [
    {
      label: t("PRODUCT_SETUP.TABS.CATEGORIES"),
      name: "category",
      value: oFilters.category,
      options: categoryOptions,
      placeholder: t("PRODUCT_SETUP.TABS.CATEGORIES"),
      searchable: true,
      searchPlaceholder: t("COMMON.SEARCH_CATEGORY"),
      onInputChange: (v) => handleDropdownInputChange(v, "category"),
    },
    {
      label: t("PRODUCT_SETUP.TABS.BRANDS"),
      name: "brand",
      value: oFilters.brand,
      options: brandOptions,
      placeholder: t("PRODUCT_SETUP.TABS.BRANDS"),
      searchable: true,
      searchPlaceholder: t("COMMON.SEARCH_BRAND"),
      onInputChange: (v) => handleDropdownInputChange(v, "brand"),
    },
    {
      label: t("COMMON.STATUS"),
      name: "status",
      value: oFilters.status,
      options: statusOptions,
    },
  ];

  const handleFilterChange = (e, filterName) => {
    if (initialLoadComplete) setFilterLoading(true);
    setFilters({ ...oFilters, [filterName]: e.target.value });
    setCurrentPage(1);
  };

  const handleExportProducts = async () => {
    setExportLoading(true);
    try {
      const brand = brands.find((b) => b.BrandName === oFilters.brand);
      const category = categories.find((c) => c.CategoryName === oFilters.category);
      const isActiveFilter = oFilters.status === "all" ? undefined : oFilters.status === "true";
      await dispatch(exportProductReport({
        searchText: sSearchTerm,
        isActive: isActiveFilter,
        brandId: brand ? [brand.BrandID] : undefined,
        categoryId: category ? [category.CategoryID] : undefined,
      })).unwrap();
    } catch (error) {
    } finally {
      setExportLoading(false);
    }
  };

  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, nTotalPages));
  const handlePageClick = (page) => setCurrentPage(page);

  useEffect(() => { setCurrentPage(1); }, [sSearchTerm, oFilters]);

  const handleStatusChange = (productId, currentIsActive) => {
    setStatusPopup({ open: true, productId, newStatus: !currentIsActive });
  };

  const handleStatusConfirm = async () => {
    setSubmitting(true);
    const { productId, newStatus } = statusPopup;
    try {
      const token = localStorage.getItem("token");
      const res = await apiPatch(`${UPDATE_PRODUCT_STATUS}/${productId}`, { IsActive: newStatus }, token);
      if (res?.data?.status?.toUpperCase() === STATUS.SUCCESS.toUpperCase()) {
        showEmsg(res.data.message || t("COMMON.STATUS_UPDATED"), STATUS.SUCCESS);
        await fetchProducts();
      } else {
        showEmsg(res?.data?.message || t("COMMON.API_ERROR"), STATUS.ERROR);
      }
    } catch (err) {
      showEmsg(err?.response?.data?.message || err?.message || t("COMMON.API_ERROR"), STATUS.ERROR);
    } finally {
      setStatusPopup({ open: false, productId: null, newStatus: null });
      setSubmitting(false);
    }
  };

  const handleStatusPopupClose = () => {
    setStatusPopup({ open: false, productId: null, newStatus: null });
  };

  const isLoading = bLoading || initialLoading || bFilterLoading;

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
        searchPlaceholder={t("PRODUCTS.SEARCH_PLACEHOLDER")}
        onClearFilters={handleClearFilters}
        onCreate={() => navigate("/Addproduct")}
        onAddVariants={() => navigate("/AddVariants")}
        actionType="PRODUCT"
        disableCreate={!canAddProduct}
        disableCreateReason={addProductDisabledReason}
        onExport={handleExportProducts}
        exportLabel={exportLoading ? t("COMMON.EXPORTING") : t("COMMON.EXPORT")}
      />

      {sViewMode === "table" ? (
        <div className="table-container-floating">
          <div className="table-wrapper-floating" onScroll={handleTableScroll}>
            <table className="table-base">
              <thead className={`table-head-floating ${tableScrollTop > 10 ? "table-head-floating-shadow" : ""}`}>
                <tr>
                  <th className="table-head-cell-floating text-left">{t("PRODUCTS.TITLE")}</th>
                  <th className="table-head-cell-floating text-center">{t("COMMON.CATEGORY")}</th>
                  <th className="table-head-cell-floating text-center">{t("PRODUCTS.BRAND")}</th>
                  <th className="table-head-cell-floating text-center">{t("COMMON.STATUS")}</th>
                  <th className="table-head-cell-floating text-center">{t("COMMON.ACTIONS")}</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {isLoading ? (
                  <SkeletonLoader type={SKELETON_TYPES.PRODUCT_TABLE} rows={8} />
                ) : sError ? (
                  <tr>
<<<<<<< Updated upstream
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      {sError}
=======
                    <td colSpan={5}>
                      <EmptyState type="error" title={sError} compact />
>>>>>>> Stashed changes
                    </td>
                  </tr>
                ) : aProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState type="products" title={t("PRODUCTS.NO_PRODUCTS")} description={t("COMMON.TRY_ADJUSTING_SEARCH_FILTERS")} compact />
                    </td>
                  </tr>
                ) : (
                  aProducts.map((product) => (
                    <tr key={product.ProductID} className="table-row">
                      <td className="table-cell text-left align-middle">
                        <div className="flex items-center p-2">
                          <div className="h-8 w-8 flex-shrink-0">
                            <img
                              className="h-8 w-8 rounded object-cover"
                              src={product.firstImage}
                              alt={product.ProductName}
                              onError={(e) => { e.target.onerror = null; e.target.src = noImage; }}
                            />
                          </div>
                          <div className="ml-3">
                            <Tooltip text={product.ProductName} position="top" align="left">
                              <div className="font-medium text-xs text-gray-900 ellipsis-text">
                                {product.ProductName}
                              </div>
                            </Tooltip>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell text-center align-middle">
                        <Tooltip text={product.subCategory} position="top">
                          <div className="ellipsis-text text-xs text-gray-700">
                            {product.subCategory}
                          </div>
                        </Tooltip>
                      </td>
                      <td className="table-cell text-center align-middle">
                        <Tooltip text={product.brandName} position="top">
                          <div className="ellipsis-text text-xs text-gray-700">
                            {product.brandName}
                          </div>
                        </Tooltip>
                      </td>
                      <td className="table-cell text-center align-middle">
                        <Switch
                          checked={product.IsActive}
                          onChange={() => handleStatusChange(product.ProductID, product.IsActive)}
                        />
                      </td>
                      <td className="table-cell text-center align-middle">
                        <ActionButtons
                          id={product.ProductID}
                          onEdit={handleEdit}
                          viewLink={`/productdetails/${product.ProductID}`}
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
        <div className="grid-container-floating">
          <div className="grid-wrapper-floating" onScroll={handleTableScroll}>
<<<<<<< Updated upstream
          {isLoading ? (
              <SkeletonLoader type={SKELETON_TYPES.PRODUCT_GRID} rows={6} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {sError ? (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    {sError}
                  </div>
                ) : aProducts.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    {t("PRODUCTS.NO_PRODUCTS")}
                  </div>
                ) : (
                  aProducts.map((product) => (
=======
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {bLoading || initialLoading || bFilterLoading ? (
                <SkeletonLoader type={SKELETON_TYPES.PRODUCT_GRID} rows={6} className="p-4" />
              ) : aProducts.length === 0 ? (
                <EmptyState type="products" title={t("PRODUCTS.NO_PRODUCTS")} description={t("COMMON.TRY_ADJUSTING_SEARCH_FILTERS")} compact />
              ) : (
                aProducts.map((product) => (
>>>>>>> Stashed changes
                  <div
                    key={product.ProductID}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3 hover:shadow-lg transition-shadow duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 inline-flex text-[10px] leading-4 font-semibold rounded-full ${getStatusBadgeClass(product.status)}`}>
                        {product.status === PRODUCT_STATUS.ACTIVE ? PRODUCT_STATUS_LABELS.ACTIVE : PRODUCT_STATUS_LABELS.OUT_OF_STOCK}
                      </span>
                      <Switch
                        checked={product.IsActive}
                        onChange={() => handleStatusChange(product.ProductID, product.IsActive)}
                      />
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                        <img
                          src={product.firstImage}
                          alt={product.ProductName}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = noImage;
                            e.target.classList.remove("object-cover");
                            e.target.classList.add("object-contain", "bg-white");
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <Tooltip text={product.ProductName} position="top" align="left">
                          <div className="text-xs font-medium text-gray-900 ellipsis-text">
                            {product.ProductName}
                          </div>
                        </Tooltip>
                      </div>
                    </div>
                    <div className="text-xs text-gray-700 mt-2 ellipsis-text" title={product.subCategory}>
                      <span className="font-medium">{t("COMMON.CATEGORY")}</span>{" "}{product.subCategory}
                    </div>
                    <div className="text-xs text-gray-700 mt-2 ellipsis-text" title={product.brandName}>
                      <span className="font-medium">{t("PRODUCTS.BRAND")}</span>{" "}{product.brandName}
                    </div>
                    <ActionButtons
                      id={product.ProductID}
                      onEdit={handleEdit}
                      viewLink={`/productdetails/${product.ProductID}`}
                    />
                  </div>
                ))
              )}
            </div>
          )}
          </div>
        </div>
      )}
<<<<<<< Updated upstream

      {!sError && nTotalItems > 0 && (
        (bLoading || bFilterLoading) ? (
          <SkeletonLoader type="pagination" />
        ) : (
          <Pagination
            currentPage={nCurrentPage}
            totalPages={nTotalPages}
            totalItems={nTotalItems}
            itemsPerPage={itemsPerPage}
            handlePrevPage={handlePrevPage}
            handleNextPage={handleNextPage}
            handlePageClick={handlePageClick}
          />
        )
=======
      {!sError && !bLoading && !bFilterLoading && (
        <Pagination
          currentPage={nCurrentPage}
          totalPages={nTotalPages}
          totalItems={nTotalItems}
          itemsPerPage={itemsPerPage}
          handlePrevPage={handlePrevPage}
          handleNextPage={handleNextPage}
          handlePageClick={handlePageClick}
        />
>>>>>>> Stashed changes
      )}

      {statusPopup.open && (
        <FullscreenErrorPopup
          title={t("PRODUCTS.CONFIRM_STATUS_TITLE")}
          message={statusPopup.newStatus ? t("PRODUCTS.CONFIRM_ACTIVATE_MESSAGE") : t("PRODUCTS.CONFIRM_DEACTIVATE_MESSAGE")}
          onClose={handleStatusPopupClose}
          onConfirm={handleStatusConfirm}
          isSubmitting={bSubmitting}
        />
      )}
    </div>
  );
};

export default ProductList;
