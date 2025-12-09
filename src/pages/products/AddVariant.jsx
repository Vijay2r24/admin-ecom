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
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import { useSelector, useDispatch } from "react-redux";
import { fetchResource } from "../../store/slices/allDataSlice.jsx";
import { useTitle } from "../../context/TitleContext";
import BackButton from "../../components/BackButton.jsx";
import { useTranslation } from "react-i18next";
import SelectWithIcon from "../../components/SelectWithIcon.jsx";
import { apiGet } from "../../utils/ApiUtils.jsx";
import { GETPRODUCTDETAILS, GET_PRODUCT_BY_ID } from "../../contants/apiRoutes";
import { STATUS } from "../../contants/constants";
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
import PreviewSortable, { SortableThumb } from "../../components/products/PreviewSortable.jsx";
import ImageCropperModal from "../../components/ImageCropperModal";
import ImageManagement from "../../components/products/ImagesManager.jsx";
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
  const attributes = useSelector(
    (state) => state.allData.resources.attributes?.data || []
  );

  // UI / form states (kept from your original)
  const [mode, setMode] = useState("create");
  const [oFormData, setOFormData] = useState({
    StoreID: "",
    price: "",
    qty: "",
  });
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [aAttributes, setAAttributes] = useState([]);
  const [localAttributeOptions, setLocalAttributeOptions] = useState({});
  const [existingVariantName, setExistingVariantName] = useState("");
  const [existingPrice, setExistingPrice] = useState("");
  const [existingQty, setExistingQty] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [useStoreFilter, setUseStoreFilter] = useState(false);
  const [aVariants, setAVariants] = useState([]);
  const [groupingAttributeTypeID, setGroupingAttributeTypeID] = useState("");
  const [groupGlobalImages, setGroupGlobalImages] = useState({});
  const [selectedStores, setSelectedStores] = useState([]);
  const [formData, setFormData] = useState();

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
        } catch (e) {}
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

        if (modal.type === "global") {
          // create file
          const croppedFile = new File(
            [blob],
            modal.originalFile?.name || `global-${Date.now()}.jpg`,
            { type: "image/jpeg" }
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
          } catch (err) {}
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
        } catch (err) {}
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
      } catch (e) {}

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
      } catch (e) {}

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
        const value = attributes.find(
          (v) => String(v.AttributeValueID) === String(valueId)
        );
        return value?.Value || "";
      })
      .filter(Boolean)
      .join(" / ");
  };

  const deleteVariant = (id) => {
    setAVariants((prev) => prev.filter((v) => v.id !== id));
  };

  const handleVariantChange = (index, field, value) => {
    setAVariants((prev) => {
      const updated = [...prev];
      const variant = { ...updated[index] };

      variant[field] = value;

      const mrp = Number(variant.MRP || 0);
      const discount = Number(variant.ProductDiscount || 0);

      let sellingPrice = mrp - discount;
      sellingPrice = Math.max(0, sellingPrice);
      sellingPrice = Math.round(sellingPrice);

      variant.SellingPrice = sellingPrice;
      updated[index] = variant;
      return updated;
    });
  };

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
        label={`Upload images`}
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
        label="Upload common images for this group"
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
      alert("Please select at least one attribute value.");
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
  // Fetch/search product logic (kept original)
  // --------------------------
  useEffect(() => {
    setTitle(t("PRODUCTS.ADD_NEW_VARIANT"));
    setBackButton(<BackButton onClick={() => window.history.back()} />);
    return () => setBackButton(null);
  }, [setTitle, setBackButton, t]);

  useEffect(() => {
    dispatch(fetchResource({ key: "stores" }));
  }, [dispatch]);

  const fetchProducts = useCallback(
    async (query) => {
      if (!query.trim()) return;
      setLoading(true);
      const token = localStorage.getItem("token");

      try {
        const params = { searchText: query, pageNumber: 1, pageSize: 10 };

        if (useStoreFilter && oFormData.StoreID) {
          params.storeName =
            stores.find((s) => s.StoreID === oFormData.StoreID)?.StoreName ||
            "";
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
            firstImage: (p.Variants?.[0]?.ProductVariantImages || [])[0]?.Url || "",
          }));
          setSearchResults(data);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [useStoreFilter, oFormData.StoreID, stores]
  );

  useEffect(() => {
    if (searchText.trim().length > 2) {
      const delay = setTimeout(() => fetchProducts(searchText), 400);
      return () => clearTimeout(delay);
    } else {
      setSearchResults([]);
    }
  }, [searchText, fetchProducts]);

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
        const allAttributes = product.Variants.flatMap(
          (v) => v.Attributes || []
        );
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

        Object.keys(attributeMap).forEach((typeId) => {
          dispatch(
            fetchResource({
              key: "attributes",
              params: { AttributeTypeID: typeId },
            })
          );
        });

        const attrArray = Object.keys(attributeMap).map((typeId) => ({
          AttributeTypeID: typeId,
          AttributeTypeName: attributeMap[typeId].typeName,
          AttributeValueIDs: attributeMap[typeId].selectedValues,
          NewAttributeValueIDs: [],
        }));
        setAAttributes(attrArray);
      }
    } catch (err) {
      console.error(err);
      showEmsg(t("COMMON.API_ERROR"), STATUS.ERROR);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (attributes?.length) {
      const grouped = {};
      attributes.forEach((attr) => {
        if (!grouped[attr.AttributeTypeID]) grouped[attr.AttributeTypeID] = [];
        grouped[attr.AttributeTypeID].push({
          id: attr.AttributeValueID,
          label: attr.Value,
        });
      });
      setLocalAttributeOptions((prev) => ({ ...prev, ...grouped }));
    }
  }, [attributes]);

  const handleSelectProduct = (p) => {
    setSearchText(p.ProductName);
    setSearchResults([]);
    fetchProductDetails(p.ProductID);
  };

  const variantsExistButNoGrouping =
    aVariants.length > 0 && !groupingAttributeTypeID;

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
  const handleSubmitCreateVariant = async () => {
    if (!selectedProduct) {
      alert("Select a product first");
      return;
    }

    if (selectedStores.length === 0) {
      alert("Please select at least one store");
      return;
    }

    if (aVariants.length === 0) {
      alert("Please generate at least one variant");
      return;
    }

    console.log("🟦 DEBUG: Posting ALL variants in ONE request…");

    const token = localStorage.getItem("token");
    const formDataLocal = new FormData();
    const payloadVariants = [];
    let globalImageIndex = 0;

    for (let vIndex = 0; vIndex < aVariants.length; vIndex++) {
      const variant = aVariants[vIndex];

      const documentMetadata = [];

      (variant.images || []).forEach((img) => {
        if (img.file) {
          const fileKey = `images_${vIndex}_${globalImageIndex}`;
          formDataLocal.append("files[]", img.file);
          documentMetadata.push({
            image: fileKey,
            SortOrder: img.sortOrder || globalImageIndex + 1,
          });
          globalImageIndex++;
        }
      });

      const attributesArray = (variant.attributes || []).map((a) => ({
        AttributeTypeID: a.AttributeTypeID,
        AttributeValueIDs: a.AttributeValueIDs,
      }));

      payloadVariants.push({
        ProductID: selectedProduct.ProductID,
        Quantity: Number(variant.Quantity) || 0,
        MRP: Number(variant.MRP) || 0,
        SellingPrice: Number(variant.SellingPrice) || 0,
        StoreID: selectedStores,
        IsActive: true,
        Attributes: attributesArray,
        documentMetadata,
      });
    }

    formDataLocal.append("payload", JSON.stringify(payloadVariants));

    try {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/Variant/Add");
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.onload = function () {
        if (xhr.status === 200 || xhr.status === 201) {
          alert("✅ All variants saved successfully!");
          window.location.href = "/products";
        } else {
          console.error("❌ Upload failed", xhr.responseText);
          alert("Upload failed!");
        }
      };
      xhr.onerror = function () {
        alert("Network error during upload.");
      };
      xhr.send(formDataLocal);
    } catch (err) {
      console.error("❌ Upload Error:", err);
      alert("Something went wrong.");
    }
  };

  // --------------------------
  // Render UI (preserved)
  // --------------------------
  const storeOptions = useMemo(
    () => [...stores.map((s) => ({ value: s.StoreID, label: s.StoreName }))],
    [stores]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* CROP MODAL — shared for sequential cropping */}
      {cropperModal.isOpen && (
        <ImageCropperModal
          queue={cropQueue}
           onQueueUpdate={setCropQueue} 
          image={[
            cropperModal.image,
            cropperModal.type === "global"
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

      <div className="max-w-full mx-auto px-6">
        <div className="space-y-6">
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Product Search</h3>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="useStoreFilter"
                    checked={useStoreFilter}
                    onChange={(e) => setUseStoreFilter(e.target.checked)}
                    className="w-4 h-4 text-custom-bg border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor="useStoreFilter"
                    className="text-sm font-medium text-gray-700"
                  >
                    Filter by store
                  </label>
                </div>
              </div>

              {useStoreFilter && (
                <div className="mb-4">
                  <SelectWithIcon
                    label="Select Store"
                    value={oFormData.StoreID}
                    onChange={(e) =>
                      setOFormData({ ...oFormData, StoreID: e.target.value })
                    }
                    options={[{ value: "", label: "Choose a store..." }, ...storeOptions]}
                    Icon={Tag}
                  />
                </div>
              )}

              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  className="w-full border border-gray-300 pl-10 pr-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="Search products by name..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
                {loading && (
                  <div className="absolute right-3 top-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div className="absolute bg-white border border-gray-200 w-full mt-2 rounded-lg shadow-lg max-h-64 overflow-y-auto z-20">
                    {searchResults.map((p) => (
                      <div
                        key={p.ProductID}
                        className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition"
                        onClick={() => handleSelectProduct(p)}
                      >
                        <div className="flex items-center gap-3">
                          {p.firstImage ? (
                            <img
                              src={p.firstImage}
                              className="w-10 h-10 rounded-lg object-cover border"
                              alt={p.ProductName}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 border flex items-center justify-center">
                              <Tag className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {p.ProductName}
                            </p>
                            <p className="text-sm text-gray-500 truncate">
                              {p.BrandName} • {p.CategoryName}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Selected product & attribute panels preserved — truncated here visually but unchanged */}
            {selectedProduct && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Info className="h-5 w-5 text-custom-bg" />
                  <h3 className="font-semibold text-gray-900">
                    Selected Product
                  </h3>
                </div>

                <div className="bg-custom-bg/10 rounded-lg p-4 border border-custom-bg/50">
                  <h4 className="font-semibold text-custom-bg text-lg mb-1">
                    {selectedProduct.ProductName}
                  </h4>
                  <div className="flex flex-wrap gap-4 text-sm text-custom-bg">
                    <span className="flex items-center gap-1">
                      <span className="font-medium">Brand:</span>
                      {selectedProduct.BrandName}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="font-medium">Category:</span>
                      {selectedProduct.CategoryName}
                    </span>
                  </div>
                </div>

                {aAttributes.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Layers className="h-5 w-5 text-gray-600" />
                      <h4 className="font-semibold text-gray-900">
                        Current Attributes
                      </h4>
                    </div>
                    {/* Render attributes (kept) */}
                    {aAttributes.map((attr, index) => (
                      <div key={index} className="grid md:grid-cols-2 gap-6 mb-6">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Attribute Type
                          </label>
                          <div className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <Hash className="h-4 w-4 text-gray-500 mr-2" />
                            <span className="text-gray-900">{attr.AttributeTypeName}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Current Attribute Values
                          </label>
                          <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 min-h-[44px]">
                            {(localAttributeOptions[attr.AttributeTypeID] || [])
                              .filter((opt) => attr.AttributeValueIDs.includes(opt.id))
                              .map((opt) => (
                                <span key={opt.id} className="inline-flex items-center px-3 py-1 rounded-full bg-custom-bg/20 text-custom-bg text-sm font-medium">
                                  <Layers className="h-3 w-3 mr-1" />
                                  {opt.label}
                                </span>
                              ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Create / Add existing variant UI (kept intact) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Variant Type
              </label>
              <div className="relative">
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl pl-4 pr-10 py-2.5 text-sm text-gray-800 bg-white focus:ring-2 focus:ring-custom-bg focus:border-custom-bg transition-all duration-200 appearance-none"
                >
                  <option value="create">Create New Variant</option>
                  <option value="add-existing">Add Existing Variant</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Actual variant generator + tabs (preserved). VariantTabs receives GlobalImageUpload & VariantImageUpload */}
          {selectedProduct && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              {mode === "create" ? (
                <>
                  <h3 className="font-semibold text-gray-900 mb-6">
                    Create New Variant
                  </h3>

                  <div className="mb-6 w-1/2">
                    {/* MultiSelect was in original; kept simple here */}
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Stores for Variant
                    </label>
                    {/* <SelectWithIcon
                      value={selectedStores}
                      onChange={(e) => setSelectedStores([e.target.value])}
                      options={storeOptions}
                      multiple
                      Icon={Tag}
                    /> */}
                    <SelectWithIcon
  value={selectedStores}
  onChange={(e) => {
    const val = e.target.value;
    setSelectedStores(Array.isArray(val) ? val : [val]);
  }}
  options={storeOptions}
  multiple
  Icon={Tag}
/>

                  </div>

                  {aAttributes.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-medium text-gray-900 mb-4">
                        Select Attributes
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {aAttributes.map((attr, index) => (
                          <div key={index} className="bg-white border-gray-200 mb-4">
                            <div className="flex items-center gap-2 mb-4">
                              <Hash className="h-5 w-5 text-custom-bg" />
                              <h4 className="font-semibold text-gray-900">
                                {attr.AttributeTypeName}
                              </h4>
                            </div>
                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-700">
                                Available Values
                              </label>
                              <SelectWithIcon
                                value={attr.NewAttributeValueIDs || []}
                                onChange={(e) => {
                                  let values = e.target.value;
                                  if (!Array.isArray(values)) values = [values].filter(Boolean);
                                  const updated = [...aAttributes];
                                  updated[index].NewAttributeValueIDs = values;
                                  setAAttributes(updated);
                                }}
                                multiple
                                options={[
                                  { value: "" },
                                  ...((localAttributeOptions[attr.AttributeTypeID] || []).map(opt => ({ value: opt.id, label: opt.label }))),
                                ]}
                                Icon={Layers}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex items-end justify-between gap-4">
                    <div className="w-1/2">
                      <SelectWithIcon
                        label="Group by"
                        value={groupingAttributeTypeID}
                        onChange={(e) => setGroupingAttributeTypeID(e.target.value)}
                        options={[
                          ...aAttributes.map((attr) => ({ value: attr.AttributeTypeID, label: attr.AttributeTypeName })),
                        ]}
                        Icon={Layers}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={generateVariants}
                      className="px-6 py-3 bg-custom-bg text-white rounded-lg shadow transition"
                    >
                      Generate Variants
                    </button>
                  </div>

                  {variantsExistButNoGrouping && (
                    <div className="mt-4 p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800">
                      Variants generated, but please choose a "Group variants by" attribute to view them in tabs.
                    </div>
                  )}

                  <div className="mt-6">
                    <VariantTabs
                      aAttributes={aAttributes}
                      attributes={attributes}
                      aVariants={aVariants}
                      groupingAttributeTypeID={groupingAttributeTypeID}
                      getVariantName={getVariantName}
                      deleteVariant={deleteVariant}
                      handleVariantChange={handleVariantChange}
                      GlobalImageUpload={({ groupKey }) => <GlobalImageUpload groupKey={groupKey} />}
                      VariantImageUpload={({ variantIndex }) => <VariantImageUpload variantIndex={variantIndex} />}
                      TextInputWithIcon={TextInputWithIcon}
                      t={t}
                      oFormData={formData}
                      sensors={sensors}
                      enqueueFilesForCrop={enqueueFilesForCrop}
                      removeImage={removeVariantImage}
                      setAVariants={setAVariants}
                    />
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                      onClick={() => window.history.back()}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleSubmitCreateVariant}
                      disabled={!selectedProduct || selectedStores.length === 0}
                      className="flex-1 px-4 py-2.5 bg-custom-bg text-white rounded-lg font-medium hover:bg-custom-bg transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Create Variant
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Add existing variant mode UI kept as-is */}
                  <h3 className="font-semibold text-gray-900 mb-6">Add Existing Variant</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Select Stores for Variant</label>
                      <SelectWithIcon value={selectedStores} onChange={(e) => setSelectedStores([e.target.value])} options={storeOptions} Icon={Tag} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Select Variant</label>
                      <select value={existingVariantName} onChange={(e) => {
                        const val = e.target.value;
                        setExistingVariantName(val);
                        const v = (aVariants || []).find(ev => ev.name === val);
                        if (v) {
                          setExistingPrice(v.price);
                          setExistingQty(v.quantity);
                        }
                      }} className="w-full border border-gray-300 rounded-xl pl-4 pr-10 py-2.5 text-sm text-gray-800 bg-white">
                        <option value="">Choose a variant...</option>
                        {(aVariants || []).map((v, idx) => <option key={idx} value={v.name || `Variant ${idx+1}`}>{v.name || `Variant ${idx+1}`}</option>)}
                      </select>
                    </div>
                  </div>

                  {existingVariantName && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Price</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                          <input type="number" className="w-full border border-gray-300 pl-8 pr-4 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={existingPrice} onChange={(e) => setExistingPrice(e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                        <input type="number" className="w-full border border-gray-300 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={existingQty} onChange={(e) => setExistingQty(e.target.value)} />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-center mt-6">
                    <button type="button" onClick={() => {
                      if (selectedStores.length === 0) { alert("Please select at least one store"); return; }
                      alert(`✅ Existing Variant Attached to ${selectedStores.length} store(s)`);
                    }} disabled={!existingVariantName || selectedStores.length === 0} className="w-1/2 px-4 py-2.5 bg-custom-bg text-white rounded-lg">Attach Variant</button>
                  </div>
                </>
              )}
            </div>
          )}

          {!selectedProduct && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
              <div className="p-4 bg-gray-50 rounded-xl mb-4 inline-flex">
                <Info className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Select a Product</h3>
              <p className="text-gray-500 text-sm">Choose a product from the search results to start creating or adding variants</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
