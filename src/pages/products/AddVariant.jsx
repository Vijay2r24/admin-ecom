import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Upload,
  Hash,
  Layers,
  Tag,
  Search,
  Plus,
  Copy,
  Info,
  ChevronDown,
  X,
  FileText,
  Package,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import { useSelector, useDispatch } from "react-redux";
import { fetchResource } from "../../store/slices/allDataSlice.jsx";
import { useTitle } from "../../context/TitleContext";
import BackButton from "../../components/BackButton.jsx";
import { useTranslation } from "react-i18next";
import SelectWithIcon from "../../components/SelectWithIcon.jsx";
import { ToastContainer } from "react-toastify";
import { apiGet, apiPost } from "../../utils/ApiUtils.jsx";
import {
  GETPRODUCTDETAILS,
  GET_PRODUCT_BY_ID,
  GET_ALL_ATTRIBUTES,
  ADD_PRODUCT_VARIANTS,
  VALIDATE_PRODUCT_VARIANTS,
} from "../../contants/apiRoutes";
import { FILETYPE, STATUS } from "../../contants/constants";
import { showEmsg } from "../../utils/ShowEmsg.jsx";
import VariantTabs from "../../components/products/VariantTabs.jsx";
import TextInputWithIcon from "../../components/TextInputWithIcon.jsx";
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
import PreviewSortable, {
  SortableThumb,
} from "../../components/products/PreviewSortable.jsx";
import ImageCropperModal from "../../components/ImageCropperModal";
import ImageManagement from "../../components/products/ImagesManager.jsx";
import Accordion from "../../components/products/Accordion.jsx";
import { CSS } from "@dnd-kit/utilities";

/**
 * CreateVariant.jsx — patched to use unified crop queue + ImageManagement
 *
 * Notes:
 *  - UI/behavior preserved from your provided CreateVariant file.
 *  - ImageManagement is used for both variant-level and group(global) uploads.
 *  - enqueueFilesForCrop(files, meta) is the single entrypoint for dropped files.
 *    meta can be:
 *      - number -> variantIndex
 *      - { type: 'global', groupKey }
 */

export default function CreateVariant() {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { setTitle, setBackButton } = useTitle();

  // store resources
  const stores = useSelector(
    (state) => state.allData.resources.stores?.data || []
  );
  const allStores = useSelector(
    (state) => state.allData.resources.allStores?.data || []
  );
  const attributes = useSelector(
    (state) => state.allData.resources.attributes || {}
  );

  // UI / form states (kept from your original)
  const [mode, setMode] = useState("create");
  const [oFormData, setOFormData] = useState({
    StoreIDs: [],
    price: "",
    qty: "",
  });
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [aAttributes, setAAttributes] = useState([]);
  const [localAttributeOptions, setLocalAttributeOptions] = useState({});
  const [attachedVariants, setAttachedVariants] = useState([]);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [useStoreFilter, setUseStoreFilter] = useState(false);
  const [aVariants, setAVariants] = useState([]);
  const [groupingAttributeTypeID, setGroupingAttributeTypeID] = useState("");
  const [groupGlobalImages, setGroupGlobalImages] = useState({});
  const [existingGroupingAttributeTypeID, setExistingGroupingAttributeTypeID] =
    useState("");
  const [selectedStores, setSelectedStores] = useState([]);
  const [formData, setFormData] = useState();
  const [imageGallery, setImageGallery] = useState({
    isOpen: false,
    images: [],
    currentIndex: 0,
  });
  const [productDetailsOpen, setProductDetailsOpen] = useState(false);

  // Auto-select grouping attribute if only one exists (Create mode)
  useEffect(() => {
    if (aAttributes.length === 1) {
      setGroupingAttributeTypeID(String(aAttributes[0].AttributeTypeID));
    }
  }, [aAttributes]);

  // Derived state for Existing Variant Grouping
  const existingGroupingOptions = useMemo(() => {
    const typeMap = new Map();
    selectedProduct?.Variants?.forEach((v) => {
      (v.Attributes || []).forEach((a) => {
        if (!typeMap.has(String(a.AttributeTypeID))) {
          typeMap.set(String(a.AttributeTypeID), a.Name || "Unknown");
        }
      });
    });
    return Array.from(typeMap.entries()).map(([id, label]) => ({
      value: id,
      label: label,
    }));
  }, [selectedProduct]);

  // Auto-select grouping attribute if only one exists (Add Existing mode)
  useEffect(() => {
    if (existingGroupingOptions.length === 1) {
      setExistingGroupingAttributeTypeID(
        String(existingGroupingOptions[0].value)
      );
    }
  }, [existingGroupingOptions]);

  const existingTabAttributes = useMemo(() => {
    if (!existingGroupingAttributeTypeID) return [];

    const uniqueValueIds = new Set();
    attachedVariants.forEach((v) => {
      const attr = (v.attributes || []).find(
        (a) =>
          String(a.AttributeTypeID) === String(existingGroupingAttributeTypeID)
      );
      if (attr && attr.AttributeValueIDs) {
        attr.AttributeValueIDs.forEach((id) => uniqueValueIds.add(id));
      }
    });

    return [
      {
        AttributeTypeID: existingGroupingAttributeTypeID,
        NewAttributeValueIDs: Array.from(uniqueValueIds),
      },
    ];
  }, [existingGroupingAttributeTypeID, attachedVariants]);

  const allProductAttributes = useMemo(() => {
    const allAttrs = [];
    selectedProduct?.Variants?.forEach((v) => {
      (v.Attributes || []).forEach((a) => {
        allAttrs.push({
          AttributeValueID: a.AttributeValueID,
          Value: a.Value,
          Unit: a.Unit,
        });
      });
    });
    return allAttrs;
  }, [selectedProduct]);

  // --------------------------
  // Unified crop queue + modal (copied/adapted from AddProductForm)
  // --------------------------
  // queue items: { file, url, type: 'variant'|'global', variantIndex?, groupKey?, id }
  const [cropQueue, setCropQueue] = useState([]);
  const [cropperModal, setCropperModal] = useState({
    isOpen: false,
    image: "",
    variantIndex: null,
    originalFile: null,
    type: "variant",
    groupKey: null,
  });

  const activeUrlsRef = useRef(new Set());

  // Ref to track fetched attribute types
  const fetchedTypesRef = useRef(new Set());
  const isSelectionRef = useRef(false);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // cleanup on unmount
  useEffect(() => {
    return () => {
      activeUrlsRef.current.forEach((u) => {
        try {
          URL.revokeObjectURL(u);
        } catch (e) { }
      });
      activeUrlsRef.current.clear();
    };
  }, []);

  // When a queue item exists and modal closed, open modal for first item
  useEffect(() => {
    if (cropperModal.isOpen) return;
    if (!cropQueue || cropQueue.length === 0) return;

    const next = cropQueue[0];
    if (!next) return;

    // If enqueue already created url then use it, otherwise create it now.
    const url = next.url || URL.createObjectURL(next.file);
    activeUrlsRef.current.add(url);

    setCropperModal({
      isOpen: true,
      image: url,
      variantIndex: next.variantIndex ?? null,
      originalFile: next.file,
      type: next.type || "variant",
      groupKey: next.groupKey ?? null,
    });
  }, [cropQueue, cropperModal.isOpen]);

  // --------------------------
  // enqueueFilesForCrop - accepts array of File objects and meta
  // meta: number (variantIndex) or { type: 'global', groupKey }
  // --------------------------
  const enqueueFilesForCrop = useCallback((acceptedFiles, meta) => {
    if (!acceptedFiles || acceptedFiles.length === 0) return;

    const items = Array.from(acceptedFiles).map((file) => {
      const url = URL.createObjectURL(file);
      activeUrlsRef.current.add(url);

      const type =
        meta && meta.type
          ? meta.type
          : typeof meta === "number"
            ? "variant"
            : "variant";

      return {
        file,
        url,
        type,
        variantIndex:
          typeof meta === "number" ? meta : meta?.variantIndex ?? null,
        groupKey: meta?.groupKey ?? null,
        id: `crop-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      };
    });

    setCropQueue((prev) => [...prev, ...items]);
  }, []);

  // --------------------------
  // Apply global images to variants in a groupKey
  // --------------------------
  const applyGlobalImagesToGroupVariants = useCallback(
    (groupKey, globalImages) => {
      setAVariants((prev) =>
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
    },
    [groupingAttributeTypeID]
  );

  // --------------------------
  // handleCropComplete - when ImageCropperModal provides a blob
  // --------------------------
  const handleCropComplete = useCallback(
    (blob) => {
      const modal = { ...cropperModal };

      // determine which queue item we're processing
      // If blob present, create file/preview and apply to group/variant
      if (blob) {
        const croppedUrl = URL.createObjectURL(blob);
        activeUrlsRef.current.add(croppedUrl);

        if (modal.type === TYPE_GLOBAL) {
          // create file
          const croppedFile = new File(
            [blob],
            modal.originalFile?.name || `global-${Date.now()}.jpg`,
            { type: FILETYPE }
          );

          setGroupGlobalImages((prev) => {
            const existing = prev?.[modal.groupKey] || [];
            const newObj = {
              id: `g-${modal.groupKey}-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2)}`,
              file: croppedFile,
              preview: croppedUrl,
              isGlobal: true,
              sortOrder: existing.length + 1,
            };
            const updated = [...existing, newObj];

            // apply to variants in that group
            try {
              applyGlobalImagesToGroupVariants(modal.groupKey, updated);
            } catch (e) {
              // ignore
            }

            return { ...(prev || {}), [modal.groupKey]: updated };
          });
        } else if (modal.type === "attached-variant") {
          // attached-variant (existing variant) image
          const croppedFile = new File(
            [blob],
            modal.originalFile?.name || `attached-${Date.now()}.jpg`,
            { type: "image/jpeg" }
          );

          setAttachedVariants((prevVariants) => {
            const newVariants = [...prevVariants];
            const idx =
              typeof modal.variantIndex === "number" ? modal.variantIndex : 0;
            const currentImages = newVariants[idx]?.images || [];
            const newSortOrder =
              currentImages.length > 0
                ? Math.max(...currentImages.map((img) => img.sortOrder || 0)) +
                1
                : 1;

            newVariants[idx] = {
              ...newVariants[idx],
              images: [
                ...currentImages,
                {
                  file: croppedFile,
                  preview: croppedUrl,
                  sortOrder: newSortOrder,
                  id: `local-attached-${Date.now()}-${Math.random()
                    .toString(36)
                    .slice(2)}`,
                },
              ],
            };

            return newVariants;
          });
        } else {
          // variant-level image
          const croppedFile = new File(
            [blob],
            modal.originalFile?.name || `variant-${Date.now()}.jpg`,
            { type: "image/jpeg" }
          );

          setAVariants((prevVariants) => {
            const newVariants = [...prevVariants];
            const idx =
              typeof modal.variantIndex === "number" ? modal.variantIndex : 0;
            const currentImages = newVariants[idx]?.images || [];
            const newSortOrder =
              currentImages.length > 0
                ? Math.max(...currentImages.map((img) => img.sortOrder || 0)) +
                1
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

      // Pop queue and revoke the original modal.image after a small delay
      setCropQueue((prev) => {
        if (!prev || prev.length === 0) return [];
        const [, ...rest] = prev;

        const urlToRevoke = modal.image;
        setTimeout(() => {
          try {
            if (urlToRevoke) {
              URL.revokeObjectURL(urlToRevoke);
              activeUrlsRef.current.delete(urlToRevoke);
            }
          } catch (err) { }
        }, 120);

        return rest;
      });

      // close modal — next queue item (if any) will open modal by effect
      setCropperModal({
        isOpen: false,
        image: "",
        variantIndex: null,
        originalFile: null,
        type: "variant",
        groupKey: null,
      });
    },
    [cropperModal, applyGlobalImagesToGroupVariants]
  );

  // --------------------------
  // handleCropperCancel - drop current queued item and revoke URL
  // --------------------------
  const handleCropperCancel = useCallback(() => {
    const modal = { ...cropperModal };

    setCropQueue((prev) => {
      if (!prev || prev.length === 0) return [];
      const [, ...rest] = prev;

      const urlToRevoke = modal.image;
      setTimeout(() => {
        try {
          if (urlToRevoke) {
            URL.revokeObjectURL(urlToRevoke);
            activeUrlsRef.current.delete(urlToRevoke);
          }
        } catch (err) { }
      }, 100);

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
  }, [cropperModal]);

  // --------------------------
  // removeVariantImage - remove image by image id (handles global vs local)
  // --------------------------
  const removeVariantImage = useCallback((variantIndex, imageId) => {
    setAVariants((prev) => {
      const updated = [...prev];
      const variant = updated[variantIndex];
      if (!variant) return prev;

      const images = variant.images || [];
      const toRemove = images.find((img) => img.id === imageId);
      if (!toRemove) return prev;

      if (toRemove.isGlobal) {
        // mark this variant to exclude that global image
        const excluded = new Set(variant.excludedGlobalImageIds || []);
        excluded.add(imageId);

        // rebuild images: remove that global id and keep local ones
        const remainingGlobal = images.filter(
          (img) => img.isGlobal && img.id !== imageId
        );
        const remainingLocal = images.filter((img) => !img.isGlobal);

        const globalsReordered = remainingGlobal.map((g, i) => ({
          ...g,
          sortOrder: i + 1,
        }));
        const localsReordered = remainingLocal.map((l, i) => ({
          ...l,
          sortOrder: globalsReordered.length + i + 1,
        }));

        updated[variantIndex] = {
          ...variant,
          excludedGlobalImageIds: Array.from(excluded),
          images: [...globalsReordered, ...localsReordered],
        };

        return updated;
      }

      // otherwise local image: revoke blob if needed then remove
      try {
        if (toRemove.preview?.startsWith?.("blob:")) {
          URL.revokeObjectURL(toRemove.preview);
          activeUrlsRef.current.delete(toRemove.preview);
        }
      } catch (e) { }

      const remainingLocal = images.filter(
        (img) => !img.isGlobal && img.id !== imageId
      );
      const globalPart = images
        .filter((img) => img.isGlobal)
        .map((g, i) => ({ ...g, sortOrder: i + 1 }));

      const merged = [
        ...globalPart,
        ...remainingLocal.map((l, i) => ({
          ...l,
          sortOrder: globalPart.length + i + 1,
        })),
      ];

      updated[variantIndex] = { ...variant, images: merged };
      return updated;
    });
  }, []);

  // --------------------------
  // removeAttachedVariantImage - remove image for existing variant
  // --------------------------
  const removeAttachedVariantImage = useCallback((variantIndex, imageId) => {
    setAttachedVariants((prev) => {
      const updated = [...prev];
      const variant = updated[variantIndex];
      if (!variant) return prev;

      const images = variant.images || [];
      const toRemove = images.find((img) => img.id === imageId);
      if (!toRemove) return prev;

      // Revoke if needed
      try {
        if (toRemove.preview?.startsWith?.("blob:")) {
          URL.revokeObjectURL(toRemove.preview);
          activeUrlsRef.current.delete(toRemove.preview);
        }
      } catch (e) { }

      const remaining = images.filter((img) => img.id !== imageId);
      const reordered = remaining.map((img, i) => ({
        ...img,
        sortOrder: i + 1,
      }));

      updated[variantIndex] = { ...variant, images: reordered };
      return updated;
    });
  }, []);

  // --------------------------
  // removeGlobalImage & sortGlobalImages
  // --------------------------
  const removeGlobalImage = (groupKey, indexToRemove) => {
    setGroupGlobalImages((prev) => {
      const oldList = prev?.[groupKey] || [];
      const removed = oldList[indexToRemove];
      // revoke preview if blob
      try {
        if (removed?.preview?.startsWith?.("blob:")) {
          URL.revokeObjectURL(removed.preview);
          activeUrlsRef.current.delete(removed.preview);
        }
      } catch (e) { }

      const updated = oldList.filter((_, i) => i !== indexToRemove);

      // apply to variants in group
      applyGlobalImagesToGroupVariants(groupKey, updated);

      return { ...(prev || {}), [groupKey]: updated };
    });
  };

  const sortGlobalImages = (groupKey, newList) => {
    const fixed = newList.map((img, idx) => ({
      ...img,
      isGlobal: true,
      sortOrder: idx + 1,
    }));

    setGroupGlobalImages((prev) => ({ ...(prev || {}), [groupKey]: fixed }));
    applyGlobalImagesToGroupVariants(groupKey, fixed);
  };

  // --------------------------
  // Helpers for UI (unchanged)
  // --------------------------
  const getVariantName = (variant) => {
    if (!variant?.attributes) return "";
    return variant.attributes
      .map((attr) => {
        const valueId = attr.AttributeValueIDs?.[0];
        // Find the attribute value in localAttributeOptions
        const attributeTypeValues =
          localAttributeOptions[attr.AttributeTypeID] || [];
        const value = attributeTypeValues.find(
          (v) => String(v.id) === String(valueId)
        );
        return value?.label || "";
      })
      .filter(Boolean)
      .join(" / ");
  };

  const deleteVariant = (id) => {
    const updatedVariants = aVariants.filter((v) => v.id !== id);
    setAVariants(updatedVariants);

    if (groupingAttributeTypeID) {
      setAAttributes((prev) =>
        prev.map((attr) => {
          if (
            String(attr.AttributeTypeID) === String(groupingAttributeTypeID)
          ) {
            const usedValues = attr.NewAttributeValueIDs.filter((valId) =>
              updatedVariants.some((v) =>
                v.attributes.some(
                  (va) =>
                    String(va.AttributeTypeID) ===
                    String(groupingAttributeTypeID) &&
                    String(va.AttributeValueIDs?.[0]) === String(valId)
                )
              )
            );
            return { ...attr, NewAttributeValueIDs: usedValues };
          }
          return attr;
        })
      );
    }
  };

  const handleVariantChange = (index, field, value) => {
    setAVariants((prev) => {
      const updated = [...prev];
      const variant = { ...updated[index] };

      variant[field] = value;

      const mrp = Number(variant.MRP || 0);
      const discount = Number(variant.ProductDiscount || 0);

      // Current logic was: let sellingPrice = mrp - discount; (Fixed amount)
      // Correct logic (Percentage):
      let sellingPrice = mrp - (mrp * discount) / 100;

      sellingPrice = Math.max(0, sellingPrice);
      sellingPrice = Math.round(sellingPrice);

      variant.SellingPrice = sellingPrice;
      updated[index] = variant;
      return updated;
    });
  };

  // --------------------------
  // Function to fetch attribute values for a specific type
  // --------------------------
  // --------------------------
  // Function to fetch attribute values for a specific type
  // --------------------------
  const fetchAttributeValuesForType = useCallback(async (typeId, typeName) => {
    // This function is now just a helper for a single request if needed,
    // but we will primarily use batching in fetchProductDetails.
    // Kept for signature compatibility if used elsewhere, but logic moved to batch.

    // For single fetch:
    try {
      console.log('=== Fetching Attribute Values for Type ===');
      console.log('Fetching for typeId:', typeId, 'typeName:', typeName);
      const token = localStorage.getItem("token");
      const response = await apiGet(
        GET_ALL_ATTRIBUTES,
        { 
          AttributeTypeID: typeId,
          attributeTypeId: typeId
        },
        token
      );
      console.log('API response:', response);
      if (response?.data?.status === STATUS.SUCCESS.toUpperCase()) {
        const values = (response.data.data || []).map((val) => ({
          id: val.AttributeValueID,
          label: val.Unit ? `${val.Value} (${val.Unit})` : val.Value,
        }));
        console.log('Processed values for type', typeId, ':', values);
        setLocalAttributeOptions((prev) => {
          const updated = {
            ...prev,
            [typeId]: values,
          };
          console.log('Updated localAttributeOptions:', updated);
          return updated;
        });
      }
    } catch (err) {
      console.log('Error fetching attributes for type', typeId, ':', err);
      // Failed to fetch attribute values silent fail for now
    }
  }, []);

  // --------------------------
  // Variant image upload UI wrapper that uses ImageManagement
  // --------------------------
  const VariantImageUpload = ({ variantIndex }) => {
    const images = Array.isArray(aVariants[variantIndex]?.images)
      ? aVariants[variantIndex].images
      : [];

    return (
      <ImageManagement
        type="variant"
        images={images}
        sensors={sensors}
        label={t("ADD_VARIANT.UPLOAD_IMAGES")}
        onFilesDrop={(files) => enqueueFilesForCrop(files, variantIndex)}
        onRemoveImage={(i) => {
          const img = images[i];
          if (img) removeVariantImage(variantIndex, img.id);
        }}
        onSortChange={(newList) => {
          // newList is the new images array
          setAVariants((prev) => {
            const copy = [...prev];
            copy[variantIndex].images = newList.map((img, idx) => ({
              ...img,
              sortOrder: idx + 1,
            }));
            return copy;
          });
        }}
      />
    );
  };

  // --------------------------
  // Global images UI wrapper that uses ImageManagement
  // --------------------------
  const GlobalImageUpload = ({ groupKey }) => {
    const currentImages = groupGlobalImages[groupKey] || [];

    return (
      <ImageManagement
        type="global"
        images={currentImages}
        sensors={sensors}
        label={t("ADD_VARIANT.UPLOAD_COMMON_IMAGES")}
        onFilesDrop={(files) =>
          enqueueFilesForCrop(files, { type: "global", groupKey })
        }
        onRemoveImage={(index) => removeGlobalImage(groupKey, index)}
        onSortChange={(newList) => sortGlobalImages(groupKey, newList)}
      />
    );
  };

  // --------------------------
  // Generate variants (kept original)
  // --------------------------
  const generateVariants = () => {
    let allSelected = [];
    aAttributes.forEach((attr) => {
      const selected = attr.NewAttributeValueIDs || [];
      if (selected.length > 0) {
        allSelected.push({
          AttributeTypeID: attr.AttributeTypeID,
          values: selected,
        });
      }
    });
    if (allSelected.length === 0) {
      showEmsg(t("ADD_VARIANT.MSG_SELECT_ONE_ATTR"), STATUS.WARNING);
      return;
    }

    const makeComb = (arr, prefix = []) =>
      arr.length === 0
        ? [prefix]
        : arr[0].values.flatMap((v) =>
          makeComb(arr.slice(1), [
            ...prefix,
            { type: arr[0].AttributeTypeID, value: v },
          ])
        );

    const combos = makeComb(allSelected);

    const newVariants = combos.map((combo, idx) => ({
      id: Date.now() + "_" + idx,
      attributes: combo.map((c) => ({
        AttributeTypeID: c.type,
        AttributeValueIDs: [c.value],
      })),
      Quantity: "",
      MRP: "",
      ProductDiscount: "",
      SellingPrice: "",
      images: [],
    }));

    setAVariants(newVariants);
  };

  // --------------------------
  // Fetch/search product logic (updated)
  // --------------------------
  useEffect(() => {
    setTitle(t("ADD_VARIANT.TITLE"));
    setBackButton(<BackButton onClick={() => window.history.back()} />);
    return () => setBackButton(null);
  }, [setTitle, setBackButton, t]);

  useEffect(() => {
    dispatch(fetchResource({ key: "allStores" }));
    dispatch(fetchResource({ key: "stores" }));
  }, [dispatch]);

  const fetchProducts = useCallback(
    async (query) => {
      if (!query.trim()) return;
      setIsSearching(true);
      const token = localStorage.getItem("token");

      try {
        const params = { 
          searchText: query, 
          pageNumber: 1, 
          pageSize: 10,
          isUserProductList: useStoreFilter && oFormData.StoreIDs && oFormData.StoreIDs.length > 0
        };

        if (
          useStoreFilter &&
          oFormData.StoreIDs &&
          oFormData.StoreIDs.length > 0
        ) {
          // params.storeName = ... // Not easily derived for multiple stores, and likely not needed for filtering logic on backend if just ID is used.
          // Sending comma separated IDs
          params.storeId = oFormData.StoreIDs.join(",");
        }

        const response = await apiGet(GETPRODUCTDETAILS, params, token);
        const resData = response?.data;

        if (resData?.status === STATUS.SUCCESS.toUpperCase()) {
          const data = resData.data.map((p) => ({
            ProductID: p.ProductID,
            ProductName: p.ProductName,
            BrandName: p.BrandName,
            CategoryName: p.CategoryName,
            Variants: p.Variants || [],
            firstImage:
              (p.Variants?.[0]?.ProductVariantImages || [])[0]?.documentUrl ||
              (p.Variants?.[0]?.ProductVariantImages || [])[0]?.Url ||
              "",
          }));
          setSearchResults(data);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        // Search error silent fail
      } finally {
        setIsSearching(false);
      }
    },
    [useStoreFilter, oFormData.StoreIDs, stores]
  );

  useEffect(() => {
    if (isSelectionRef.current) {
      isSelectionRef.current = false;
      return;
    }
    if (searchText.trim().length > 2) {
      setIsSearching(true);
      const delay = setTimeout(() => fetchProducts(searchText.trim()), 400);
      return () => clearTimeout(delay);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchText, fetchProducts]);

  // Calculate attached variant selling price automatically
  const handleAttachedVariantChange = (index, field, value) => {
    setAttachedVariants((prev) => {
      const updated = [...prev];
      const variant = { ...updated[index] };

      variant[field] = value;

      if (field === "MRP" || field === "ProductDiscount") {
        const mrp = Number(variant.MRP || 0);
        const discount = Number(variant.ProductDiscount || 0);
        let sp = mrp - (mrp * discount) / 100;
        sp = Math.max(0, sp);
        variant.SellingPrice = Math.round(sp);
      } else if (field === "SellingPrice") {
        const mrp = Number(variant.MRP || 0);
        const sp = Number(value || 0);
        if (mrp > 0) {
          const discount = ((mrp - sp) / mrp) * 100;
          variant.ProductDiscount = Math.max(0, discount).toFixed(2);
        }
      }

      updated[index] = variant;
      return updated;
    });
  };

  const fetchProductDetails = async (productId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await apiGet(
        `${GET_PRODUCT_BY_ID}/${productId}`,
        {},
        token
      );

      if (response?.data?.status === STATUS.SUCCESS.toUpperCase()) {
        const product = response.data.data;
        setSelectedProduct(product);
        setFormData({
          ProductID: product.ProductID,
          ProductName: product.ProductName,
          ProductDescription: product.ProductDescription,
          BrandID: product.BrandID,
          BrandName: product.BrandName,
          CategoryID: product.CategoryID,
          CategoryName: product.CategoryName,
        });
        // Check if product has explicit AttributeTypes defined, otherwise extract from Variants
        let allAttributes = [];
        if (
          product.AttributeTypes &&
          Array.isArray(product.AttributeTypes) &&
          product.AttributeTypes.length > 0
        ) {
          const fromTypes = product.AttributeTypes.map((t) => ({
            AttributeTypeID: t.AttributeTypeID,
            Name: t.Name || t.AttributeTypeName,
            AttributeValueID: null, // Type definition often doesn't have a selected value yet
          }));
          allAttributes = [...fromTypes];
        }

        // Also extract from Variants to get selected values
        const fromVariants = (product.Variants || []).flatMap(
          (v) => v.Attributes || []
        );

        allAttributes = [...allAttributes, ...fromVariants];

        const attributeMap = {};

        allAttributes.forEach((attr) => {
          if (!attributeMap[attr.AttributeTypeID]) {
            attributeMap[attr.AttributeTypeID] = {
              typeName: attr.Name,
              selectedValues: [],
            };
          }
          if (
            !attributeMap[attr.AttributeTypeID].selectedValues.includes(
              attr.AttributeValueID
            )
          ) {
            attributeMap[attr.AttributeTypeID].selectedValues.push(
              attr.AttributeValueID
            );
          }
        });

        // Create attribute array
        // AND pre-fill options from the product data itself (so current values always show)
        const initialOptions = {};

        const attrArray = Object.keys(attributeMap).map((typeId) => ({
          AttributeTypeID: typeId.toUpperCase(),
          AttributeTypeName: attributeMap[typeId].typeName,
          AttributeValueIDs: attributeMap[typeId].selectedValues,
          NewAttributeValueIDs: [],
        }));

        // Build initial options from allAttributes (which contains the known selected values)
        // Only include attributes that belong to their specific type
        console.log('=== Building Initial Options ===');
        console.log('All attributes from product:', allAttributes);
        console.log('Attribute array (types we are using):', attrArray);
        
        allAttributes.forEach((attr) => {
          if (attr.AttributeTypeID && attr.AttributeValueID) {
            const normalizedTypeID = attr.AttributeTypeID.toUpperCase();
            
            // Only add this attribute if it belongs to one of the attribute types we're using
            const belongsToCurrentType = attrArray.some(
              typeAttr => String(typeAttr.AttributeTypeID) === String(normalizedTypeID)
            );
            
            console.log('Processing attribute:', { 
              attr, 
              normalizedTypeID, 
              belongsToCurrentType 
            });
            
            if (!belongsToCurrentType) return;

            if (!initialOptions[normalizedTypeID]) {
              initialOptions[normalizedTypeID] = [];
            }
            const label = attr.Unit
              ? `${attr.Value} (${attr.Unit})`
              : attr.Value;
            // Avoid duplicates in initial list
            const exists = initialOptions[normalizedTypeID].find(
              (o) => String(o.id) === String(attr.AttributeValueID)
            );
            if (!exists) {
              initialOptions[normalizedTypeID].push({
                id: attr.AttributeValueID,
                label: label,
              });
              console.log('Added to initial options:', { normalizedTypeID, label });
            }
          }
        });
        
        console.log('Final initial options:', initialOptions);
        console.log('=== End Building Initial Options ===');

        setLocalAttributeOptions((prev) => ({ ...prev, ...initialOptions }));

        setAAttributes(attrArray);

        // Fetch ALL attribute values for each type in PARALLEL to ensure we have complete data
        const token = localStorage.getItem("token");
        console.log('=== Fetching All Attribute Values ===');
        const fetchPromises = attrArray.map((attr) => {
          console.log('Setting up fetch for type:', attr.AttributeTypeID);
          return apiGet(
            GET_ALL_ATTRIBUTES,
            {
              // Send multiple casing variations to ensure backend hit
              AttributeTypeID: attr.AttributeTypeID,
              attributeTypeId: attr.AttributeTypeID,
              AttributeTypeIDs: [attr.AttributeTypeID],
              attributeTypeIds: [attr.AttributeTypeID],
            },
            token
          )
            .then((res) => {
              console.log('API response for type', attr.AttributeTypeID, ':', res);
              return { typeId: attr.AttributeTypeID, res };
            })
            .catch((err) => {
              console.log('API error for type', attr.AttributeTypeID, ':', err);
              return { typeId: attr.AttributeTypeID, error: err };
            });
        });

        const results = await Promise.all(fetchPromises);

        setLocalAttributeOptions((prev) => {
          const updatedOptions = { ...prev };
          console.log('=== Processing API Results ===');

          results.forEach(({ typeId, res, error }) => {
            console.log('Processing result for type:', typeId);
            if (res?.data?.status === STATUS.SUCCESS.toUpperCase()) {
              const rawData = res.data.data || [];
              console.log('Raw data for type', typeId, ':', rawData);
              const fetchedValues = rawData.map((val) => ({
                id: val.AttributeValueID || val.AttributeID || val.id,
                label: val.Unit ? `${val.Value} (${val.Unit})` : val.Value,
              }));
              console.log('Processed fetched values for type', typeId, ':', fetchedValues);

              // Merge with existing initialOptions, avoiding duplicates
              const existing = updatedOptions[typeId] || [];
              const merged = [...existing];

              fetchedValues.forEach((fVal) => {
                if (!merged.find((e) => String(e.id) === String(fVal.id))) {
                  merged.push(fVal);
                }
              });

              updatedOptions[typeId] = merged;
              console.log('Updated options for type', typeId, ':', merged);
            } else {
              console.log('Failed response for type', typeId, ':', res?.data);
            }
          });
          
          console.log('Final updatedOptions:', updatedOptions);
          console.log('=== End Processing API Results ===');
          return updatedOptions;
        });
      }
    } catch (err) {
      showEmsg(t("COMMON.API_ERROR"), STATUS.ERROR);
    } finally {
      setLoading(false);
    }
  };

  // Handle Redux attributes if they're still used
  useEffect(() => {
    if (
      attributes?.data?.length &&
      attributes?.status === STATUS.SUCCESS.toUpperCase()
    ) {
      // This handles the case where attributes come from Redux
      // But we're now fetching them individually, so this is a fallback
      const attributeData = attributes.data;

      // Try to determine which type these belong to
      // Since we don't have type ID in the response, we need to map them
      aAttributes.forEach((attrType) => {
        // Assuming the Redux response is for the current type being viewed
        const values = attributeData.map((val) => ({
          id: val.AttributeValueID,
          label: val.Unit ? `${val.Value} (${val.Unit})` : val.Value,
        }));

        setLocalAttributeOptions((prev) => ({
          ...prev,
          [attrType.AttributeTypeID]: values,
        }));
      });
    }
  }, [attributes, aAttributes]);

  const handleSelectProduct = (p) => {
    isSelectionRef.current = true;
    setSearchText(p.ProductName);
    setSearchResults([]);
    fetchProductDetails(p.ProductID);
  };

  const variantsExistButNoGrouping =
    aVariants.length > 0 && !groupingAttributeTypeID;

  // Collect all product images from all variants
  const getAllProductImages = useMemo(() => {
    if (!selectedProduct?.Variants) return [];
    const allImages = [];
    selectedProduct.Variants.forEach((variant) => {
      if (variant.ProductVariantImages && Array.isArray(variant.ProductVariantImages)) {
        variant.ProductVariantImages.forEach((img) => {
          allImages.push({
            url: img.documentUrl || img.Url,
            variantId: variant.VariantID,
            sortOrder: img.sortOrder || img.SortOrder || 0,
          });
        });
      }
    });
    // Sort by sortOrder
    return allImages.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [selectedProduct]);

  // Open image gallery
  const openImageGallery = useCallback((index = 0) => {
    setImageGallery({
      isOpen: true,
      images: getAllProductImages,
      currentIndex: index,
    });
  }, [getAllProductImages]);

  // Close image gallery
  const closeImageGallery = useCallback(() => {
    setImageGallery({
      isOpen: false,
      images: [],
      currentIndex: 0,
    });
  }, []);

  // Navigate gallery
  const navigateGallery = useCallback((direction) => {
    setImageGallery((prev) => {
      if (!prev.isOpen || prev.images.length === 0) return prev;
      let newIndex = prev.currentIndex;
      if (direction === "next") {
        newIndex = (prev.currentIndex + 1) % prev.images.length;
      } else if (direction === "prev") {
        newIndex = prev.currentIndex === 0 ? prev.images.length - 1 : prev.currentIndex - 1;
      }
      return { ...prev, currentIndex: newIndex };
    });
  }, []);

  const updateVariantLocalSort = (variantIndex, sortedList) => {
    setAVariants((prev) => {
      const updated = [...prev];
      const variant = updated[variantIndex];
      if (!variant) return prev;

      const globalPart = sortedList.filter((i) => i.isGlobal);
      const localPart = sortedList.filter((i) => !i.isGlobal);

      const rebuilt = [
        ...globalPart.map((g, i) => ({
          ...g,
          sortOrder: i + 1,
        })),
        ...localPart.map((l, i) => ({
          ...l,
          sortOrder: globalPart.length + i + 1,
        })),
      ];

      updated[variantIndex] = {
        ...variant,
        images: rebuilt,
      };

      return updated;
    });
  };

  // --------------------------
  // Submit logic (kept original; adapt if required)
  // --------------------------
  // --------------------------
  // Validate Variants
  // --------------------------
  const handleValidateVariants = async () => {
    if (!selectedProduct || aVariants.length === 0) {
      showEmsg(
        t("ADD_VARIANT.MSG_FIRST_GENERATE"),
        STATUS.WARNING
      );
      return false;
    }

    const payload = {
      ProductID: selectedProduct.ProductID,
      Variants: aVariants.map((v) => ({
        Attributes: (v.attributes || []).map((a) => ({
          AttributeTypeID: a.AttributeTypeID,
          AttributeValueIDs: a.AttributeValueIDs,
        })),
        // Add other fields to validate if backend requires them, e.g.
        MRP: Number(v.MRP) || 0,
        SellingPrice: Number(v.SellingPrice) || 0,
        Quantity: Number(v.Quantity) || 0,
      })),
    };

    try {
      const token = localStorage.getItem("token");

      const response = await apiPost(VALIDATE_PRODUCT_VARIANTS, payload, token);

      if (response?.data?.status === STATUS.SUCCESS.toUpperCase()) {
        showEmsg(t("ADD_VARIANT.MSG_VALIDATED"), STATUS.SUCCESS);
        return true;
      } else {
        // specific error handling if backend returns issues for specific variants
        showEmsg(response?.data?.message || t("ADD_VARIANT.MSG_VALIDATION_FAILED"), STATUS.ERROR);
        return false;
      }
    } catch (err) {
      // showEmsg("Validation error occurred", STATUS.ERROR);
      return false;
    }
  };

  // --------------------------
  // Submit logic (Refactored for addProductVariants)
  // --------------------------
  const handleSubmitCreateVariant = async () => {
    if (!selectedProduct) {
      showEmsg("Select a product first", STATUS.WARNING);
      return;
    }

    if (selectedStores.length === 0) {
      showEmsg("Please select at least one store", STATUS.WARNING);
      return;
    }

    if (aVariants.length === 0) {
      showEmsg(t("ADD_VARIANT.MSG_GENERATE_VARIANT"), STATUS.WARNING);
      return;
    }

    // Optional: Validate before submit?
    // const isValid = await handleValidateVariants();
    // if (!isValid) return;

    const token = localStorage.getItem("token");
    const formDataLocal = new FormData();
    const payloadVariants = [];
    let globalImageIndex = 0;

    // We need to map global images first or mixed?
    // The curl example shows img1, img2... linearly.
    // We'll iterate variants and their images.

    for (let vIndex = 0; vIndex < aVariants.length; vIndex++) {
      const variant = aVariants[vIndex];
      const documentMetadata = [];

      (variant.images || []).forEach((img) => {
        if (img.file) {
          const fileKey = `img${globalImageIndex + 1}`; // img1, img2...
          formDataLocal.append(fileKey, img.file);
          documentMetadata.push({
            image: fileKey,
            sortOrder: img.sortOrder || globalImageIndex + 1,
          });
          globalImageIndex++;
        }
      });

      const attributesArray = (variant.attributes || []).map((a) => ({
        AttributeTypeID: a.AttributeTypeID,
        AttributeValueIDs: a.AttributeValueIDs,
      }));

      // Only include documentMetadata if there are actual images
      const hasImages = documentMetadata.length > 0;

      payloadVariants.push({
        // ProductID is at root in curl, but maybe also inside variants?
        // Curl shows: data="{\"ProductID\":..., \"Variants\":[...]}"
        // So ProductID is top level of data JSON.

        MRP: Number(variant.MRP) || 0,
        SellingPrice: Number(variant.SellingPrice) || 0,
        DiscountPercentage: Number(variant.ProductDiscount) || 0, // Mapping ProductDiscount to DiscountPercentage
        Quantity: Number(variant.Quantity) || 0,
        Attributes: attributesArray,
        StoreIDs: selectedStores, // Array of strings
        ...(hasImages && { documentMetadata }),
      });
    }

    const dataPayload = {
      ProductID: selectedProduct.ProductID,
      Variants: payloadVariants,
    };

    formDataLocal.append("data", JSON.stringify(dataPayload));

    try {
      const response = await apiPost(
        ADD_PRODUCT_VARIANTS,
        formDataLocal,
        token,
        true
      );

      if (
        response?.data?.status?.toUpperCase() === STATUS.SUCCESS.toUpperCase()
      ) {
        showEmsg(t("ADD_VARIANT.MSG_ALL_SAVED"), STATUS.SUCCESS);
        // window.location.href = "/products"; // Navigation usually handled by router or kept on page
      } else {
        showEmsg(response?.data?.message || t("ADD_VARIANT.MSG_UPLOAD_FAILED"), STATUS.ERROR);
      }
    } catch (err) {
      showEmsg(t("ADD_VARIANT.MSG_SOMETHING_WRONG"), STATUS.ERROR);
    }
  };

  // --------------------------
  // Attach Existing Variant Logic
  // --------------------------
  const handleAttachExistingVariant = async () => {
    if (!selectedProduct) {
      showEmsg(t("ADD_VARIANT.MSG_SELECT_PRODUCT"), STATUS.WARNING);
      return;
    }
    if (selectedStores.length === 0) {
      showEmsg("Please select at least one store", STATUS.WARNING);
      return;
    }
    if (attachedVariants.length === 0) {
      showEmsg(t("ADD_VARIANT.MSG_SELECT_VARIANT_ATTACH"), STATUS.WARNING);
      return;
    }

    const token = localStorage.getItem("token");
    const formDataLocal = new FormData();
    const payloadVariants = [];

    // Process all attached variants
    for (const variant of attachedVariants) {
      // Construct Attributes array from the original variant
      // The backend expects AttributeTypeID and AttributeValueIDs
      const attributesArray = (variant.Attributes || []).map((a) => ({
        AttributeTypeID: a.AttributeTypeID,
        AttributeValueIDs: [
          a.AttributeValueID || a.AttributeValueId || a.attributeValueID,
        ],
      }));

      // Check if variant has new images to include documentMetadata
      const hasNewImages = variant.images && variant.images.some(img => img.file);
      const documentMetadata = hasNewImages ? [] : undefined;

      payloadVariants.push({
        ProductVariantID: variant.VariantID || variant.ProductVariantID,
        MRP: Number(variant.MRP) || 0,
        SellingPrice: Number(variant.SellingPrice) || 0,
        DiscountPercentage: Number(variant.ProductDiscount) || 0,
        Quantity: Number(variant.Quantity) || 0, // Using Quantity field we set in state
        Attributes: attributesArray,
        StoreIDs: selectedStores, // Array of strings
        ...(documentMetadata && { documentMetadata }),
      });
    }

    const dataPayload = {
      ProductID: selectedProduct.ProductID,
      Variants: payloadVariants,
    };

    formDataLocal.append("data", JSON.stringify(dataPayload));

    try {
      const response = await apiPost(
        ADD_PRODUCT_VARIANTS,
        formDataLocal,
        token,
        true
      );

      if (
        response?.data?.status?.toUpperCase() === STATUS.SUCCESS.toUpperCase()
      ) {
        showEmsg(t("ADD_VARIANT.MSG_VARIANTS_ATTACHED"), STATUS.SUCCESS);
        // Clear fields
        setAttachedVariants([]);
        setSelectedStores([]);
      } else {
        showEmsg(
          response?.data?.message || t("ADD_VARIANT.MSG_FAILED_ATTACH"),
          STATUS.ERROR
        );
      }
    } catch (err) {
      showEmsg(t("ADD_VARIANT.MSG_SOMETHING_WRONG"), STATUS.ERROR);
    }
  };

  // --------------------------
  // Render UI (preserved with corrected dropdown)
  // --------------------------
  const filterStoreOptions = useMemo(
    () => [...allStores.map((s) => ({ value: s.StoreID, label: s.StoreName }))],
    [allStores]
  );

  const availabilityStoreOptions = useMemo(
    () => [...stores.map((s) => ({ value: s.StoreID, label: s.StoreName }))],
    [stores]
  );

  // Handle keyboard navigation in gallery
  useEffect(() => {
    if (!imageGallery.isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft") {
        navigateGallery("prev");
      } else if (e.key === "ArrowRight") {
        navigateGallery("next");
      } else if (e.key === "Escape") {
        closeImageGallery();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [imageGallery.isOpen, navigateGallery, closeImageGallery]);

  return (
    <div className="min-h-screen bg-gray-50">
      <ToastContainer />
      {/* IMAGE GALLERY MODAL */}
      {imageGallery.isOpen && imageGallery.images.length > 0 && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
            <div className="text-white">
              <h3 className="font-semibold text-lg">{selectedProduct?.ProductName}</h3>
              <p className="text-sm text-gray-300">
                Image {imageGallery.currentIndex + 1} of {imageGallery.images.length}
              </p>
            </div>
            <button
              onClick={closeImageGallery}
              className="p-2 hover:bg-white/20 rounded-lg text-white transition-colors"
              aria-label="Close gallery"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Main Image */}
          <div className="relative flex-1 flex items-center justify-center w-full max-w-6xl mt-16 mb-24">
            {imageGallery.images.length > 1 && (
              <button
                onClick={() => navigateGallery("prev")}
                className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm transition-all z-10"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            <div className="flex items-center justify-center w-full h-full">
              <img
                src={imageGallery.images[imageGallery.currentIndex]?.url}
                alt={`Product image ${imageGallery.currentIndex + 1}`}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              />
            </div>

            {imageGallery.images.length > 1 && (
              <button
                onClick={() => navigateGallery("next")}
                className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm transition-all z-10"
                aria-label="Next image"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>

          {/* Thumbnail Strip */}
          {imageGallery.images.length > 1 && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="flex items-center justify-center gap-2 overflow-x-auto max-w-full pb-2">
                {imageGallery.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setImageGallery((prev) => ({ ...prev, currentIndex: idx }))}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      idx === imageGallery.currentIndex
                        ? "border-white ring-2 ring-custom-bg scale-110"
                        : "border-white/30 hover:border-white/60 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={img.url}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
              <p className="text-center text-white/80 text-xs mt-2">
                Use arrow keys or click thumbnails to navigate
              </p>
            </div>
          )}
        </div>
      )}

      {/* CROP MODAL — shared for sequential cropping */}
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
          onCropComplete={(blob) => handleCropComplete(blob)}
          onClose={handleCropperCancel}
          aspectRatio={1}
          minWidth={400}
          minHeight={400}
          title={`Crop Image (${cropQueue.length} pending)`}
        />
      )}

      <div className="max-w-6xl mx-auto px-6 pt-2 pb-8">
        <div className="space-y-8">
          {/* Section 1: Product Selection */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Search className="h-5 w-5 text-custom-bg" />
              <h2 className="text-lg font-semibold text-gray-900">
                {t("ADD_VARIANT.SELECT_PRODUCT")}
              </h2>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 transition-all hover:shadow-md">
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm text-gray-500 italic">
                  {t("ADD_VARIANT.FIND_PRODUCT_DESC")}
                </p>
                <div className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                  <input
                    type="checkbox"
                    id="useStoreFilter"
                    checked={useStoreFilter}
                    onChange={(e) => setUseStoreFilter(e.target.checked)}
                    className="w-4 h-4 text-custom-bg border-gray-300 rounded focus:ring-custom-bg"
                  />
                  <label
                    htmlFor="useStoreFilter"
                    className="text-xs font-semibold text-gray-600 cursor-pointer"
                  >
                    {t("ADD_VARIANT.FILTER_BY_STORE")}
                  </label>
                </div>
              </div>

              {useStoreFilter && (
                <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  <SelectWithIcon
                    label={t("ADD_VARIANT.SELECT_STORE_LABEL")}
                    value={oFormData.StoreIDs}
                    onChange={(e) => {
                      const val = e.target.value;
                      setOFormData({
                        ...oFormData,
                        StoreIDs: Array.isArray(val) ? val : [val],
                      });
                    }}
                    options={filterStoreOptions}
                    multiple
                    Icon={Tag}
                  />
                </div>
              )}

              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5 group-focus-within:text-custom-bg transition-colors" />
                <input
                  type="text"
                  className="w-full border border-gray-200 pl-12 pr-4 py-3.5 rounded-xl focus:ring-2 focus:ring-custom-bg/20 focus:border-custom-bg outline-none transition-all placeholder:text-gray-400 text-gray-900 shadow-sm"
                  placeholder={t("ADD_VARIANT.SEARCH_PLACEHOLDER")}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
                {isSearching && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-custom-bg/20 border-t-custom-bg"></div>
                  </div>
                )}

                {!isSearching && !selectedProduct && searchText.trim().length > 2 && (
                  <div className="absolute bg-white border border-gray-200 w-full mt-2 rounded-xl shadow-xl z-40 animate-in fade-in zoom-in-95 duration-200">
                    {searchResults.length > 0 ? (
                      <div className="max-h-80 overflow-y-auto">
                        {searchResults.map((p) => (
                          <div
                            key={p.ProductID}
                            className="p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors group/item"
                            onClick={() => handleSelectProduct(p)}
                          >
                            <div className="flex items-center gap-4">
                              {p.firstImage ? (
                                <img
                                  src={p.firstImage}
                                  className="w-12 h-12 rounded-lg object-cover border border-gray-200 shadow-sm"
                                  alt={p.ProductName}
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center">
                                  <Tag className="h-6 w-6 text-gray-300" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 group-hover/item:text-custom-bg transition-colors truncate">
                                  {p.ProductName}
                                </p>
                                <p className="text-xs text-gray-500 font-medium">
                                  {p.BrandName}{" "}
                                  <span className="mx-2 text-gray-300">•</span>{" "}
                                  {p.CategoryName}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Search className="h-10 w-10 text-gray-300" />
                          <p className="text-gray-600 font-medium">
                            {t("ADD_VARIANT.NO_PRODUCTS_FOUND")}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Selected Product Details Card with Accordion */}
            {selectedProduct && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-in slide-in-from-left-4 duration-500">
                <div className="bg-gradient-to-r from-custom-bg/10 to-custom-bg/5 border-b border-custom-bg/20 p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm border border-custom-bg/10">
                      <Package className="h-6 w-6 text-custom-bg" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 leading-tight text-lg">
                        {selectedProduct.ProductName}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 text-sm font-medium text-custom-bg">
                        <span className="bg-white/80 px-2 py-0.5 rounded border border-custom-bg/10">
                          {selectedProduct.BrandName}
                        </span>
                        <span className="text-gray-400">•</span>
                        <span className="bg-white/80 px-2 py-0.5 rounded border border-custom-bg/10">
                          {selectedProduct.CategoryName}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProduct(null);
                      setSearchText("");
                      setAAttributes([]);
                      setAVariants([]);
                      setAttachedVariants([]);
                    }}
                    className="p-2 hover:bg-white rounded-lg text-gray-400 hover:text-red-500 transition-all shadow-sm"
                    title={t("ADD_VARIANT.CHANGE_PRODUCT")}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Accordion Button for Product Details */}
                <div className="border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setProductDetailsOpen(!productDetailsOpen)}
                    className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Info className="h-5 w-5 text-gray-500" />
                      <span className="font-semibold text-gray-800">{t("ADD_VARIANT.PRODUCT_DETAILS")}</span>
                    </div>
                    <ChevronDown
                      className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
                        productDetailsOpen ? "rotate-180" : "rotate-0"
                      }`}
                    />
                  </button>

                  {productDetailsOpen && (
                    <div className="px-6 pb-6 space-y-6 border-t border-gray-100 bg-gray-50/50">
                    {/* Product ID */}
                    <div className="flex items-center gap-3 text-sm">
                      <span className="font-semibold text-gray-600">{t("ADD_VARIANT.PRODUCT_ID")}:</span>
                      <span className="text-gray-900 font-mono">{selectedProduct.ProductID}</span>
                    </div>

                    {/* Product Description */}
                    {selectedProduct.ProductDescription && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-500" />
                          <span className="font-semibold text-gray-700">{t("ADD_VARIANT.DESCRIPTION")}:</span>
                        </div>
                        <div
                          className="text-gray-600 text-sm leading-relaxed bg-gray-50 p-4 rounded-lg border border-gray-100"
                          dangerouslySetInnerHTML={{
                            __html: selectedProduct.ProductDescription,
                          }}
                        />
                      </div>
                    )}

                    {/* Two Column Layout: Left (Images) | Right (Attributes & Variants) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left Column: Product Images */}
                      <div className="space-y-3">
                        {getAllProductImages.length > 0 ? (
                          <>
                            <div className="flex items-center gap-2">
                              <ImageIcon className="h-4 w-4 text-gray-500" />
                              <span className="font-semibold text-gray-700">{t("ADD_VARIANT.PRODUCT_IMAGES")}:</span>
                              <span className="text-sm text-gray-500">
                                ({getAllProductImages.length} {getAllProductImages.length === 1 ? t("ADD_VARIANT.IMAGE") : t("ADD_VARIANT.IMAGES")})
                              </span>
                            </div>
                            <div className="flex gap-3 items-center flex-wrap">
                              {getAllProductImages.slice(0, 3).map((img, idx) => (
                                <div
                                  key={idx}
                                  className="relative group cursor-pointer flex-shrink-0"
                                  onClick={() => openImageGallery(idx)}
                                >
                                  <img
                                    src={img.url}
                                    alt={`Product image ${idx + 1}`}
                                    className="w-20 h-20 rounded-lg object-cover border border-gray-200 shadow-sm hover:shadow-lg transition-all group-hover:scale-105"
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-lg transition-colors flex items-center justify-center">
                                    <ImageIcon className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                </div>
                              ))}
                              {getAllProductImages.length > 3 && (
                                <div
                                  onClick={() => openImageGallery(3)}
                                  className="w-20 h-20 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-xs text-gray-600 font-medium cursor-pointer hover:bg-gray-50 hover:border-gray-400 transition-colors group flex-shrink-0"
                                >
                                  <span className="text-base font-bold text-custom-bg group-hover:text-custom-bg/80">
                                    +{getAllProductImages.length - 3}
                                  </span>
                                  <span className="text-[10px] mt-0.5">{t("ADD_VARIANT.MORE")}</span>
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-400">
                            <ImageIcon className="h-4 w-4" />
                            <span className="font-semibold text-sm">{t("ADD_VARIANT.PRODUCT_IMAGES")}:</span>
                            <span className="text-xs">{t("ADD_VARIANT.NO_IMAGES_AVAILABLE")}</span>
                          </div>
                        )}
                      </div>

                      {/* Right Column: Available Attributes & Existing Variants */}
                      <div className="space-y-6">
                        {/* Attributes Summary */}
                        {aAttributes && aAttributes.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Hash className="h-4 w-4 text-gray-500" />
                              <span className="font-semibold text-gray-700">{t("ADD_VARIANT.AVAILABLE_ATTRIBUTES")}:</span>
                              <span className="text-custom-bg font-bold">{aAttributes.length}</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {aAttributes.map((attr, idx) => (
                                <span
                                  key={idx}
                                  className="px-3 py-1 bg-custom-bg/10 text-custom-bg rounded-full text-xs font-medium border border-custom-bg/20"
                                >
                                  {attr.AttributeTypeName}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Variants Summary */}
                        {selectedProduct.Variants && selectedProduct.Variants.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Layers className="h-4 w-4 text-gray-500" />
                              <span className="font-semibold text-gray-700">{t("ADD_VARIANT.EXISTING_VARIANTS")}:</span>
                              <span className="text-custom-bg font-bold">
                                {selectedProduct.Variants.length}
                              </span>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                              <div className="grid grid-cols-1 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-600">{t("ADD_VARIANT.TOTAL_VARIANTS")}:</span>
                                  <span className="ml-2 font-semibold text-gray-900">
                                    {selectedProduct.Variants.length}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">{t("ADD_VARIANT.ACTIVE_VARIANTS")}:</span>
                                  <span className="ml-2 font-semibold text-green-600">
                                    {selectedProduct.Variants.filter((v) => v.IsActive).length}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {selectedProduct && (
            <>
              {/* Section 2: Configuration */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Layers className="h-5 w-5 text-custom-bg" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    {t("ADD_VARIANT.CONFIGURATION")}
                  </h2>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                    <div className="p-6 space-y-3">
                      <label className="text-xs font-bold text-gray-500">
                        {t("ADD_VARIANT.VARIANT_WORKFLOW")}
                      </label>
                      <SelectWithIcon
                        value={mode}
                        onChange={(e) => setMode(e.target.value)}
                        options={[
                          {
                            value: "create",
                            label: t("ADD_VARIANT.VARIANT_WORKFLOW_CREATE"),
                          },
                          {
                            value: "add-existing",
                            label: t("ADD_VARIANT.VARIANT_WORKFLOW_EXISTING"),
                          },
                        ]}
                        Icon={Plus}
                      />
                    </div>
                    <div className="p-6 space-y-3">
                      <label className="text-xs font-bold text-gray-500">
                        {t("ADD_VARIANT.AVAILABILITY_STORES")}
                      </label>
                      <SelectWithIcon
                        value={selectedStores}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedStores(Array.isArray(val) ? val : [val]);
                        }}
                        options={availabilityStoreOptions}
                        multiple
                        Icon={Tag}
                        placeholder={t("ADD_VARIANT.SELECT_STORES_PLACEHOLDER")}
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 3: Mode Specific Editor */}
              <section className="space-y-6">
                {mode === "create" ? (
                  <div className="space-y-8 animate-in fade-in duration-500">
                    {/* Attributes & Generation Selection Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="bg-gray-50/50 border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                          <Hash className="h-4 w-4 text-custom-bg" />
                          {t("ADD_VARIANT.SPECIFY_COMBINATIONS")}
                        </h4>
                        <p className="text-xs text-gray-500 font-medium">
                          {t("ADD_VARIANT.CHOOSE_VALUES_TO_GENERATE")}
                        </p>
                      </div>

                      <div className="p-6">
                        {aAttributes.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {aAttributes.map((attr, index) => (
                              <div key={index} className="space-y-2 group">
                                <div className="flex items-center justify-between">
                                  <label className="text-sm font-bold text-gray-700">
                                    {attr.AttributeTypeName}
                                  </label>
                                  {attr.NewAttributeValueIDs?.length > 0 && (
                                    <span className="text-[10px] px-2 py-0.5 bg-custom-bg/10 text-custom-bg rounded-full font-bold">
                                      {attr.NewAttributeValueIDs.length}{" "}
                                      {t("ADD_VARIANT.SELECTED")}
                                    </span>
                                  )}
                                </div>
                                <SelectWithIcon
                                  value={attr.NewAttributeValueIDs || []}
                                  onChange={(e) => {
                                    let values = e.target.value;
                                    if (!Array.isArray(values))
                                      values = [values].filter(Boolean);
                                    const updated = [...aAttributes];
                                    updated[index].NewAttributeValueIDs =
                                      values;
                                    setAAttributes(updated);
                                  }}
                                  onInputChange={() => {
                                    // Fetch attribute values for this specific type when dropdown is opened
                                    console.log('Dropdown opened for type:', attr.AttributeTypeID);
                                    fetchAttributeValuesForType(
                                      attr.AttributeTypeID,
                                      attr.AttributeTypeName
                                    );
                                  }}
                                  multiple
                                  placeholder={t("ADD_VARIANT.PICK_VALUES_PLACEHOLDER")}
                                  options={(() => {
                                  console.log('=== AddVariant Options Calculation ===');
                                  console.log('Current attribute:', attr);
                                  console.log('AttributeTypeID:', attr.AttributeTypeID);
                                  console.log('LocalAttributeOptions:', localAttributeOptions);
                                  const options = localAttributeOptions[
                                    attr.AttributeTypeID.toUpperCase()
                                    ] || [];
                                  console.log('Options for this type:', options);
                                  const mappedOptions = options.map((opt) => ({
                                    value: opt.id,
                                    label: opt.label,
                                  }));
                                  console.log('Final mapped options:', mappedOptions);
                                  console.log('=== End AddVariant Options Calculation ===');
                                  return mappedOptions;
                                })()}
                                  Icon={Layers}
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 mt-2">
                            <Layers className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 font-medium text-sm">
                              {t("ADD_VARIANT.NO_ATTRIBUTES_AVAILABLE")}
                            </p>
                          </div>
                        )}

                        <div className="mt-8 pt-8 border-t border-gray-100 flex flex-col md:flex-row items-end justify-between gap-6">
                          {aAttributes.length >= 1 && (
                            <div className="w-full md:w-1/2 space-y-2">
                              <label className="text-xs font-bold text-gray-500">
                                {t("ADD_VARIANT.DISPLAY_GROUPING")}
                              </label>
                              <SelectWithIcon
                                value={groupingAttributeTypeID}
                                disabled={aAttributes.length === 1}
                                onChange={(e) =>
                                  setGroupingAttributeTypeID(e.target.value)
                                }
                                options={[
                                  {
                                    value: "",
                                    label: t("ADD_VARIANT.SELECT_GROUPING_PLACEHOLDER"),
                                  },
                                  ...aAttributes.map((attr) => ({
                                    value: attr.AttributeTypeID,
                                    label: attr.AttributeTypeName,
                                  })),
                                ]}
                                Icon={Layers}
                              />
                            </div>
                          )}

                          <div className="flex gap-4 shrink-0 justify-end md:w-auto w-full">
                            <button
                              type="button"
                              onClick={handleValidateVariants}
                              className="px-6 py-2 border-2 border-custom-bg/20 text-custom-bg rounded-xl font-bold text-sm tracking-wide hover:bg-custom-bg/5 hover:border-custom-bg transition-all active:scale-95"
                            >
                              {t("ADD_VARIANT.VALIDATE_COMBO")}
                            </button>

                            <button
                              type="button"
                              onClick={generateVariants}
                              className="px-8 py-2 bg-custom-bg text-white rounded-xl font-bold text-sm tracking-wide hover:bg-custom-bg/90 transition-all active:scale-95 flex items-center gap-2"
                            >
                              <Plus className="h-4 w-4" />
                              {t("ADD_VARIANT.GENERATE_VARIANTS")}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {variantsExistButNoGrouping && (
                      <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-amber-800 flex items-center gap-3 text-sm font-medium shadow-sm animate-bounce-subtle">
                        <Info className="h-4 w-4 text-amber-400" />
                        {t("ADD_VARIANT.INFO_CHOOSE_GROUPING")}
                      </div>
                    )}

                    {/* Variant Editor Card */}
                    {aVariants.length > 0 && groupingAttributeTypeID && (
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden transition-all hover:shadow-md animate-in slide-in-from-bottom-4 duration-500">
                        <div className="p-6">
                          <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-gray-100 rounded-lg">
                              <FileText className="h-5 w-5 text-gray-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">
                              {t("ADD_VARIANT.VARIANT_DETAILS_EDITOR")}
                            </h3>
                          </div>
                          <VariantTabs
                            aAttributes={aAttributes}
                            attributes={attributes?.data || []}
                            aVariants={aVariants}
                            groupingAttributeTypeID={groupingAttributeTypeID}
                            getVariantName={getVariantName}
                            deleteVariant={deleteVariant}
                            handleVariantChange={handleVariantChange}
                            GlobalImageUpload={({ groupKey }) => (
                              <GlobalImageUpload groupKey={groupKey} />
                            )}
                            VariantImageUpload={({ variantIndex }) => (
                              <VariantImageUpload variantIndex={variantIndex} />
                            )}
                            TextInputWithIcon={TextInputWithIcon}
                            t={t}
                            oFormData={formData}
                            sensors={sensors}
                            enqueueFilesForCrop={enqueueFilesForCrop}
                            removeImage={removeVariantImage}
                            localAttributeOptions={localAttributeOptions}
                            setVariants={setAVariants}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Add Existing Variant Mode */
                  <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-custom-bg/10 rounded-lg">
                          <Layers className="h-5 w-5 text-custom-bg" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">
                          {t("ADD_VARIANT.MANAGED_VARIANT_SELECTION")}
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-500">
                            {t("ADD_VARIANT.AVAILABLE_VARIANTS")}
                          </label>
                          <SelectWithIcon
                            multiple
                            value={attachedVariants.map((v) => v.VariantID)}
                            onChange={(e) => {
                              const selectedValues = Array.isArray(
                                e.target.value
                              )
                                ? e.target.value
                                : [e.target.value];
                              const selectedIdsStr = selectedValues.map(String);

                              setAttachedVariants((prev) => {
                                const keptVariants = prev.filter((p) =>
                                  selectedIdsStr.includes(String(p.VariantID))
                                );
                                const existingIds = keptVariants.map((v) =>
                                  String(v.VariantID)
                                );
                                const newIds = selectedIdsStr.filter(
                                  (id) => !existingIds.includes(String(id))
                                );

                                const newVariantsToAdd = newIds
                                  .map((id) => {
                                    const original = (
                                      selectedProduct?.Variants || []
                                    ).find(
                                      (v) => String(v.VariantID) === String(id)
                                    );
                                    if (!original) return null;

                                    const mappedImages = (
                                      original.ProductVariantImages || []
                                    ).map((img, i) => ({
                                      id:
                                        img.documentId ||
                                        img.ProductVariantImageID ||
                                        `existing-${i}`,
                                      preview: img.documentUrl || img.Url,
                                      isGlobal: false,
                                      sortOrder:
                                        img.sortOrder || img.SortOrder || i + 1,
                                    }));

                                    const firstInventory =
                                      original.Inventory &&
                                        original.Inventory.length > 0
                                        ? original.Inventory[0]
                                        : {};
                                    const normalizedAttributes = (
                                      original.Attributes || []
                                    ).map((a) => ({
                                      AttributeTypeID: a.AttributeTypeID,
                                      AttributeTypeName: a.Name,
                                      AttributeValueIDs: [a.AttributeValueID],
                                    }));

                                    return {
                                      ...original,
                                      id: original.VariantID,
                                      MRP: original.MRP || "",
                                      ProductDiscount:
                                        firstInventory.DiscountPercentage ||
                                        original.DiscountPercentage ||
                                        original.ProductDiscount ||
                                        selectedProduct?.ProductDiscount ||
                                        "",
                                      Quantity:
                                        firstInventory.Quantity ||
                                        original.StockQuantity ||
                                        original.Quantity ||
                                        "",
                                      SellingPrice:
                                        firstInventory.SellingPrice ||
                                        original.SellingPrice ||
                                        "",
                                      images: mappedImages,
                                      attributes: normalizedAttributes,
                                    };
                                  })
                                  .filter(Boolean);

                                return [...keptVariants, ...newVariantsToAdd];
                              });
                            }}
                            options={(selectedProduct?.Variants || []).map(
                              (v, idx) => {
                                const label = (v.Attributes || [])
                                  .map(
                                    (a) =>
                                      `${a.Name}: ${a.Value}${a.Unit ? ` ${a.Unit}` : ""
                                      }`
                                  )
                                  .join(" / ");
                                return {
                                  value: v.VariantID,
                                  label: label || `Variant ${idx + 1}`,
                                };
                              }
                            )}
                            Icon={Layers}
                            placeholder={t("ADD_VARIANT.SELECT_VARIANTS_PLACEHOLDER")}
                          />
                        </div>

                        {existingGroupingOptions.length >= 1 && (
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500">
                              {t("ADD_VARIANT.GROUP_MANAGED_BY")}
                            </label>
                            <SelectWithIcon
                              value={existingGroupingAttributeTypeID}
                              disabled={existingGroupingOptions.length === 1}
                              onChange={(e) =>
                                setExistingGroupingAttributeTypeID(
                                  e.target.value
                                )
                              }
                              options={existingGroupingOptions}
                              Icon={Layers}
                              placeholder={t("ADD_VARIANT.SELECT_GROUPING_PLACEHOLDER")}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {attachedVariants.length > 0 && (
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 animate-in slide-in-from-bottom-4 duration-500">
                        <VariantTabs
                          aVariants={attachedVariants}
                          aAttributes={existingTabAttributes}
                          attributes={allProductAttributes}
                          groupingAttributeTypeID={
                            existingGroupingAttributeTypeID
                          }
                          getVariantName={(variant) => {
                            return (
                              (variant.attributes || [])
                                .map(
                                  (a) =>
                                    `${a.AttributeTypeName}: ${(variant.Attributes || []).find(
                                      (at) =>
                                        at.AttributeValueID ===
                                        a.AttributeValueIDs[0]
                                    )?.Value || ""
                                    } ${(variant.Attributes || []).find(
                                      (at) =>
                                        at.AttributeValueID ===
                                        a.AttributeValueIDs[0]
                                    )?.Unit || ""
                                    }`
                                )
                                .join(" / ") || `Variant`
                            );
                          }}
                          deleteVariant={(id) =>
                            setAttachedVariants((prev) =>
                              prev.filter((v) => v.id !== id)
                            )
                          }
                          handleVariantChange={(index, field, value) =>
                            handleAttachedVariantChange(index, field, value)
                          }
                          GlobalImageUpload={() => null}
                          TextInputWithIcon={TextInputWithIcon}
                          t={t}
                          oFormData={{}}
                          sensors={sensors}
                          enqueueFilesForCrop={(files, meta) =>
                            enqueueFilesForCrop(files, {
                              ...meta,
                              type: "attached-variant",
                            })
                          }
                          removeImage={removeAttachedVariantImage}
                          setVariants={setAttachedVariants}
                          localAttributeOptions={{}}
                          hideUpload={true}
                        />
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* Section 4: Final Submission */}
              <div className="pt-6 border-t border-gray-200">
                <div className="flex gap-4 max-w-2xl ml-auto">
                  <button
                    type="button"
                    className="flex-1 px-8 py-2.5 border border-gray-300 text-gray-600 rounded-xl font-bold text-sm tracking-wide hover:bg-gray-50 transition-all active:scale-95"
                    onClick={() => window.history.back()}
                  >
                    {t("ADD_VARIANT.DISCARD_CHANGES")}
                  </button>

                  <button
                    type="button"
                    onClick={
                      mode === "create"
                        ? handleSubmitCreateVariant
                        : handleAttachExistingVariant
                    }
                    disabled={
                      !selectedProduct ||
                      selectedStores.length === 0 ||
                      (mode === "create"
                        ? aVariants.length === 0
                        : attachedVariants.length === 0)
                    }
                    className="flex-1 px-8 py-2.5 bg-custom-bg text-white rounded-xl font-bold text-sm tracking-wide shadow-lg shadow-custom-bg/30 hover:shadow-custom-bg/40 hover:-translate-y-0.5 transition-all active:translate-y-0 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {mode === "create"
                      ? t("ADD_VARIANT.SUBMIT_NEW_VARIANTS")
                      : t("ADD_VARIANT.SYNC_SELECTED_VARIANTS")}
                  </button>
                </div>
              </div>
            </>
          )}

          {!selectedProduct && (
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-16 text-center animate-pulse-subtle">
              <div className="p-6 bg-custom-bg/5 rounded-3xl mb-8 inline-flex ring-8 ring-custom-bg/[0.02]">
                <Search className="h-12 w-12 text-custom-bg/40" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">
                {t("ADD_VARIANT.READY_TO_ADD")}
              </h3>
              <p className="text-gray-500 max-w-sm mx-auto leading-relaxed font-medium">
                {t("ADD_VARIANT.START_BY_SEARCHING")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
