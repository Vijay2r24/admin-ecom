// AddProductForm.jsx
import React, { useState, useCallback, useEffect, useRef } from "react";
import { Plus, X, Upload, Tag, Hash, ShoppingBag, Layers, Scale } from "lucide-react";
import { useDropzone } from "react-dropzone";
import TextInputWithIcon from "../../components/TextInputWithIcon";
import SelectWithIcon from "../../components/SelectWithIcon";
import { useTranslation } from "react-i18next";
import { STATUS, FILETYPE, TYPE_GLOBAL } from "../../contants/constants.jsx";
import { useSelector, useDispatch } from "react-redux";
import { fetchResource } from "../../store/slices/allDataSlice.jsx";
import { apiGet, apiPost, apiPut } from "../../utils/ApiUtils.jsx";
import {
  CREATE_OR_UPDATE_PRODUCT,
  CREATE_PRODUCT,
  UPDATE_PRODUCT,
  GET_PRODUCT_BY_ID,
} from "../../contants/apiRoutes";
import { showEmsg } from "../../utils/ShowEmsg";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { useParams, useNavigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { useTitle } from "../../context/TitleContext";
import BackButton from "../../components/BackButton.jsx";
import Loader from "../../components/Loader";
import SkeletonLoader from "../../components/SkeletonLoader";
import { SKELETON_TYPES } from "../../contants/constants.jsx";
import { hideLoaderWithDelay } from "../../utils/loaderUtils";
import ImageCropperModal from "../../components/ImageCropperModal";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import VariantPreviewCard from "../../pages/products/VariantPreviewCard.jsx";
import Accordion from "../../components/products/Accordion.jsx";
import ImageManagement from "../../components/products/ImagesManager.jsx";
import VariantTabs from "../../components/products/VariantTabs.jsx";
import ShippingSection from "../../components/products/ShippingSection.jsx";
import AddPackageModal from "../../components/products/AddPackageModal.jsx";
import EditPackageModal from "../../components/products/EditPackageModal.jsx";
import FloatingFooter from "../../components/FloatingFooter.jsx";

/* ------------------------- AddProductForm — patched ------------------------- */

const AddProductForm = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { setTitle, setBackButton } = useTitle();
  const { t } = useTranslation();
  const [showPreview, setShowPreview] = useState(false);

  // -------------------------
  // Main states
  // -------------------------
  const [aVariants, setVariants] = useState([
    {
      id: crypto?.randomUUID?.() || Math.random().toString(36).slice(2),
      attributes: [],
      Quantity: "",
      MRP: "",
      DiscountPercentage: "",
      ProductDiscount: "",
      SellingPrice: "",
      StoreID: "",
      images: [],
    },
  ]);

  const [aAttributes, setAAttributes] = useState([]);
  const [attributesByType, setAttributesByType] = useState({}); // Store attributes per type
  // Stable id→label map per attribute type (used by VariantTabs; never fall back to raw UUIDs)
  const [localAttributeOptions, setLocalAttributeOptions] = useState({});
  const [currentFetchingType, setCurrentFetchingType] = useState(null); // Track which type is being fetched

  const getAttrValueId = (val) =>
    String(
      val?.AttributeValueID ||
        val?.attributeValueID ||
        val?.attributeValueId ||
        val?.id ||
        ""
    );

  const formatAttrValueLabel = (val) => {
    const value = val?.Value || val?.value || val?.Name || val?.name || "";
    const unit = val?.Unit || val?.unit;
    if (!value) return "";
    return unit ? `${value} (${unit})` : String(value);
  };

  const cacheAttributeOptionsForType = (typeId, list) => {
    const key = String(typeId);
    const rows = Array.isArray(list) ? list : [];
    setAttributesByType((prev) => ({ ...prev, [key]: rows }));
    setLocalAttributeOptions((prev) => ({
      ...prev,
      [key]: rows
        .map((val) => {
          const id = getAttrValueId(val);
          const label = formatAttrValueLabel(val);
          if (!id || !label) return null;
          return { id, label };
        })
        .filter(Boolean),
    }));
  };

  const [oFormData, setFormData] = useState({
    ProductName: "",
    ProductDescription: "",
    BrandID: "",
    CategoryID: "",
    StoreID: "",
    CreatedBy: "Admin",
    TenantID: localStorage.getItem("tenantID"),
    SpecificationTypeID: "",
  });

  const [shippingData, setShippingData] = useState({
    package: "",
    weight: "",
    weightUnit: "kg",
    countryOfOrigin: "",
    hsCode: "",
  });

  const [customPackages, setCustomPackages] = useState([]);
  const [aSpecifications, setSpecifications] = useState([
    {
      SpecificationTypeID: "",
      Value: "",
    },
  ]);
  const [oValidationErrors, setValidationErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [groupingAttributeTypeID, setGroupingAttributeTypeID] = useState("");
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [reorderVariantIndex, setReorderVariantIndex] = useState(null);
  const [showAddPackageModal, setShowAddPackageModal] = useState(false);
  const [showEditPackageModal, setShowEditPackageModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [currentShippingVariantIndex, setCurrentShippingVariantIndex] = useState(null);
  const [tempImages, setTempImages] = useState([]);
  const [hasFetchedProduct, setHasFetchedProduct] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Global images map: { [groupKey]: [images...] }
  const [groupGlobalImages, setGroupGlobalImages] = useState({});
  // fallback labels for attribute values from product payload (edit mode)
  const attributeLabelMapRef = useRef({});
  // Store attribute map from product fetch for later update
  const attributeMapForUpdateRef = useRef({});

  // ---------- UNIFIED MULTI-CROP QUEUE STATE ----------
  // cropQueue items: { file, url, type: 'variant'|'global', variantIndex?, groupKey?, id }
  const [cropQueue, setCropQueue] = useState([]);
  // cropperModal keeps current item details for rendering modal
  const [cropperModal, setCropperModal] = useState({
    isOpen: false,
    image: "",
    variantIndex: null,
    originalFile: null,
    type: "variant",
    groupKey: null,
  });

  // track active object URLs so we can revoke them reliably
  const activeUrlsRef = useRef(new Set());

  // cleanup on unmount: revoke any remaining object URLs
  useEffect(() => {
    return () => {
      activeUrlsRef.current.forEach((u) => {
        try {
          URL.revokeObjectURL(u);
        } catch (e) {
          // ignore
        }
      });
      activeUrlsRef.current.clear();
    };
  }, []);

  // Sensors for dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  // Refs
  const productNameRef = useRef(null);
  const brandRef = useRef(null);
  const categoryRef = useRef(null);
  const productDescriptionRef = useRef(null);
  const variantRefs = useRef(new Map());

  // Select lists from store
  const attributeTypes = useSelector(
    (state) => state.allData.resources.attributeTypes?.data || []
  );
  const attributes = useSelector(
    (state) => state.allData.resources.attributes?.data || []
  );
  const brands = useSelector(
    (state) => state.allData.resources.brands?.data || []
  );
  const categories = useSelector(
    (state) => state.allData.resources.categories?.data || []
  );
  
  // Filter categories to only include child categories (ParentCategoryID is not null/undefined)
  const childCategories = [
    {
      value: "",
      label: t("PRODUCT_CREATION.CATEGORY_ID_PLACEHOLDER"),
    },
    ...categories
      .filter(
        (cat) =>
          (cat.ParentCategoryID !== null && cat.ParentCategoryID !== undefined) &&
          cat.IsActive === true
      )
      .map((cat) => ({
        value: cat.CategoryID,
        label: cat.CategoryName,
      }))
  ];
  const stores = useSelector(
    (state) => state.allData.resources.stores?.data || []
  );
  const specificationTypes = useSelector(
    (state) => state.allData.resources.specificationType?.data || []
  );
  const packagingBoxes = useSelector(
    (state) => state.allData.resources.packagingBoxes?.data || []
  );
  const weightUnits = useSelector(
    (state) => state.allData.resources.weightUnits?.data || []
  );
  const countries = useSelector(
    (state) => state.allData.resources.countries?.data || []
  );

  useEffect(() => {
    dispatch(fetchResource({ key: "brands" }));
    dispatch(fetchResource({ key: "categories" }));
    dispatch(fetchResource({ key: "stores" }));
    dispatch(fetchResource({ key: "attributeTypes" }));
    dispatch(fetchResource({ key: "specificationType" }));
    dispatch(fetchResource({ key: "packagingBoxes" }));
    dispatch(fetchResource({ key: "weightUnits" }));
    dispatch(fetchResource({ key: "countries" }));
  }, [dispatch]);

  // -------------------------
  // Price helpers
  // -------------------------
  const calculateSellingPrice = (mrp, discount) => {
    const mrpValue = parseFloat(mrp) || 0;
    const discountValue = parseFloat(discount) || 0;
    if (mrpValue <= 0 || discountValue < 0) return "";
    return (mrpValue - (mrpValue * discountValue) / 100).toFixed(2);
  };
  // Resolve a human-readable label for an attribute value ID (never fall back to raw UUID)
  const resolveAttributeValueLabel = (typeId, valueId) => {
    if (!valueId) return "";
    const id = String(valueId);
    const typeKey = String(typeId);

    const fromOptions = (
      localAttributeOptions[typeKey] ||
      localAttributeOptions[typeId] ||
      []
    ).find((o) => String(o.id) === id);
    if (fromOptions?.label) return fromOptions.label;

    const typeAttrs =
      attributesByType[typeKey] || attributesByType[typeId] || [];
    const valObj =
      typeAttrs.find((a) => getAttrValueId(a) === id) ||
      attributes.find((a) => getAttrValueId(a) === id);

    if (valObj) {
      const label = formatAttrValueLabel(valObj);
      if (label) return label;
    }

    const fromMap =
      attributeLabelMapRef.current?.[typeKey]?.[id] ||
      attributeLabelMapRef.current?.[typeId]?.[id];
    if (fromMap && String(fromMap) !== id) return String(fromMap);
    return "";
  };

  // Resolve a human-readable label for an attribute value (prefer store data, fall back to payload)
  const getAttributeValueLabel = (attr) => {
    if (!attr) return "";
    const valueId = attr.AttributeValueIDs?.[0];
    if (!valueId) return "";

    const resolved = resolveAttributeValueLabel(attr.AttributeTypeID, valueId);
    if (resolved) return resolved;

    const valueLabel = attr.Value || attr.value || "";
    const unitLabel = attr.Unit || attr.unit;
    return valueLabel ? `${valueLabel}${unitLabel ? ` (${unitLabel})` : ""}` : "";
  };
  const selectedBrandName = brands.find(
    (b) => b.BrandID === oFormData.BrandID
  )?.BrandName;

  // -------------------------
  // Fetch existing product (keep original logic - adapted)
  // -------------------------
  useEffect(() => {
    if (productId) {
      const fetchProduct = async () => {
        setIsLoading(true);
        try {
          const token = localStorage.getItem("token");
          const response = await apiGet(
            `${GET_PRODUCT_BY_ID}/${productId}`,
            {},
            token
          );

          if (response.data.status?.toUpperCase() === STATUS.SUCCESS.toUpperCase()) {
            const product = response.data?.data;
            setHasFetchedProduct(true);

            const mappedSpecifications = Array.isArray(
              product.ProductSpecification
            )
              ? product.ProductSpecification.map((spec) => ({
                SpecificationTypeID:
                  spec.SpecificationTypeID ||
                  spec.SpecificatiobnTypeID ||
                  spec.specificatiobnTypeID ||
                  "",
                Value: spec.Value || "",
                Unit: spec.Unit ?? "",
              }))
              : [];

            const attributeTypeIdsToFetch = new Set();

            // Collect all StoreIDs from all variants' Inventory arrays for initial form selection
            const allStoreIDs = new Set();
            product.Variants?.forEach((variant) => {
              if (Array.isArray(variant.Inventory)) {
                variant.Inventory.forEach((inv) => {
                  if (inv.StoreID) {
                    allStoreIDs.add(inv.StoreID);
                  }
                });
              }
            });
            const storeIDsArray = Array.from(allStoreIDs);

            // basic form data
            setFormData({
              ProductName: product.ProductName || "",
              ProductDescription: product.ProductDescription || "",
              BrandID: product.BrandID || "",
              CategoryID: product.CategoryID || "",
              // Initialize with StoreIDs from Inventory, but user can change selection
              // Only selected StoreIDs will be used in submission
              StoreID:
                storeIDsArray.length > 0
                  ? storeIDsArray.length === 1
                    ? storeIDsArray[0]
                    : storeIDsArray
                  : "",
              CreatedBy: product.CreatedBy || "Admin",
              TenantID: localStorage.getItem("tenantID") || "",
              SpecificationTypeID:
                mappedSpecifications?.[0]?.SpecificationTypeID ||
                product.ProductSpecification?.[0]?.SpecificatiobnTypeID ||
                "",
            });

            // Set groupingAttributeTypeID from product metadata if exists
            if (product.Metadata?.GroupBy) {
              setGroupingAttributeTypeID(product.Metadata.GroupBy);
            }

            // Set shipping data if exists
            if (product.Shipping) {
              setShippingData({
                package: product.Shipping.Package || "",
                weight: product.Shipping.Weight || "",
                weightUnit: product.Shipping.WeightUnit || "kg",
                countryOfOrigin: product.Shipping.CountryOfOrigin || "",
                hsCode: product.Shipping.HSCode || "",
              });
            }

            setSpecifications(
              mappedSpecifications.length
                ? mappedSpecifications
                : [
                  {
                    SpecificationTypeID: "",
                    Value: "",
                  },
                ]
            );

            // attributes from backend -> transform to aAttributes shape
            const attributeMap = {};
            const attributeLabelMap = {}; // fallback labels from API payload
            product.Variants.forEach((variant) => {
              variant.Attributes?.forEach((attr) => {
                const typeId = attr.AttributeTypeID;
                const valId =
                  attr.AttributeValueID ||
                  attr.AttributeValueId ||
                  attr.attributeValueID;
                if (!typeId || !valId) return;
                attributeTypeIdsToFetch.add(typeId);
                if (!attributeMap[typeId]) attributeMap[typeId] = new Set();
                attributeMap[typeId].add(valId);
                // store payload value/unit as a fallback label
                if (!attributeLabelMap[typeId]) attributeLabelMap[typeId] = {};
                attributeLabelMap[typeId][valId] =
                  attr.Value ||
                  attr.value ||
                  attr.Name ||
                  attr.name ||
                  String(valId);
              });
            });

            attributeTypeIdsToFetch.forEach((typeId) =>
              dispatch(
                fetchResource({
                  key: "attributes", // Pass selected attribute type so API can filter values server-side
                  params: { AttributeTypeID: typeId, attributeTypeId: typeId },
                })
              ).then((action) => {
                // Store the fetched attributes in attributesByType when API call succeeds
                if (action.meta?.requestStatus === "fulfilled" && action.payload?.data) {
                  cacheAttributeOptionsForType(typeId, action.payload.data);
                }
              })
            );
            attributeLabelMapRef.current = attributeLabelMap;

            // Store attribute map for later use when attributes are loaded
            const attributeMapForUpdate = { ...attributeMap };

            const transformedAttributes = Object.keys(attributeMap).map(
              (typeId) => {
                const type = attributeTypes.find(
                  (t) => String(t.AttributeTypeID) === String(typeId)
                );
                const vals = Array.from(attributeMap[typeId]).map((vid) => {
                  const a = attributes.find(
                    (x) =>
                      String(x.AttributeValueID || x.attributeValueID) ===
                      String(vid)
                  );
                  return {
                    id: vid,
                    label:
                      a?.Value ||
                      a?.value ||
                      attributeLabelMap?.[typeId]?.[vid] ||
                      String(vid),
                  };
                });
                return {
                  AttributeTypeID: typeId,
                  AttributeValueIDs: vals.map((v) => v.id),
                  typeName: type ? type.Name || type.name : "",
                  valueLabels: vals.map((v) => v.label),
                };
              }
            );

            setAAttributes(
              transformedAttributes.length > 0
                ? transformedAttributes
                : [
                  {
                    AttributeTypeID: "",
                    AttributeValueIDs: [],
                    typeName: "",
                    valueLabels: [],
                  },
                ]
            );

            // Store attribute map in ref for useEffect to use
            attributeMapForUpdateRef.current = attributeMapForUpdate;

            const variants =
              product.Variants?.map((v) => {
                // Handle multiple Inventory items (multiple stores per variant)
                const inventoryArray = Array.isArray(v.Inventory)
                  ? v.Inventory
                  : [];
                const firstInventory = inventoryArray[0] || {};

                // Use first inventory values as defaults, or aggregate if needed
                const quantity = firstInventory.Quantity || "";
                const discountPercentage =
                  firstInventory.DiscountPercentage || "";
                const sellingPrice = firstInventory.SellingPrice || "";

                return {
                  id: v.VariantID || crypto?.randomUUID?.(),
                  VariantID: v.VariantID,

                  // ✅ ATTRIBUTES - handle empty arrays
                  attributes: Array.isArray(v.Attributes)
                    ? v.Attributes.map((attr) => {
                      const attrValueId =
                        attr.AttributeValueID ||
                        attr.AttributeValueId ||
                        attr.attributeValueID;
                      return {
                        AttributeTypeID: attr.AttributeTypeID,
                        AttributeValueIDs: [attrValueId],
                        Name: attr.Name,
                        Value: attr.Value,
                        Unit: attr.Unit,
                      };
                    })
                    : [],

                  // ✅ CORRECT INVENTORY FIELDS (use first inventory entry)
                  Quantity: quantity,
                  MRP: v.MRP || "",
                  // Backend sends DiscountPercentage; UI field uses ProductDiscount as well
                  DiscountPercentage: discountPercentage,
                  ProductDiscount: discountPercentage,
                  SellingPrice: sellingPrice,
                  StoreID: firstInventory.StoreID || oFormData.StoreID,

                  // ✅ CORRECT IMAGE KEY
                  images:
                    v.ProductVariantImages?.sort(
                      (a, b) => a.sortOrder - b.sortOrder
                    ).map((img) => ({
                      id: img.documentId,
                      documentId: img.documentId,
                      preview: img.documentUrl,
                      documentUrl: img.documentUrl,
                      sortOrder: img.sortOrder,
                      isExisting: true,
                    })) || [],

                  removedImages: [],

                  // ✅ SHIPPING / PACKAGING DATA
                  shippingData: {
                    package: v.PackagingBoxID || "",
                    weight: v.Weight || "",
                    weightUnit: v.Unit || "kg",
                    countryOfOrigin: v.CountryCode || "",
                    hsCode: v.HSCode || "",
                  },
                };
              }) || [];

            setVariants(
              variants.length > 0
                ? variants
                : [
                  {
                    id:
                      crypto?.randomUUID?.() ||
                      Math.random().toString(36).slice(2),
                    attributes: [],
                    Quantity: "",
                    MRP: "",
                    SellingPrice: "",
                    StoreID: "",
                    images: [],
                  },
                ]
            );
          }
        } catch (error) {
          showEmsg(t("PRODUCT_CREATION.FETCH_PRODUCT_FAILED"), STATUS.ERROR);
        } finally {
          setIsLoading(false);
        }
      };

      fetchProduct();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  useEffect(() => {
    setTitle(
      productId ? t("PRODUCTS.EDIT_PRODUCT") : t("PRODUCTS.ADD_NEW_PRODUCT")
    );
    setBackButton(<BackButton onClick={() => window.history.back()} />);
    return () => setBackButton(null);
  }, [setTitle, setBackButton, t, productId]);

  // -------------------------
  // Attribute row helpers
  // -------------------------
  const addAttributeRow = () => {
    setAAttributes((prev) => [
      ...prev,
      {
        AttributeTypeID: "",
        AttributeValueIDs: [],
        typeName: "",
        valueLabels: [],
      },
    ]);
  };

  const removeAttributeRow = (index) => {
    setAAttributes((prev) => {
      const next = prev.filter((_, i) => i !== index);
      regenerateVariants(next);
      return next;
    });
  };

            const handleAttributeTypeChange = (index, typeId) => {
        setAAttributes((prev) =>
      prev.map((attr, i) =>
        i === index
          ? {
              ...attr,
              AttributeTypeID: typeId,
              AttributeValueIDs: [],
              valueLabels: [],
              typeName:
                attributeTypes.find(
                  (t) => String(t.AttributeTypeID) === String(typeId)
                )?.Name || "",
            }
          : attr
      )
    );
    // Always fetch attribute values for the selected attribute type
    if (typeId) {
            setCurrentFetchingType(typeId);
      dispatch(
        fetchResource({
          key: "attributes",
          params: { AttributeTypeID: typeId, attributeTypeId: typeId },
        })
      ).then((action) => {
        // Store the fetched attributes directly when API call succeeds
        if (action.meta?.requestStatus === "fulfilled" && action.payload?.data) {
          cacheAttributeOptionsForType(typeId, action.payload.data);
          setCurrentFetchingType(null);
        }
      });
    }
  };
  const handleAttributeValuesChange = (index, selectedValueIDs, optionsForType = null) => {
    const currentAttr = aAttributes[index];
    const typeKey = String(currentAttr?.AttributeTypeID || "");
    const options =
      optionsForType ||
      localAttributeOptions[typeKey] ||
      localAttributeOptions[currentAttr?.AttributeTypeID] ||
      [];

    const valueLabels = (selectedValueIDs || []).map((vid) => {
      const fromOpt = options.find((o) => String(o.id ?? o.value) === String(vid));
      if (fromOpt?.label && String(fromOpt.label) !== String(vid)) {
        return fromOpt.label;
      }
      return resolveAttributeValueLabel(currentAttr?.AttributeTypeID, vid);
    });

    // Keep a label map so VariantTabs can resolve even if Redux attributes are empty
    if (typeKey) {
      const nextMap = { ...(attributeLabelMapRef.current || {}) };
      const typeMap = { ...(nextMap[typeKey] || {}) };
      (selectedValueIDs || []).forEach((vid, idx) => {
        if (valueLabels[idx]) typeMap[String(vid)] = valueLabels[idx];
      });
      nextMap[typeKey] = typeMap;
      attributeLabelMapRef.current = nextMap;

      // Persist labels into localAttributeOptions so Variant tabs never show raw IDs
      setLocalAttributeOptions((prevOpts) => {
        const existing = prevOpts[typeKey] || [];
        const byId = new Map(existing.map((o) => [String(o.id), o]));
        (selectedValueIDs || []).forEach((vid, idx) => {
          if (valueLabels[idx]) {
            byId.set(String(vid), { id: String(vid), label: valueLabels[idx] });
          }
        });
        return { ...prevOpts, [typeKey]: Array.from(byId.values()) };
      });
    }

    setAAttributes((prev) =>
      prev.map((attr, i) =>
        i === index
          ? {
              ...attr,
              AttributeValueIDs: selectedValueIDs,
              valueLabels,
            }
          : attr
      )
    );

    setTimeout(() => {
      regenerateVariants(
        aAttributes.map((attr, i) =>
          i === index
            ? {
                ...attr,
                AttributeValueIDs: selectedValueIDs,
                valueLabels,
              }
            : attr
        )
      );
    }, 0);
  };

  // -------------------------
  // Variant generation (Shopify-like)
  // -------------------------
  const regenerateVariants = (attributesInput) => {
    const attrs = (attributesInput || aAttributes).filter(
      (a) => a.AttributeTypeID && a.AttributeValueIDs?.length
    );

    if (attrs.length === 0) {
      // In edit mode with no attributes, keep existing variants (don't overwrite)
      if (productId && hasFetchedProduct && aVariants.length > 0) return;
      setVariants([
        {
          id: crypto?.randomUUID?.() || Math.random().toString(36).slice(2),
          attributes: [],
          Quantity: "",
          MRP: "",

          DiscountPercentage: "",
          ProductDiscount: "",
          SellingPrice: "",
          StoreID: oFormData.StoreID,
          images: [],
          shippingData: {
            package: "",
            weight: "",
            weightUnit: "",
            countryOfOrigin: "",
            hsCode: "",
          },
        },
      ]);
      return;
    }

    const combine = ([first, ...rest]) => {
      if (!first) return [[]];
      const restCombs = combine(rest);
      return first.AttributeValueIDs.flatMap((val) =>
        restCombs.map((comb) => [
          { AttributeTypeID: first.AttributeTypeID, AttributeValueIDs: [val] },
          ...comb,
        ])
      );
    };

    const combos = combine(attrs);

    const newVariants = combos.map((combo) => {
      // try to preserve matching variant data/images
      const match = aVariants.find((v) => {
        if (!v.attributes || v.attributes.length !== combo.length) return false;
        return combo.every((c) =>
          v.attributes.some(
            (va) =>
              String(va.AttributeTypeID) === String(c.AttributeTypeID) &&
              String(va.AttributeValueIDs?.[0]) ===
              String(c.AttributeValueIDs?.[0])
          )
        );
      });

      return {
        id:
          (match && match.id) ||
          crypto?.randomUUID?.() ||
          Math.random().toString(36).slice(2),
        VariantID: match?.VariantID || undefined,
        attributes: combo,
        Quantity: match?.Quantity || "",
        MRP: match?.MRP || "",
        DiscountPercentage:
          match?.DiscountPercentage || match?.ProductDiscount || "",
        ProductDiscount:
          match?.ProductDiscount || match?.DiscountPercentage || "",
        SellingPrice: match?.SellingPrice || "",
        StoreID: match?.StoreID || oFormData.StoreID,
        images: match?.images?.length ? match.images : [],
        removedImages: match?.removedImages || [],
        shippingData: match?.shippingData || {
          package: "",
          weight: "",
          weightUnit: "kg",
          countryOfOrigin: "",
          hsCode: "",
        },
      };
    });

    setVariants(newVariants);
  };

  useEffect(() => {
    regenerateVariants(aAttributes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aAttributes, oFormData.StoreID]);

  // Update aAttributes when attributes are loaded from Redux (for edit mode)
  useEffect(() => {
    if (
      hasFetchedProduct &&
      Object.keys(attributeMapForUpdateRef.current).length > 0 &&
      attributes.length > 0
    ) {
      const attributeMap = attributeMapForUpdateRef.current;
      const attributeLabelMap = attributeLabelMapRef.current;

      const transformedAttributes = Object.keys(attributeMap).map((typeId) => {
        const type = attributeTypes.find(
          (t) => String(t.AttributeTypeID) === String(typeId)
        );
        const vals = Array.from(attributeMap[typeId]).map((vid) => {
          const a = attributes.find(
            (x) =>
              String(x.AttributeValueID || x.attributeValueID) === String(vid)
          );
          return {
            id: vid,
            label:
              a?.Value ||
              a?.value ||
              attributeLabelMap?.[typeId]?.[vid] ||
              String(vid),
          };
        });
        return {
          AttributeTypeID: typeId,
          AttributeValueIDs: vals.map((v) => v.id),
          typeName: type ? type.Name || type.name : "",
          valueLabels: vals.map((v) => v.label),
        };
      });

      // Only update if we have valid attributes
      if (transformedAttributes.length > 0) {
        setAAttributes(transformedAttributes);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attributes, attributeTypes, hasFetchedProduct]);

  // -------------------------
  // Variant helpers
  // -------------------------
  const deleteVariant = (variantId) => {
    setVariants((prev) => prev.filter((v) => v.id !== variantId));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Ensure StoreID is always an array when multiple selection is enabled
    let processedValue = value;
    if (name === "StoreID") {
      // If value is an array, use it directly (removal handled by SelectWithIcon)
      // If it's a single value, convert to array
      if (Array.isArray(value)) {
        processedValue = value; // Already an array, removal already handled
      } else if (value) {
        processedValue = [value];
      } else {
        processedValue = []; // Empty array when no selection
      }
    }

    setFormData((prev) => ({
      ...prev,
      [name]: processedValue,
    }));
    setValidationErrors((prev) => ({
      ...prev,
      [name]: undefined,
    }));
  };

  const handleShippingChange = (name, value) => {
    setShippingData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setValidationErrors((prev) => ({
      ...prev,
      [`shipping_${name}`]: undefined,
    }));
  };

  const handleAddPackage = (newPackage) => {
    setCustomPackages((prev) => [...prev, newPackage]);
    
    // If "Use as default" is checked, set it as the selected package
    if (newPackage.useAsDefault) {
      setShippingData((prev) => ({
        ...prev,
        package: newPackage.value,
      }));
    }
  };

  const handleVariantChange = (index, field, value) => {
    setVariants((prevVariants) => {
      const newVariants = [...prevVariants];
      newVariants[index] = {
        ...newVariants[index],
        [field]: value,
      };

      // Sync both fields to avoid stale data precedence issues
      // If we update ProductDiscount, also update DiscountPercentage, and vice versa.
      if (field === "ProductDiscount") {
        newVariants[index].DiscountPercentage = value;
      } else if (field === "DiscountPercentage") {
        newVariants[index].ProductDiscount = value;
      }

      // Auto-calc selling price if MRP or discount changes
      // Handle both DiscountPercentage and ProductDiscount field names
      if (
        field === "MRP" ||
        field === "DiscountPercentage" ||
        field === "ProductDiscount"
      ) {
        const mrp = field === "MRP" ? value : newVariants[index].MRP;
        const discount =
          field === "DiscountPercentage" || field === "ProductDiscount"
            ? value
            : newVariants[index].DiscountPercentage ||
            newVariants[index].ProductDiscount ||
            0;
        newVariants[index].SellingPrice = calculateSellingPrice(mrp, discount);
      }

      return newVariants;
    });
    setValidationErrors((prev) => ({
      ...prev,
      [`variant_${index}_${field}`]: undefined,
    }));
  };

  // -------------------------
  // ENQUEUE FILES FOR CROPPER (used by VariantImageUpload and GlobalImageUpload)
  // meta: number (variantIndex) or { type: 'global', groupKey }
  // -------------------------
  const enqueueFilesForCrop = useCallback((acceptedFiles, meta) => {
    if (!acceptedFiles || acceptedFiles.length === 0) return;

    const items = acceptedFiles.map((file) => {
      const url = URL.createObjectURL(file);
      activeUrlsRef.current.add(url);

      return {
        file,
        url,
        type:
          meta && meta.type
            ? meta.type
            : typeof meta === "number"
              ? "variant"
              : "variant",
        variantIndex:
          typeof meta === "number" ? meta : meta?.variantIndex ?? null,
        groupKey: meta?.groupKey ?? null,
        id: `crop-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      };
    });

    setCropQueue((prev) => [...prev, ...items]);
  }, []);

  // -------------------------
  // Cropper queue: open modal for first queued item (if closed)
  // -------------------------
  useEffect(() => {
    if (cropperModal.isOpen) return; // already open
    if (cropQueue.length === 0) return;

    const next = cropQueue[0];
    if (!next) return;

    setCropperModal({
      isOpen: true,
      image: next.url,
      variantIndex: next.variantIndex,
      originalFile: next.file,
      type: next.type,
      groupKey: next.groupKey,
    });
  }, [cropQueue, cropperModal.isOpen]);

  const addSpecificationRow = () => {
    setSpecifications((prev) => [
      ...prev,
      {
        SpecificationTypeID: "",
        Value: "",
      },
    ]);
  };

  const handleSpecificationChange = (index, field, value) => {
    setSpecifications((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
    setValidationErrors((prev) => ({
      ...prev,
      [`spec_${index}_${field}`]: undefined,
    }));
  };

  const removeSpecificationRow = (index) => {
    setSpecifications((prev) => prev.filter((_, i) => i !== index));
  };

  // -------------------------
  // Apply global images to variants in a groupKey
  // -------------------------
  const applyGlobalImagesToGroupVariants = (groupKey, globalImages) => {
    // globalImages: array of { id, file, preview, isGlobal, sortOrder }
    setVariants((prev) =>
      prev.map((variant) => {
        const belongs = variant.attributes?.some(
          (a) =>
            String(a.AttributeTypeID) === String(groupingAttributeTypeID) &&
            a.AttributeValueIDs?.includes(String(groupKey))
        );
        if (!belongs) return variant;

        const localOnly = (variant.images || []).filter((i) => !i.isGlobal);

        const newImages = [
          ...(globalImages || []).map((g, i) => ({
            ...g,
            isGlobal: true,
            sortOrder: i + 1,
          })),
          ...localOnly.map((l, idx) => ({
            ...l,
            sortOrder: (globalImages?.length || 0) + idx + 1,
          })),
        ];

        return {
          ...variant,
          images: newImages,
        };
      })
    );
  };

  // -------------------------
  // Handle crop completion (add file, pop queue, revoke original URL)
  // -------------------------
  const handleCropComplete = (
    blob,
    variantIndexFromModal,
    typeFromModal,
    groupKeyFromModal
  ) => {
    const modal = { ...cropperModal };
    const type = modal.type || typeFromModal || "variant";
    const groupKey = modal.groupKey ?? groupKeyFromModal;
    const variantIndex =
      typeof modal.variantIndex === "number"
        ? modal.variantIndex
        : typeof variantIndexFromModal === "number"
          ? variantIndexFromModal
          : 0;

    if (blob) {
      const croppedUrl = URL.createObjectURL(blob);
      activeUrlsRef.current.add(croppedUrl);

      if (type === "global") {
        const croppedFile = new File(
          [blob],
          modal.originalFile?.name || `global-${Date.now()}.jpg`,
          {
            type: FILETYPE,
          }
        );

        setGroupGlobalImages((prev) => {
          const existing = prev?.[groupKey] || [];
          const updated = [
            ...existing,
            {
              id: `g-${groupKey}-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2)}`,
              file: croppedFile,
              preview: croppedUrl,
              isGlobal: true,
              sortOrder: existing.length + 1,
            },
          ];

          // keep variants updated
          applyGlobalImagesToGroupVariants(groupKey, updated);

          return { ...(prev || {}), [groupKey]: updated };
        });
      } else {
        // Variant-level image
        const croppedFile = new File(
          [blob],
          modal.originalFile?.name || `cropped-image-${Date.now()}.jpg`,
          {
            type: FILETYPE,
          }
        );

        setVariants((prevVariants) => {
          const newVariants = [...prevVariants];
          const idx = typeof variantIndex === "number" ? variantIndex : 0;
          const currentImages = newVariants[idx]?.images || [];
          const newSortOrder =
            currentImages.length > 0
              ? Math.max(...currentImages.map((img) => img.sortOrder || 0)) + 1
              : 1;

          newVariants[idx] = {
            ...newVariants[idx],
            images: [
              ...currentImages,
              {
                file: croppedFile,
                preview: croppedUrl,
                sortOrder: newSortOrder,
                id: `local-${Date.now()}-${Math.random()
                  .toString(36)
                  .slice(2)}`,
              },
            ],
          };

          return newVariants;
        });
      }
    }

    // Remove processed item from queue and revoke its original URL (use functional update)
    setCropQueue((prev) => {
      if (!prev || prev.length === 0) return [];
      const [, ...rest] = prev;

      // schedule revoke of original URL (the one currently in modal)
      try {
        const urlToRevoke = modal.image;
        setTimeout(() => {
          try {
            if (urlToRevoke) {
              URL.revokeObjectURL(urlToRevoke);
              activeUrlsRef.current.delete(urlToRevoke);
            }
          } catch (err) {
            // ignore
          }
        }, 150);
      } catch (err) {
        // ignore
      }

      return rest;
    });

    // Close modal state — next queued item will re-open modal via useEffect above
    setCropperModal({
      isOpen: false,
      image: "",
      variantIndex: null,
      originalFile: null,
      type: "variant",
      groupKey: null,
    });

    // clear any validation error for that variant's images
    setValidationErrors((prev) => ({
      ...prev,
      [`variant_${variantIndex}_images`]: undefined,
    }));
  };

  // -------------------------
  // Handle user cancelling cropper (drop the queued item)
  // -------------------------
  const handleCropperCancel = () => {
    const modal = { ...cropperModal };

    setCropQueue((prev) => {
      if (!prev || prev.length === 0) return [];
      const [, ...rest] = prev;
      try {
        const urlToRevoke = modal.image;
        setTimeout(() => {
          try {
            if (urlToRevoke) {
              URL.revokeObjectURL(urlToRevoke);
              activeUrlsRef.current.delete(urlToRevoke);
            }
          } catch (err) { }
        }, 100);
      } catch (err) { }
      return rest;
    });

    setCropperModal({
      isOpen: false,
      image: "",
      variantIndex: null,
      originalFile: null,
      type: "variant",
      groupKey: null,
    });
  };

  // -------------------------
  // Remove image helper (revoking blobs)
  // -------------------------
  const removeImage = (variantIndex, imageIndex) => {
    setVariants((prev) => {
      const copy = [...prev];
      const imgs = [...(copy[variantIndex].images || [])];
      const removed = imgs[imageIndex];

      try {
        if (
          removed?.preview?.startsWith("blob:") &&
          removed.isGlobal !== true
        ) {
          URL.revokeObjectURL(removed.preview);
          activeUrlsRef.current.delete(removed.preview);
        }
      } catch (err) { }

      if (removed?.documentId) {
        if (!copy[variantIndex].removedImages)
          copy[variantIndex].removedImages = [];
        copy[variantIndex].removedImages.push(removed);
      } else {
    
      }

      imgs.splice(imageIndex, 1);
      copy[variantIndex].images = imgs;


      return copy;
    });
  };

  // -------------------------
  // GLOBAL image helpers (remove / reorder)
  // -------------------------
  const removeGlobalImage = (groupKey, indexToRemove) => {
    setGroupGlobalImages((prev) => {
      const oldList = prev?.[groupKey] || [];
      const updated = oldList.filter((_, i) => i !== indexToRemove);

      // update variants in group
      applyGlobalImagesToGroupVariants(groupKey, updated);

      return { ...(prev || {}), [groupKey]: updated };
    });
  };

  const sortGlobalImages = (groupKey, newList) => {
    const fixed = newList.map((img, idx) => ({
      ...img,
      sortOrder: idx + 1,
      isGlobal: true,
    }));

    setGroupGlobalImages((prev) => ({ ...(prev || {}), [groupKey]: fixed }));
    // apply to variants
    applyGlobalImagesToGroupVariants(groupKey, fixed);
  };

  // -------------------------
  // Submit
  // -------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const errors = {};

    if (!oFormData.ProductName)
      errors.ProductName = t("PRODUCT_CREATION.PRODUCT_NAME_REQUIRED");

    if (!oFormData.BrandID)
      errors.BrandID = t("PRODUCT_CREATION.BRAND_ID_REQUIRED");

    if (!oFormData.CategoryID)
      errors.CategoryID = t("PRODUCT_CREATION.CATEGORY_ID_REQUIRED");

    if (!oFormData.StoreID)
      errors.StoreID = t("PRODUCT_CREATION.STORE_ID_REQUIRED");

    aVariants.forEach((variant, index) => {
      if (!variant.Quantity)
        errors[`variant_${index}_Quantity`] = t(
          "PRODUCT_CREATION.QUANTITY_REQUIRED"
        );

      if (!variant.MRP)
        errors[`variant_${index}_MRP`] = t("PRODUCT_CREATION.MRP_REQUIRED");

      if (!variant.SellingPrice)
        errors[`variant_${index}_SellingPrice`] = t(
          "PRODUCT_CREATION.SELLING_PRICE_REQUIRED"
        );

      if (!variant.images || !variant.images.length)
        errors[`variant_${index}_images`] = t(
          "PRODUCT_CREATION.IMAGE_REQUIRED"
        );
    });

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setSubmitting(false);
      return;
    }

    const Specifications = aSpecifications
      .filter((s) => s.SpecificationTypeID && s.Value)
      .map((s) => ({
        SpecificationTypeID: s.SpecificationTypeID,
        Value: s.Value,
      }));

    const Variants = aVariants.map((variant, vIndex) => {
      const attributesForPayload = Array.isArray(variant.attributes)
        ? variant.attributes.map((attr) => ({
            AttributeTypeID: attr.AttributeTypeID,
            AttributeValueID: Array.isArray(attr.AttributeValueIDs)
              ? attr.AttributeValueIDs[0]
              : attr.AttributeValueID || attr.AttributeValueId || attr.attributeValueID,
          })).filter((a) => a.AttributeTypeID && a.AttributeValueID)
        : [];

      const images = Array.isArray(variant.images) ? variant.images : [];
      const removedImages = Array.isArray(variant.removedImages)
        ? variant.removedImages
        : [];

      // Check if images have been modified (new images, updated existing images, removed images, or reordered)
      const hasNewOrUpdatedImages = images.some((img) => img.file);
      const hasRemovedImages = removedImages.length > 0;
      const hasReorderedImages = images.some((img, index) => 
        img.isExisting && Number(img.sortOrder) !== (index + 1)
      );
      
      // Debug: Log the state to help identify the issue
      
      // Send metadata if there are actual changes including reordering
      const hasImageChanges = hasNewOrUpdatedImages || hasRemovedImages || hasReorderedImages;

      // Build documentMetadata only if there are image changes
      // Rules:
      // 1) Delete existing image:
      //    [{ DocumentID: "123" }]
      // 2) Update existing image:
      //    [{ DocumentID: "123", "image":"product-image", "sortOrder":1}]
      //    sortOrder = existing image sortOrder (current position after reordering)
      // 3) Upload new image:
      //    [{ "image":"product-image", "sortOrder":1}]
      //    sortOrder = subsequent sortOrder after existing images
      let documentMetadata;

      if (hasImageChanges) {
        const metadata = [];

        // 1) deletions: only DocumentID, no image or sortOrder
        removedImages.forEach((img) => {
          if (img.documentId) {
            metadata.push({
              DocumentID: img.documentId,
            });
          }
        });

        // Determine the maximum existing sortOrder from images that are *not* removed
        const removedIds = new Set(
          removedImages.filter((ri) => ri.documentId).map((ri) => ri.documentId)
        );

        const existingSortOrders = images
          .filter(
            (img) =>
              img.isExisting &&
              img.documentId &&
              !removedIds.has(img.documentId)
          )
          .map((img) => Number(img.sortOrder) || 0);

        let nextSortOrder =
          existingSortOrders.length > 0 ? Math.max(...existingSortOrders) : 0;

        // 2) updates & 3) new uploads
        images.forEach((img, index) => {
          const imageKey = `images_${vIndex}_${index + 1}`;

          if (img.isExisting && img.documentId) {
            // 2) update existing image - ONLY include image key if file exists (actual image update)
            const sortOrder = Number(img.sortOrder) || 0;
            if (img.file) {
              // Existing image with new file - include image key
              metadata.push({
                DocumentID: img.documentId,
                image: imageKey,
                sortOrder,
              });
            } else if (hasReorderedImages) {
              // Just reordered - only update sortOrder, no image key
              metadata.push({
                DocumentID: img.documentId,
                sortOrder,
              });
            }
            // If no file and no reordering, don't include anything (unchanged existing image)
          } else if (img.file) {
            // 3) new image - assign subsequent sortOrder
            nextSortOrder += 1;
            metadata.push({
              image: imageKey,
              sortOrder: nextSortOrder,
            });
          }
        });

        documentMetadata = metadata;
        
      } else {
        documentMetadata = undefined; // Don't send documentMetadata if no changes
      }

      const variantPayload = {
        ...(productId &&
          variant.VariantID && { ProductVariantID: variant.VariantID }),

        Attributes: attributesForPayload,

        Quantity: Number(variant.Quantity) || 0,
        MRP: Number(variant.MRP) || 0,
        DiscountPercentage:
          Number(variant.DiscountPercentage || variant.ProductDiscount) || 0,
        SellingPrice: Number(variant.SellingPrice) || 0,
        StoreIDs: Array.isArray(oFormData.StoreID)
          ? oFormData.StoreID
          : oFormData.StoreID
            ? [oFormData.StoreID]
            : [],
        // Shipping fields flat on variant
        ...(variant.shippingData?.weight && { Weight: Number(variant.shippingData.weight) }),
        ...(variant.shippingData?.weightUnit && { Unit: variant.shippingData.weightUnit }),
        ...(variant.shippingData?.countryOfOrigin && { CountryCode: variant.shippingData.countryOfOrigin }),
        ...(variant.shippingData?.hsCode && { HSCode: variant.shippingData.hsCode }),
        ...(variant.shippingData?.package && { PackagingBoxID: variant.shippingData.package }),
      };

      // Only include documentMetadata if there are image changes
      if (documentMetadata !== undefined) {
        variantPayload.documentMetadata = documentMetadata;
      } else {
        variantPayload.documentMetadata = undefined;
      }

      return variantPayload;
    });

    const payload = {
      TenantID: oFormData.TenantID,
      ...(productId && { ProductID: productId }),
      ProductName: oFormData.ProductName,
      ProductDescription: oFormData.ProductDescription,
      BrandID: oFormData.BrandID,
      CategoryID: oFormData.CategoryID,
      ...(groupingAttributeTypeID && { GroupBy: groupingAttributeTypeID }),
      IsActive: true,
      Specifications,
      Variants,
    };

    const formData = new FormData();
    formData.append("data", JSON.stringify(payload));

    aVariants.forEach((variant, vIndex) => {
      variant.images.forEach((img, index) => {
        if (img.file) {
          formData.append(`images_${vIndex}_${index + 1}`, img.file);
        }
      });
    });

    try {
      const token = localStorage.getItem("token");
      let response;

      const userId = localStorage.getItem("userId");
      
      if (productId) {
        // ✅ UPDATE PRODUCT
        formData.set('UpdatedBy', userId);
        formData.set('UpdatedOn', new Date().toISOString());
       
        response = await apiPut(UPDATE_PRODUCT, formData, token, true);
      } else {
        // ✅ CREATE PRODUCT  
        formData.set('CreatedBy', userId);
        formData.set('CreatedOn', new Date().toISOString());
        formData.set('TenantID', localStorage.getItem("tenantID"));
       
        response = await apiPost(CREATE_PRODUCT, formData, token, true);
      }

      const resData = response?.data;

      if (resData?.status?.toUpperCase() === STATUS.SUCCESS.toUpperCase()) {
        showEmsg(
          resData.MESSAGE ||
          (productId
            ? t("PRODUCT_CREATION.PRODUCT_UPDATED_SUCCESS")
            : t("PRODUCT_CREATION.PRODUCT_CREATED_SUCCESS")),
          STATUS.SUCCESS,
          3000,
          () => navigate("/productList")
        );
      } else {
        showEmsg(
          resData?.MESSAGE || t("PRODUCT_CREATION.PRODUCT_CREATE_FAILED"),
          STATUS.ERROR
        );
      }
    } catch (error) {
      const backendMessage = error?.response?.data?.MESSAGE;
      showEmsg(
        backendMessage || t("PRODUCT_CREATION.PRODUCT_SUBMIT_ERROR"),
        STATUS.ERROR
      );
    } finally {
      hideLoaderWithDelay(setSubmitting);
    }
  };

  const loaderOverlay = submitting ? (
    <div className="global-loader-overlay">
      <Loader />
    </div>
  ) : null;

  // Auto-set grouping attribute to first selected attribute type
  useEffect(() => {
    const firstAttr = aAttributes.find((a) => a.AttributeTypeID);
    if (firstAttr) {
      setGroupingAttributeTypeID(firstAttr.AttributeTypeID);
    } else {
      setGroupingAttributeTypeID("");
    }
  }, [aAttributes]);

  // -------------------------
  // Render
  // -------------------------
  // Show skeleton loader while fetching product data in edit mode
  if (isLoading) {
    return <SkeletonLoader type={SKELETON_TYPES.PRODUCT_FORM} />;
  }

  return (
    <div className="min-h-screen">
      {loaderOverlay}
      <ToastContainer />

      {/* Shared cropper modal (unified) */}
      {cropperModal.isOpen && (
        <ImageCropperModal
          queue={cropQueue}
          onQueueUpdate={setCropQueue}
          image={[
            cropperModal.image,
            cropperModal.type === TYPE_GLOBAL
              ? cropperModal.groupKey
              : cropperModal.variantIndex,
          ]}
          onCropComplete={(blob) =>
            handleCropComplete(
              blob,
              cropperModal.variantIndex,
              cropperModal.type,
              cropperModal.groupKey
            )
          }
          onClose={handleCropperCancel}
          aspectRatio={1}
          minWidth={500}
          minHeight={500}
          title={`Crop Images (${cropQueue.length} pending)`}
        />
      )}

      <div className="max-w-8xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Basic Info */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-800 overflow-visible relative">
            <div className="px-8 py-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <ShoppingBag className="h-6 w-6 mr-3 text-custom-bg" />
                {t("COMMON.BASIC_INFORMATION")}
              </h2>
            </div>
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <TextInputWithIcon
                    label={t("PRODUCT_CREATION.PRODUCT_NAME")}
                    id="ProductName"
                    name="ProductName"
                    value={oFormData.ProductName}
                    onChange={handleInputChange}
                    placeholder={t("PRODUCT_CREATION.PRODUCT_NAME_PLACEHOLDER")}
                    Icon={Tag}
                    error={oValidationErrors.ProductName}
                    ref={productNameRef}
                  />
                </div>
                <div>
                  <SelectWithIcon
                    label={t("PRODUCT_CREATION.BRAND_ID")}
                    id="BrandID"
                    name="BrandID"
                    value={oFormData.BrandID}
                    onChange={handleInputChange}
                    onInputChange={(val) =>
                      dispatch(
                        fetchResource({
                          key: "brands",
                          params: { searchText: val || "" },
                        })
                      )
                    }
                    options={brands.map((brand) => ({
                      value: brand.BrandID,
                      label: brand.BrandName,
                    }))}
                    Icon={Tag}
                    error={oValidationErrors.BrandID}
                    placeholder={t("PRODUCT_CREATION.BRAND_ID_PLACEHOLDER")}
                    ref={brandRef}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <SelectWithIcon
                    label={t("PRODUCT_CREATION.CATEGORY_ID")}
                    id="CategoryID"
                    name="CategoryID"
                    value={oFormData.CategoryID}
                    onChange={handleInputChange}
                    onInputChange={(val) =>
                      dispatch(
                        fetchResource({
                          key: "categories",
                          params: { searchText: val || "" },
                        })
                      )
                    }
                    options={childCategories}
                    Icon={Tag}
                    error={oValidationErrors.CategoryID}
                    placeholder={t("PRODUCT_CREATION.CATEGORY_ID_PLACEHOLDER")}
                    ref={categoryRef}
                  />
                </div>
                <div>
                  <SelectWithIcon
                    label={t("COMMON.STORE")}
                    id="StoreID"
                    name="StoreID"
                    value={oFormData.StoreID}
                    onChange={handleInputChange}
                    onInputChange={(val) =>
                      dispatch(
                        fetchResource({
                          key: "stores",
                          params: { searchText: val || "" },
                        })
                      )
                    }
                    options={stores.map((store) => ({
                      value: store.StoreID,
                      label: store.StoreName,
                    }))}
                    Icon={Tag}
                    error={oValidationErrors.StoreID}
                    multiple
                    placeholder={t("PRODUCT_CREATION.STORE_ID_PLACEHOLDER")}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Specifications */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-800 overflow-visible relative">
            <div className="px-8 py-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <Tag className="h-6 w-6 mr-3 text-custom-bg" />
                {t("PRODUCT_CREATION.SPECIFICATIONS")}
              </h2>
              <button
                type="button"
                onClick={addSpecificationRow}
                className="btn-secondary inline-flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>{t("PRODUCT_CREATION.ADD_SPECIFICATION")}</span>
              </button>
            </div>
            <div className="p-8 space-y-6">
              {aSpecifications.map((spec, index) => (
                <div
                  key={index}
                  id={`spec-container-${index}`}
                  className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start"
                >
                  <div>
                    <SelectWithIcon
                      label={t("PRODUCT_SETUP.TABS.SPECIFICATION_TYPE")}
                      id={`SpecificationTypeID-${index}`}
                      name={`SpecificationTypeID-${index}`}
                      value={spec.SpecificationTypeID}
                      onChange={(e) =>
                        handleSpecificationChange(
                          index,
                          "SpecificationTypeID",
                          e.target.value
                        )
                      }
                      options={specificationTypes.map((specType) => ({
                        value: specType.SpecificationTypeID,
                        label: specType.Name,
                      }))}
                      Icon={Tag}
                      error={
                        oValidationErrors[`spec_${index}_SpecificationTypeID`]
                      }
                      placeholder={t(
                        "PRODUCT_CREATION.SPECIFICATION_TYPE_PLACEHOLDER"
                      )}
                    />
                  </div>
                  <div className="flex items-end gap-4">
                    <div className="flex-1">
                      <TextInputWithIcon
                        label={t("PRODUCT_CREATION.SPECIFICATION_VALUE")}
                        id={`SpecificationValue-${index}`}
                        name={`SpecificationValue-${index}`}
                        value={spec.Value}
                        onChange={(e) =>
                          handleSpecificationChange(
                            index,
                            "Value",
                            e.target.value
                          )
                        }
                        placeholder={t(
                          "PRODUCT_CREATION.SPECIFICATION_VALUE_PLACEHOLDER"
                        )}
                        Icon={Tag}
                        error={oValidationErrors[`spec_${index}_Value`]}
                      />
                    </div>
                    {aSpecifications.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSpecificationRow(index)}
                        className="btn-cancel px-3 py-3 flex items-center justify-center"
                        title="Remove specification"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Product description */}
          <div style={{ marginBottom: '5rem' }}>
            <label
              htmlFor="ProductDescription"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              {t("PRODUCT_CREATION.PRODUCT_DESCRIPTION")}
            </label>
            <div style={{ marginBottom: '5rem' }}>
              <ReactQuill
                theme="snow"
                value={oFormData.ProductDescription}
                onChange={(value) =>
                  handleInputChange({
                    target: { name: "ProductDescription", value },
                  })
                }
                placeholder={t(
                  "PRODUCT_CREATION.PRODUCT_DESCRIPTION_PLACEHOLDER"
                )}
                className={`h-32 ${oValidationErrors.ProductDescription ? "border-red-500" : ""
                  }`}
                ref={productDescriptionRef}
              />
            </div>
            {oValidationErrors.ProductDescription && (
              <p className="text-red-500 text-sm" style={{ marginTop: '1rem' }}>
                {oValidationErrors.ProductDescription}
              </p>
            )}
          </div>

          {/* Attributes section */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-800 overflow-visible relative" style={{ marginTop: '3rem' }}>
            <div className="px-8 py-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <Layers className="h-6 w-6 mr-3 text-custom-bg" />
                {t("PRODUCT_SETUP.ATTRIBUTES.TITLE")}
              </h2>
              {!productId && (
                <button
                  type="button"
                  onClick={addAttributeRow}
                  className="btn-secondary inline-flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>{t("PRODUCT_CREATION.ADD_ATTRIBUTE")}</span>
                </button>
              )}
            </div>
            {aAttributes.length > 0 && (
              <div className="p-8 space-y-6">
                {aAttributes.map((attr, index) => (
                  <div
                    key={index}
                    id={`attr-container-${index}`}
                    className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start"
                  >
                    <div>
                      <SelectWithIcon
                        label={t("PRODUCT_CREATION.ATTRIBUTE_ID")}
                        id={`AttributeTypeID-${index}`}
                        name={`AttributeTypeID-${index}`}
                        value={attr.AttributeTypeID}
                        onChange={(e) =>
                          handleAttributeTypeChange(index, e.target.value)
                        }
                        onInputChange={(val) =>
                          dispatch(
                            fetchResource({
                              key: "attributeTypes",
                              params: { searchText: val || "" },
                            })
                          )
                        }
                        options={(() => {
                            const filteredOptions = attributeTypes?.filter((type) => {
                              // Check if this attribute type is already selected in another row
                              const isAlreadySelected = aAttributes.some((selectedAttr, selectedIndex) => 
                                selectedIndex !== index && // Don't check the current attribute being edited
                                String(selectedAttr.AttributeTypeID) === String(type.AttributeTypeID || type.attributeTypeID)
                              );
                              // Only filter out if not the current selection and not already selected elsewhere
                              return type.IsActive && !isAlreadySelected;
                            }).map((type) => ({
                              value: type.AttributeTypeID || type.attributeTypeID,
                              label: type.Name || type.name,
                            })) || [];

                            // Always ensure the currently selected value is included, even if not in the API response
                            if (attr.AttributeTypeID && !filteredOptions.some(option => 
                              String(option.value) === String(attr.AttributeTypeID)
                            )) {
                              // Try to find in current attributeTypes first
                              const currentType = attributeTypes?.find(type => 
                                String(type.AttributeTypeID || type.attributeTypeID) === String(attr.AttributeTypeID)
                              );
                              
                              if (currentType && currentType.IsActive) {
                                filteredOptions.push({
                                  value: currentType.AttributeTypeID || currentType.attributeTypeID,
                                  label: currentType.Name || currentType.name,
                                });
                              } else {
                                // If not found in current attributeTypes (due to search filtering), 
                                // we need to reconstruct it from the stored data
                                filteredOptions.push({
                                  value: attr.AttributeTypeID,
                                  label: attr.typeName || "Selected Attribute Type",
                                });
                              }
                            }

                            return filteredOptions;
                          })()}
                        Icon={Hash}
                        error={
                          oValidationErrors[`attr_${index}_AttributeTypeID`]
                        }
                        placeholder={t(
                          "PRODUCT_CREATION.ATTRIBUTE_ID_PLACEHOLDER"
                        )}
                        disabled={false}
                      />
                    </div>

                    <div className="flex items-end gap-4">
                      <SelectWithIcon
                        label={t("PRODUCT_CREATION.ATTRIBUTE_VALUES")}
                        id={`AttributeValueIDs-${index}`}
                        name={`AttributeValueIDs-${index}`}
                        value={attr.AttributeValueIDs || []}
                        onChange={(e) => {
                          const selectedValues = Array.isArray(e.target.value)
                            ? e.target.value
                            : [e.target.value].filter(Boolean);
                          // Pass the same options the dropdown used so labels never fall back to UUIDs
                          const typeKey = String(attr.AttributeTypeID);
                          const currentTypeAttributes =
                            attributesByType[typeKey] ||
                            attributesByType[attr.AttributeTypeID] ||
                            [];
                          const optionsFromCache =
                            localAttributeOptions[typeKey] ||
                            localAttributeOptions[attr.AttributeTypeID] ||
                            [];
                          const options =
                            optionsFromCache.length > 0
                              ? optionsFromCache
                              : currentTypeAttributes.map((attribute) => ({
                                  id: getAttrValueId(attribute),
                                  value: getAttrValueId(attribute),
                                  label: formatAttrValueLabel(attribute),
                                }));
                          handleAttributeValuesChange(
                            index,
                            selectedValues,
                            options
                          );
                        }}
                        options={(() => {
                          const typeKey = String(attr.AttributeTypeID || "");
                          const currentTypeAttributes =
                            attributesByType[typeKey] ||
                            attributesByType[attr.AttributeTypeID] ||
                            [];
                          const cached =
                            localAttributeOptions[typeKey] ||
                            localAttributeOptions[attr.AttributeTypeID] ||
                            [];

                          const baseOptions = (
                            cached.length > 0
                              ? cached.map((o) => ({
                                  value: o.id,
                                  label: o.label,
                                }))
                              : currentTypeAttributes
                                  .filter((attribute) => attribute.IsActive !== false)
                                  .map((attribute) => ({
                                    value: getAttrValueId(attribute),
                                    label: formatAttrValueLabel(attribute),
                                  }))
                          ).filter((option) => {
                            const attributeValueId = option.value;
                            const isAlreadySelected = aAttributes.some(
                              (selectedAttr, selectedIndex) =>
                                selectedIndex !== index &&
                                selectedAttr.AttributeValueIDs?.some(
                                  (id) => String(id) === String(attributeValueId)
                                )
                            );
                            return !isAlreadySelected;
                          });

                          // add fallback options from payload if not present in attributes list
                          const fallback =
                            attributeLabelMapRef.current?.[typeKey] ||
                            attributeLabelMapRef.current?.[attr.AttributeTypeID];
                          if (!fallback) return baseOptions;
                          const merged = [...baseOptions];
                          Object.entries(fallback).forEach(([vid, label]) => {
                            const isAlreadySelected = aAttributes.some(
                              (selectedAttr, selectedIndex) =>
                                selectedIndex !== index &&
                                selectedAttr.AttributeValueIDs?.some(
                                  (id) => String(id) === String(vid)
                                )
                            );

                            const exists = merged.some(
                              (opt) => String(opt.value) === String(vid)
                            );
                            if (!exists && !isAlreadySelected) {
                              merged.push({
                                value: vid,
                                label: String(label),
                              });
                            }
                          });
                          return merged;
                        })()}
                        Icon={Layers}
                        error={
                          oValidationErrors[`attr_${index}_AttributeValueIDs`]
                        }
                        placeholder={t(
                          "PRODUCT_CREATION.ATTRIBUTE_VALUES_PLACEHOLDER"
                        )}
                        multiple
                        maxVisibleItems={10}
                        disabled={!attr.AttributeTypeID}
                      />

                      {!productId && (
                        <div className="flex items-end justify-end">
                          <button
                            type="button"
                            onClick={() => removeAttributeRow(index)}
                            className="btn-cancel px-3 py-3 flex items-center justify-center"
                            title="Remove option"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Variants display */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="px-8 py-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <Layers className="h-6 w-6 mr-3 text-custom-bg" />
                {t("PRODUCT_CREATION.VARIANT_INFORMATION")}
              </h2>

              {aAttributes.some((a) => a.AttributeTypeID) && (
                <div className="w-1/2">
                  <SelectWithIcon
                    label="Group by"
                    value={groupingAttributeTypeID}
                    onChange={(e) => setGroupingAttributeTypeID(e.target.value)}
                    options={[
                      ...aAttributes
                        .filter((attr) => attr.AttributeTypeID)
                        .map((attr) => {
                          const tAttr = attributeTypes.find(
                            (at) =>
                              String(at.AttributeTypeID) ===
                              String(attr.AttributeTypeID)
                          );
                          return {
                            value: attr.AttributeTypeID,
                            label: tAttr
                              ? tAttr.Name || tAttr.name
                              : attr.typeName || `Attribute ${attr.AttributeTypeID}`,
                          };
                        }),
                    ]}
                    Icon={Layers}
                    placeholder="Select attribute to group by"
                  />
                </div>
              )}
            </div>

            <div className="p-6">
              {/* If no attributes -> default variant editor */}
              {!aAttributes.some(
                (a) => a.AttributeTypeID && a.AttributeValueIDs?.length
              ) ? (
                <div className="border rounded-xl bg-white dark:bg-gray-900 dark:border-gray-800 shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                    {aVariants.length === 1
                      ? "Default Variant"
                      : "Generated Variants"}
                  </h3>

                  {aVariants.map((variant, index) => (
                    <div
                      key={variant.id}
                      className="border-b border-gray-100 dark:border-gray-800 pb-6 last:border-none mb-6"
                    >
                      <div className="flex justify-between items-center mb-4">
                        {aVariants.length > 1 && (
                          <button
                            type="button"
                            onClick={() => deleteVariant(variant.id)}
                            className="btn-cancel flex items-center space-x-1 px-2 py-1"
                            title="Delete this variant"
                          >
                            <X className="h-4 w-4" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                        <div className="md:col-span-2">
                          <h4 className="text-md font-semibold text-gray-800 dark:text-gray-300 mb-3">
                            Upload Images for{" "}
                            {variant.attributes?.length
                              ? variant.attributes
                                .map((a) => getAttributeValueLabel(a))
                                .filter(Boolean)
                                .join(" - ")
                              : t("PRODUCT_CREATION.VARIANT")}
                          </h4>
                          <ImageManagement
                            type="variant"
                            images={variant.images || []}
                            sensors={sensors}
                            label={`Upload images`}
                            onFilesDrop={(files) =>
                              enqueueFilesForCrop(files, {
                                variantIndex: index,
                              })
                            }
                            onRemoveImage={(i) => removeImage(index, i)}
                            onSortChange={(newList) =>
                              setVariants((prev) => {
                                const copy = [...prev];
                                copy[index].images = newList.map(
                                  (img, idx) => ({
                                    ...img,
                                    sortOrder: idx + 1,
                                  })
                                );
                                return copy;
                              })
                            }
                          />
                        </div>

                        <div className="md:col-span-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <TextInputWithIcon
                              label={t("PRODUCT_CREATION.QUANTITY")}
                              name="Quantity"
                              value={variant.Quantity}
                              onChange={(e) =>
                                handleVariantChange(
                                  index,
                                  "Quantity",
                                  e.target.value
                                )
                              }
                              placeholder="Enter quantity"
                              Icon={Hash}
                              error={
                                oValidationErrors[`variant_${index}_Quantity`]
                              }
                            />

                            <TextInputWithIcon
                              label={t("PRODUCT_CREATION.MRP")}
                              name="MRP"
                              value={variant.MRP}
                              onChange={(e) =>
                                handleVariantChange(
                                  index,
                                  "MRP",
                                  e.target.value
                                )
                              }
                              placeholder="Enter MRP"
                              Icon={() => (
                                <span className="text-xl font-bold text-gray-400">
                                  ₹
                                </span>
                              )}
                              error={oValidationErrors[`variant_${index}_MRP`]}
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                            <TextInputWithIcon
                              label={t("PRODUCT_CREATION.PRODUCT_DISCOUNT")}
                              name="DiscountPercentage"
                              value={variant.DiscountPercentage}
                              onChange={(e) =>
                                handleVariantChange(
                                  index,
                                  "DiscountPercentage",
                                  e.target.value
                                )
                              }
                              placeholder="Enter discount %"
                              Icon={() => (
                                <span className="text-lg font-bold text-gray-400">
                                  %
                                </span>
                              )}
                              error={
                                oValidationErrors[
                                `variant_${index}_DiscountPercentage`
                                ]
                              }
                            />

                            <TextInputWithIcon
                              label={t("PRODUCT_CREATION.SELLING_PRICE")}
                              name="SellingPrice"
                              value={
                                Math.round(Number(variant.SellingPrice)) || ""
                              }
                              onChange={(e) =>
                                handleVariantChange(
                                  index,
                                  "SellingPrice",
                                  e.target.value
                                )
                              }
                              placeholder="Selling price"
                              Icon={() => (
                                <span className="text-xl font-bold text-gray-400">
                                  ₹
                                </span>
                              )}
                              error={
                                oValidationErrors[
                                `variant_${index}_SellingPrice`
                                ]
                              }
                            />
                          </div>
                        </div>
                      </div>

                      {/* Shipping Information */}
                      <div className="mt-6">
                        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                          <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            {t("PRODUCT_CREATION.SHIPPING_INFORMATION")}
                          </h4>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <SelectWithIcon
                              label="Package"
                              id={`package-${index}`}
                              name="package"
                              value={variant.shippingData?.package || ""}
                              onChange={(e) => {
                                if (e.target.value === "add-new") {
                                  setCurrentShippingVariantIndex(index);
                                  setShowAddPackageModal(true);
                                  return;
                                }
                                handleVariantChange(index, "shippingData", {
                                  ...(variant.shippingData || {}),
                                  package: e.target.value,
                                });
                              }}
                              onInputChange={(searchText) => {
                                dispatch(fetchResource({ key: "packagingBoxes", params: { searchText } }));
                              }}
                              options={[
                                { value: "add-new", label: "Add New", isSpecial: true, icon: ({ className }) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg> },
                                ...packagingBoxes.map((box) => ({
                                  value: box.PackagingBoxID,
                                  label: box.PackageName || box.Name || box.PackagingBoxID,
                                })),
                                ...customPackages,
                              ]}
                              Icon={({ className }) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
                              placeholder="Select package"
                              onEditOption={(packageOption) => {
                                setEditingPackage({
                                  ...packageOption,
                                  PackagingBoxID: packageOption.PackagingBoxID || packageOption.value,
                                });
                                setCurrentShippingVariantIndex(index);
                                setShowEditPackageModal(true);
                              }}
                            />
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Weight</label>
                              <div className="flex gap-2">
                                <div className="flex-1">
                                  <TextInputWithIcon
                                    id={`weight-${index}`}
                                    name="weight"
                                    value={variant.shippingData?.weight || ""}
                                    onChange={(e) => handleVariantChange(index, "shippingData", { ...(variant.shippingData || {}), weight: e.target.value })}
                                    placeholder="0.0"
                                    type="number"
                                    step="0.1"
                                    Icon={Scale}
                                  />
                                </div>
                                <div className="w-24">
                                  <SelectWithIcon
                                    id={`weightUnit-${index}`}
                                    name="weightUnit"
                                    value={variant.shippingData?.weightUnit || ""}
                                    onChange={(e) => handleVariantChange(index, "shippingData", { ...(variant.shippingData || {}), weightUnit: e.target.value })}
                                    options={weightUnits.map((u) => {
                                      const val = typeof u === "string" ? u : (u.Unit || u.value || u);
                                      return { label: val, value: val };
                                    })}
                                    Icon={Scale}
                                    placeholder="Unit"
                                  />
                                </div>
                              </div>
                            </div>
                            <SelectWithIcon
                              label="Country of origin"
                              id={`country-${index}`}
                              name="countryOfOrigin"
                              value={variant.shippingData?.countryOfOrigin || ""}
                              onChange={(e) => handleVariantChange(index, "shippingData", { ...(variant.shippingData || {}), countryOfOrigin: e.target.value })}
                              options={countries.map((c) => ({
                                value: c.CountryCode || c.value,
                                label: c.CountryName || c.label,
                              }))}
                              Icon={() => <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>}
                              placeholder="Select country"
                            />
                            <TextInputWithIcon
                              label="HS Code"
                              id={`hsCode-${index}`}
                              name="hsCode"
                              value={variant.shippingData?.hsCode || ""}
                              onChange={(e) => handleVariantChange(index, "shippingData", { ...(variant.shippingData || {}), hsCode: e.target.value })}
                              placeholder="Enter HS code"
                              Icon={() => <span className="text-xs font-bold text-gray-400">#</span>}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // IF attributes exist → show VariantTabs (patched)
                <VariantTabs
                  aAttributes={aAttributes.map((a) => ({
                    ...a,
                    NewAttributeValueIDs: a.AttributeValueIDs || [],
                  }))}
                  attributes={attributes}
                  aVariants={aVariants}
                  groupingAttributeTypeID={groupingAttributeTypeID}
                  getVariantName={(variant) =>
                    (variant.attributes || [])
                      .map((attr) => {
                        const valueId = attr.AttributeValueIDs?.[0];

                        const valObj = attributes.find(
                          (a) =>
                            String(a.AttributeValueID || a.attributeValueID) ===
                            String(valueId)
                        );

                        // Only use readable labels (NO ID fallback)
                        const valueLabel =
                          valObj?.Value ||
                          valObj?.value ||
                          attr.Value ||
                          attr.value;

                        const unitLabel =
                          valObj?.Unit ||
                          valObj?.unit ||
                          attr.Unit ||
                          attr.unit;

                        // If no label found, skip this attribute
                        if (!valueLabel) return null;

                        return `${valueLabel}${unitLabel ? ` (${unitLabel})` : ""
                          }`;
                      })
                      .filter(Boolean) // removes null values
                      .join(" - ")
                  }
                  deleteVariant={deleteVariant}
                  handleVariantChange={handleVariantChange}
                  GlobalImageUpload={({ groupKey }) => (
                    <ImageManagement
                      type="global"
                      images={groupGlobalImages[groupKey] || []}
                      sensors={sensors}
                      label="Upload common images for this group"
                      onFilesDrop={(files) =>
                        enqueueFilesForCrop(files, { type: "global", groupKey })
                      }
                      onRemoveImage={(index) => {
                        removeGlobalImage(groupKey, index);
                      }}
                      onSortChange={(newList) =>
                        sortGlobalImages(groupKey, newList)
                      }
                    />
                  )}
                  TextInputWithIcon={TextInputWithIcon}
                  t={t}
                  oFormData={oFormData}
                  brands={brands}
                  aSpecifications={aSpecifications}
                  specificationTypes={specificationTypes}
                  attributeTypes={attributeTypes}
                  // New props required by patched VariantTabs
                  sensors={sensors}
                  enqueueFilesForCrop={enqueueFilesForCrop}
                  removeImage={removeImage}
                  setVariants={setVariants}
                  packagingBoxes={packagingBoxes}
                  weightUnits={weightUnits}
                  countries={countries}
                  localAttributeOptions={(() => {
                    // Merge cached options for all types + selected value labels as fallback
                    const merged = { ...localAttributeOptions };
                    aAttributes.forEach((a) => {
                      const typeKey = String(a.AttributeTypeID || "");
                      if (!typeKey) return;
                      const existing = merged[typeKey] || [];
                      const byId = new Map(
                        existing.map((o) => [String(o.id), o])
                      );
                      (a.AttributeValueIDs || []).forEach((vid, idx) => {
                        const id = String(vid);
                        const stored = a.valueLabels?.[idx];
                        const resolved =
                          byId.get(id)?.label ||
                          (stored &&
                          stored !== id &&
                          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                            String(stored)
                          )
                            ? stored
                            : "") ||
                          resolveAttributeValueLabel(a.AttributeTypeID, vid);
                        if (resolved) {
                          byId.set(id, { id, label: resolved });
                        }
                      });
                      merged[typeKey] = Array.from(byId.values());
                    });
                    return merged;
                  })()}
                />
              )}
            </div>
          </div>

          {/* Floating Footer */}
          <FloatingFooter
            onCancel={() => navigate("/productList")}
            onSubmit={handleSubmit}
            isSubmitting={submitting}
            isEditMode={!!productId}
            className="z-0"
            customButtons={
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowPreview(true)}
              >
                Preview Product
              </button>
            }
          />
        </form>
      </div>

      {/* Reorder Modal */}
      {showReorderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Reorder Images
            </h2>

            <DndContext
              collisionDetection={closestCenter}
              onDragEnd={(event) => {
                const { active, over } = event;

                if (!over || active.id === over.id) return;

                const oldIndex = tempImages.findIndex(
                  (i) => i.id === active.id
                );
                const newIndex = tempImages.findIndex((i) => i.id === over.id);

                setTempImages(arrayMove(tempImages, oldIndex, newIndex));
              }}
            >
              <SortableContext
                items={tempImages.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                  {tempImages.map((img, index) => (
                    <div key={img.id} className="relative group">
                      <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100 shadow-md">
                        <img
                          src={img.preview}
                          alt={`Reorder ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setTempImages((prev) =>
                            prev.filter((x) => x.id !== img.id)
                          )
                        }
                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-red-600 shadow-lg transform hover:scale-110"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <div className="flex justify-end gap-3 mt-6">
              <button
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                onClick={() => setShowReorderModal(false)}
              >
                Cancel
              </button>

              <button
                className="px-4 py-2 bg-custom-bg text-white rounded-lg"
                onClick={() => {
                  setVariants((prev) => {
                    const copy = [...prev];
                    copy[reorderVariantIndex].images = tempImages;
                    return copy;
                  });
                  setShowReorderModal(false);
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-semibold">Product Preview</h2>
              <button
                className="p-2 rounded-full hover:bg-gray-100"
                onClick={() => setShowPreview(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <VariantPreviewCard
              oFormData={oFormData}
              brands={brands}
              specificationTypes={specificationTypes}
              aSpecifications={aSpecifications}
              aVariants={aVariants}
              attributeTypes={attributeTypes}
              attributes={attributes}
              groupingAttributeTypeID={groupingAttributeTypeID}
            />
          </div>
        </div>
      )}

      {/* Add Package Modal */}
      <AddPackageModal
        isOpen={showAddPackageModal}
        onClose={() => { setShowAddPackageModal(false); setCurrentShippingVariantIndex(null); }}
        onAddPackage={(newPackage) => {
          // Refresh packaging boxes from API
          dispatch(fetchResource({ key: "packagingBoxes" }));
          if (currentShippingVariantIndex !== null && newPackage.PackagingBoxID) {
            handleVariantChange(currentShippingVariantIndex, "shippingData", {
              ...(aVariants[currentShippingVariantIndex].shippingData || {}),
              package: newPackage.PackagingBoxID,
            });
          }
          setShowAddPackageModal(false);
          setCurrentShippingVariantIndex(null);
        }}
      />

      {/* Edit Package Modal */}
      <EditPackageModal
        isOpen={showEditPackageModal}
        onClose={() => { setShowEditPackageModal(false); setEditingPackage(null); setCurrentShippingVariantIndex(null); }}
        packageData={editingPackage}
        onUpdatePackage={(updatedPackage) => {
          dispatch(fetchResource({ key: "packagingBoxes" }));
          setCustomPackages((prev) => prev.map((p) => p.value === updatedPackage.value ? updatedPackage : p));
          if (currentShippingVariantIndex !== null && updatedPackage.PackagingBoxID) {
            handleVariantChange(currentShippingVariantIndex, "shippingData", {
              ...(aVariants[currentShippingVariantIndex].shippingData || {}),
              package: updatedPackage.PackagingBoxID,
            });
          }
          setShowEditPackageModal(false);
          setEditingPackage(null);
          setCurrentShippingVariantIndex(null);
        }}
      />
    </div>
  );
};

export default AddProductForm;
