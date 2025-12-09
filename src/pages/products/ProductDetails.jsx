import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiGet } from "../../utils/ApiUtils";
import { GET_PRODUCT_BY_ID } from "../../contants/apiRoutes";
import { useTitle } from "../../context/TitleContext";
import BackButton from "../../components/BackButton";
import Loader from "../../components/Loader";
import { showEmsg } from "../../utils/ShowEmsg";
import { STATUS } from "../../contants/constants";
import {
  ArrowLeft,
  Package,
  Store,
  Tag,
  Info,
  Check,
  X,
  Image as ImageIcon,
  Grid,
  List,
  Eye,
  DollarSign,
  Percent,
  Edit2,
  IndianRupee,
} from "lucide-react";
import { SingleStoreInventoryTable } from "../products/SingleStoreInventoryTable";
import { MatrixInventoryTable } from "../products/MatrixInventoryTable";
import { ScrollableMatrixInventoryTable } from "../products/ScrollableMatrixInventoryTable";
import { fetchResource } from "../../store/slices/allDataSlice.jsx";
import { useSelector, useDispatch } from "react-redux";
import SelectWithIcon from "../../components/SelectWithIcon.jsx";
const ProductDetails = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { setTitle, setBackButton } = useTitle();
  const dispatch = useDispatch();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("variants");
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [selectedImage, setSelectedImage] = useState(0);
  const [storeId, setStoreId] = useState("");

  useEffect(() => {
    setTitle(`${t("PRODUCTS.PRODUCTS_DETAILS")}`);
    setBackButton(<BackButton onClick={() => navigate("/productList")} />);
    fetchProductDetails();
    return () => {
      setBackButton(null);
      setTitle("");
    };
  }, [productId, setTitle, setBackButton, t, navigate]);
  useEffect(() => {
    dispatch(fetchResource({ key: "stores" }));
  }, [dispatch]);

  const stores = useSelector(
    (state) => state.allData.resources.stores?.data || []
  );

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await apiGet(
        `${GET_PRODUCT_BY_ID}/${productId}`,
        {},
        token
      );

      if (response?.data?.status === STATUS.SUCCESS.toUpperCase()) {
        setProduct(response.data.data);
      } else {
        throw new Error(response?.data?.message || t("COMMON.API_ERROR"));
      }
    } catch (err) {
      const errorMessage =
        err?.response?.data?.message || err?.message || t("COMMON.API_ERROR");
      setError(errorMessage);
      showEmsg(errorMessage, STATUS.ERROR);
    } finally {
      setLoading(false);
    }
  };

  const getVariantAttributes = (variant) => {
    const attributes = {};
    variant.Attributes.forEach((attr) => {
      attributes[attr.Name] = {
        id: attr.AttributeValueID,
        value: attr.Value,
        unit: attr.Unit,
      };
    });
    return attributes;
  };

  const calculateDiscount = (mrp, sellingPrice) => {
    if (!mrp || !sellingPrice || parseFloat(mrp) <= parseFloat(sellingPrice))
      return 0;
    return Math.round((1 - parseFloat(sellingPrice) / parseFloat(mrp)) * 100);
  };

  const getTotalInventory = (variant) => {
    return (
      variant.Inventory?.reduce(
        (total, store) => total + parseInt(store.Quantity),
        0
      ) || 0
    );
  };
  const handleVariantToggle = (variant, index, newState) => {
    // Update UI instantly
    const updated = [...product.Variants];
    updated[index].IsActive = newState;

    setProduct((prev) => ({
      ...prev,
      Variants: updated,
    }));
  };
  const handleStoreStatusToggle = (variant, store, newState) => {
    console.log("Toggle Store Status:", { variant, store, newState });

    // Update UI instantly
    setProduct((prev) => {
      const updated = { ...prev };
      const variantIndex = updated.Variants.findIndex(
        (v) => v.VariantID === variant.VariantID
      );

      updated.Variants[variantIndex].Inventory = updated.Variants[
        variantIndex
      ].Inventory.map((s) =>
        s.StoreID === store.StoreID ? { ...s, IsActive: newState } : s
      );

      return updated;
    });

    // TODO: If you want API update, I can write that too
    // updateStoreStatusAPI(store.StoreID, variant.VariantID, newState)
  };
  const openInventoryEditModal = (variant, store) => {
    setEditInventoryData({
      variant,
      store,
      quantity: store.Quantity,
      sellingPrice: store.SellingPrice,
      discount: store.DiscountPercentage,
    });

    setIsInventoryModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <X className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            {t("COMMON.ERROR")}
          </h2>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => navigate("/productList")}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {t("COMMON.BACK_TO_PRODUCTS")}
          </button>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Info className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">{t("PRODUCTS.NOT_FOUND")}</p>
        </div>
      </div>
    );
  }

  const currentVariant = product.Variants[selectedVariant];
  const totalInventory = product.Variants.reduce(
    (total, variant) => total + getTotalInventory(variant),
    0
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-4 py-2">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header Section */}
          <div className="border-b border-gray-200 px-8 py-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-xl font-bold text-custom-bg mb-2">
                  {product.ProductName}
                </h1>
                <div className="flex items-center gap-6 text-sm text-gray-600">
                  <span className="flex items-center">
                    <Package className="h-4 w-4 mr-1" />
                    <span>
                      {product.BrandName} - {product.CategoryName}
                    </span>
                  </span>
                  <span className="flex items-center">
                    <Tag className="h-4 w-4 mr-1" />
                    {t("PRODUCTS.PRODUCT_ID")}: {product.ProductID}
                  </span>
                  <span className="flex items-center">
                    <Info className="h-4 w-4 mr-1" />
                    <span>{product.IsActive ? "Active" : "Inactive"}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab("variants")}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === "variants"
                    ? "border-custom-bg text-custom-bg"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Grid className="h-4 w-4" />
                {t("PRODUCTS.VARIANTS")}
              </button>
              <button
                onClick={() => setActiveTab("inventory")}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === "inventory"
                    ? "border-custom-bg text-custom-bg"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Store className="h-4 w-4" />
                {t("STORES.INVENTORY")}
              </button>
              <button
                onClick={() => setActiveTab("specs")}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === "specs"
                    ? "border-custom-bg text-custom-bg"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Info className="h-4 w-4" />
                {t("PRODUCT_CREATION.SPECIFICATIONS")}
              </button>
            </nav>
          </div>

          {/* Variants Tab */}

          {activeTab === "variants" && (
            <div className="p-8">
              {/* All Variants Table Only (Main Image section removed) */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {t("PRODUCTS.PRODUCT_VARIANTS")}
                  </h3>
                  <span className="text-sm text-gray-600">
                    {t("PRODUCTS.TOTAL_VARIANTS")}: {product.Variants.length}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t("PRODUCT_CREATION.VARIANT")}
                        </th>

                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t("PRODUCT_CREATION.MRP")}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t("PRODUCT_CREATION.SELLING_PRICE")}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t("BANNER_FORM.DISCOUNT_PERCENTAGE")}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t("PRODUCTS.TOTAL_STOCK")}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t("COMMON.ACTIONS")}
                        </th>
                      </tr>
                    </thead>

                    <tbody className="bg-white divide-y divide-gray-200">
                      {product.Variants.map((variant, index) => {
                        const attributes = getVariantAttributes(variant);
                        const discount = calculateDiscount(
                          variant.MRP,
                          variant.SellingPrice
                        );
                        const totalStock = getTotalInventory(variant);

                        return (
                          <tr
                            key={variant.VariantID}
                            onClick={() => {
                              setSelectedVariant(index);
                              setSelectedImage(0);
                            }}
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              Variant {index + 1}
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                              ₹{parseFloat(variant.MRP).toFixed(2)}
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                              ₹{parseFloat(variant.SellingPrice).toFixed(2)}
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                              {discount > 0 ? (
                                <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">
                                  {discount}%
                                </span>
                              ) : (
                                <span className="text-gray-500">-</span>
                              )}
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  totalStock > 0
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {totalStock}
                              </span>
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <label className="inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={variant.IsActive}
                                  onChange={(e) =>
                                    handleVariantToggle(
                                      variant,
                                      index,
                                      e.target.checked
                                    )
                                  }
                                  className="sr-only peer"
                                />
                                <div
                                  className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 
    rounded-full peer peer-checked:bg-blue-600 relative transition-all"
                                >
                                  <span
                                    className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-all 
      peer-checked:translate-x-5"
                                  ></span>
                                </div>
                              </label>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Inventory Tab */}
          {activeTab === "inventory" && (
            <div className="p-8">
              {/* ------------------------------- */}
              {/*     STORE INVENTORY HEADER      */}
              {/* ------------------------------- */}

              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">
                  {t("PRODUCTS.STORE_INVENTORY")}
                </h3>

                <div className="w-60">
                  <SelectWithIcon
                    label={t("COMMON.STORE")}
                    id="StoreID"
                    name="StoreID"
                    value={storeId}
                    onChange={(e) => setStoreId(e.target.value)}
                    options={stores.map((store) => ({
                      value: store.StoreID,
                      label: store.StoreName,
                    }))}
                    Icon={Tag}
                    multiple
                    placeholder={
                      t("PRODUCT_CREATION.STORE_ID_PLACEHOLDER") ||
                      "Select store"
                    }
                  />
                </div>
              </div>

              {/* ---------------------------------------------------------- */}
              {/*           STORE COUNT LOGIC (Single / Matrix / Scroll)      */}
              {/* ---------------------------------------------------------- */}

              {(() => {
                const storeList = Array.from(
                  new Map(
                    product.Variants.flatMap((v) =>
                      v.Inventory.map((s) => [s.StoreID, s])
                    )
                  ).values()
                );
                const storeCount = storeList.length;

                /* ---------------------- */
                /* CASE 1: SINGLE STORE   */
                /* ---------------------- */
                if (storeCount === 1) {
                  return (
                    <SingleStoreInventoryTable
                      product={product}
                      getVariantAttributes={getVariantAttributes}
                      handleStoreStatusToggle={handleStoreStatusToggle}
                      openInventoryEditModal={openInventoryEditModal}
                    />
                  );
                }

                /* ---------------------------- */
                /* CASE 2: 2-6 STORES MATRIX    */
                /* ---------------------------- */
                if (storeCount > 1 && storeCount <= 6) {
                  return (
                    <MatrixInventoryTable
                      allStores={storeList}
                      product={product}
                      getVariantAttributes={getVariantAttributes}
                      handleStoreStatusToggle={handleStoreStatusToggle}
                      openInventoryEditModal={openInventoryEditModal}
                    />
                  );
                }

                /* ------------------------------- */
                /* CASE 3: 7+ STORES SCROLL MATRIX */
                /* ------------------------------- */
                return (
                  <ScrollableMatrixInventoryTable
                    allStores={storeList}
                    product={product}
                    getVariantAttributes={getVariantAttributes}
                    handleStoreStatusToggle={handleStoreStatusToggle}
                    openInventoryEditModal={openInventoryEditModal}
                  />
                );
              })()}
            </div>
          )}

          {/* Specifications Tab */}
          {activeTab === "specs" && (
            <div className="p-6">
              {/* Specifications Section */}
              {product.ProductSpecification?.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">
                    {t("PRODUCT_CREATION.SPECIFICATIONS")}
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {product.ProductSpecification.map((spec, index) => (
                      <div
                        key={index}
                        className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-base font-semibold text-gray-900">
                            {spec.Name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-blue-600">
                            {spec.Value}
                          </span>
                          {spec.Unit && (
                            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                              {spec.Unit}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Product Info */}
              <div className="mb-8 pt-6 border-t border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">
                  {t("PRODUCTS.ADDITIONAL_INFO")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="flex items-start gap-4 p-5 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <Package className="h-6 w-6 text-blue-600 flex-shrink-0" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">
                        {t("PRODUCT_CREATION.BRAND_ID")}
                      </p>
                      <p className="text-gray-700 text-lg font-medium">
                        {product.BrandName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-5 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <Tag className="h-6 w-6 text-green-600 flex-shrink-0" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">
                        {t("COMMON.CATEGORY")}
                      </p>
                      <p className="text-gray-700 text-lg font-medium">
                        {product.CategoryName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-5 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <IndianRupee className="h-6 w-6 text-purple-600 flex-shrink-0" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">
                        {t("PRODUCTS.PRICING_RANGE")}
                      </p>
                      <p className="text-gray-700 text-lg font-medium">
                        ₹
                        {Math.min(
                          ...product.Variants.map((v) =>
                            parseFloat(v.SellingPrice)
                          )
                        ).toLocaleString("en-IN")}{" "}
                        - ₹
                        {Math.max(
                          ...product.Variants.map((v) =>
                            parseFloat(v.SellingPrice)
                          )
                        ).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description Section - Moved to Last */}
              {product.ProductDescription && (
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">
                    {t("COMMON.DESCRIPTION")}
                  </h3>
                  <div
                    className="prose prose-gray max-w-none text-gray-700 bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
                    dangerouslySetInnerHTML={{
                      __html: product.ProductDescription,
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
