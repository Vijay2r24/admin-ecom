// VariantTabs.jsx  (Fully Patched)
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchResource } from "../../store/slices/allDataSlice.jsx";
import { Tab } from "@headlessui/react";
import { Hash, Tag, X, Package, Scale, Ruler, Globe, PlusCircle } from "lucide-react";
import Accordion from "../../components/products/Accordion.jsx";
import ImageManagement from "./ImagesManager.jsx";
import VariantPreviewSection from "../../pages/products/VariantPreviewCard";
import ShippingSection from "./ShippingSection.jsx";
import { FIELD_NAMES, SELECT_VALUES, SECTION_TITLES } from "../../contants/constants";
import TextInputWithIcon from "../TextInputWithIcon";
import SelectWithIcon from "../SelectWithIcon";
import AddPackageModal from "./AddPackageModal";
import EditPackageModal from "./EditPackageModal";

export default function VariantTabs({
  aAttributes,
  attributes,
  aVariants,
  groupingAttributeTypeID,
  getVariantName,
  deleteVariant,
  handleVariantChange,
  GlobalImageUpload,
  TextInputWithIcon,
  t,
  oFormData,
  brands,
  aSpecifications,
  specificationTypes,
  attributeTypes,

  // Required new props:
  sensors,
  enqueueFilesForCrop,
  removeImage,
  setVariants,
  localAttributeOptions,
  hideUpload,
  packagingBoxes = [],
  weightUnits = [],
  countries: countriesProp = [],
}) {
  const dispatch = useDispatch();
  const countriesFromStore = useSelector(
    (state) => state.allData.resources.countries?.data || []
  );
  const countries = countriesProp.length > 0 ? countriesProp : countriesFromStore;
  const [previewVariant, setPreviewVariant] = useState(null);
  const [mrpEditedMap, setMrpEditedMap] = useState({});
  const [showAddPackageModal, setShowAddPackageModal] = useState(false);
  const [currentVariantIndex, setCurrentVariantIndex] = useState(null);
  const [showEditPackageModal, setShowEditPackageModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);

  useEffect(() => {
    if (countries.length === 0) {
      dispatch(fetchResource({ key: "countries" }));
    }
  }, []);

  const handleMRPChange = (index, newValue) => {
    setMrpEditedMap((prev) => ({ ...prev, [index]: true }));
    handleVariantChange(index, "MRP", newValue);

    if (!newValue || isNaN(newValue)) return;

    aVariants.forEach((v, i) => {
      if (i !== index && !mrpEditedMap[i]) {
        handleVariantChange(i, "MRP", newValue);
      }
    });
  };

  const handleSellingPriceChange = (index, value) => {
    let numeric = parseFloat(value);
    if (isNaN(numeric)) numeric = 0;
    handleVariantChange(index, "SellingPrice", Math.round(numeric));
  };

  const groupingAttribute = aAttributes.find(
    (a) => String(a.AttributeTypeID) === String(groupingAttributeTypeID)
  );

  const groupingValues = groupingAttribute?.NewAttributeValueIDs || [];

  const getOptionsForType = (typeId) => {
    if (typeId == null || typeId === "") return [];
    return (
      localAttributeOptions?.[typeId] ||
      localAttributeOptions?.[String(typeId)] ||
      []
    );
  };

  const isUuidLike = (value) =>
    !value ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      String(value)
    );

  const resolveGroupTabLabel = (valueId) => {
    const id = String(valueId);
    const options = getOptionsForType(groupingAttributeTypeID);
    const foundOption = options.find((o) => String(o.id) === id);
    if (foundOption?.label && !isUuidLike(foundOption.label) && foundOption.label !== id) {
      return foundOption.label;
    }

    const valObj = (attributes || []).find(
      (a) =>
        String(
          a.AttributeValueID || a.attributeValueID || a.attributeValueId
        ) === id
    );
    if (valObj) {
      const value = valObj.Value || valObj.value || "";
      const unit = valObj.Unit || valObj.unit;
      if (value && !isUuidLike(value)) {
        return unit ? `${value} (${unit})` : value;
      }
    }

    const idx = (groupingAttribute?.NewAttributeValueIDs || []).findIndex(
      (v) => String(v) === id
    );
    const fallbackLabel =
      idx >= 0 ? groupingAttribute?.valueLabels?.[idx] : undefined;
    if (
      fallbackLabel &&
      !isUuidLike(fallbackLabel) &&
      String(fallbackLabel) !== id
    ) {
      return fallbackLabel;
    }

    return "—";
  };

  return (
    <>
      {/* ----------------- TAB HEADERS ----------------- */}
      <Tab.Group>
        <Tab.List className="flex border-b border-gray-200 bg-gray-50 p-4 space-x-2 overflow-x-auto">
          {groupingValues.length === 0 ? (
            <div className="text-gray-500 px-4 py-2">
              No attribute values selected
            </div>
          ) : (
            groupingValues.map((valueId) => {
              const label = resolveGroupTabLabel(valueId);

              return (
                <Tab
                  key={valueId}
                  className={({ selected }) =>
                    `px-6 py-3 text-sm font-medium border-b-2 ${selected
                      ? "border-custom-bg text-custom-bg"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                    }`
                  }
                >
                  {label}
                </Tab>
              );
            })
          )}
        </Tab.List>

        {/* ----------------- TAB PANELS ----------------- */}
        <Tab.Panels className="pt-0 space-y-4">
          {groupingValues.map((valueId) => {
            const groupVariants = aVariants.filter((variant) =>
              variant.attributes.some(
                (a) =>
                  String(a.AttributeTypeID) ===
                  String(groupingAttributeTypeID) &&
                  a.AttributeValueIDs?.some(
                    (id) => String(id) === String(valueId)
                  )
              )
            );

            return (
              <Tab.Panel key={valueId} unmount={false}>
                {/* GLOBAL IMAGE UPLOAD */}
                <div className="flex justify-center mb-3">
                  <div className="w-1/2">
                    <GlobalImageUpload groupKey={valueId} />
                  </div>
                </div>

                {/* VARIANTS INSIDE THIS GROUP */}
                {groupVariants.length > 0 ? (
                  groupVariants.map((variant) => {
                    const originalIndex = aVariants.findIndex(
                      (v) => v.id === variant.id
                    );

                    // Show only non-grouping attributes in the variant title
                    const nonGroupAttrs = (variant.attributes || []).filter(
                      (a) =>
                        String(a.AttributeTypeID) !==
                        String(groupingAttributeTypeID)
                    );

                    const variantLabel =
                      nonGroupAttrs.length > 0
                        ? nonGroupAttrs
                            .map((attr) => {
                              const valueId = attr.AttributeValueIDs?.[0];
                              const options =
                                getOptionsForType(attr.AttributeTypeID);
                              const found = options.find(
                                (o) => String(o.id) === String(valueId)
                              );
                              if (
                                found?.label &&
                                !isUuidLike(found.label) &&
                                found.label !== String(valueId)
                              ) {
                                return found.label;
                              }
                              const valObj = attributes.find(
                                (a) =>
                                  String(
                                    a.AttributeValueID ||
                                      a.attributeValueID ||
                                      a.attributeValueId
                                  ) === String(valueId)
                              );
                              const value =
                                valObj?.Value ||
                                valObj?.value ||
                                attr.Value ||
                                attr.value ||
                                "";
                              return value && !isUuidLike(value) ? value : "";
                            })
                            .filter(Boolean)
                            .join(" - ")
                        : getVariantName(variant);

                    return (
                      <div key={variant.id} className="bg-gray-50 mb-4">
                        <Accordion
                          title={
                            <div className="flex justify-between w-full items-center">
                              <span className="font-semibold text-gray-900">
                                Variant: {variantLabel}
                              </span>
                              <span className="text-gray-400 text-sm">
                                #{originalIndex + 1}
                              </span>
                            </div>
                          }
                        >
                          <div className="bg-gray-50 border-gray-200 p-4">
                            {/* HEADER & DELETE ACTION */}
                            <div className="flex justify-between items-center mb-4">
                              <h4 className="text-md font-semibold text-gray-800">
                                {variantLabel}
                              </h4>

                              <button
                                type="button"
                                onClick={() => deleteVariant(variant.id)}
                                className="flex items-center space-x-1 text-red-600 hover:text-red-700 text-sm font-medium"
                              >
                                <X className="h-4 w-4" />
                                <span>Delete</span>
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                              {/* ----- VARIANT IMAGE UPLOAD ----- */}
                              <div className="md:col-span-2">
                                {!hideUpload && (
                                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                                    Upload Images
                                  </h4>
                                )}

                                <ImageManagement
                                  type="variant"
                                  images={variant.images || []}
                                  sensors={sensors}
                                  label={`Upload images`}
                                  hideUpload={hideUpload}
                                  onFilesDrop={(files) =>
                                    enqueueFilesForCrop(files, {
                                      variantIndex: originalIndex,
                                    })
                                  }
                                  onRemoveImage={(i) =>
                                    removeImage(originalIndex, i)
                                  }
                                  onSortChange={(newList) =>
                                    setVariants((prev) => {
                                      const copy = [...prev];
                                      copy[originalIndex].images =
                                        newList.map((img, idx) => ({
                                          ...img,
                                          sortOrder: idx + 1,
                                        }));
                                      return copy;
                                    })
                                  }
                                />
                              </div>

                              {/* ----- VARIANT FIELDS ----- */}
                              <div className="md:col-span-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <TextInputWithIcon
                                    label={t("PRODUCT_CREATION.QUANTITY")}
                                    name="Quantity"
                                    value={variant.Quantity}
                                    onChange={(e) =>
                                      handleVariantChange(
                                        originalIndex,
                                        "Quantity",
                                        e.target.value
                                      )
                                    }
                                    Icon={Hash}
                                  />

                                  <TextInputWithIcon
                                    label={t("PRODUCT_CREATION.MRP")}
                                    name="MRP"
                                    value={variant.MRP}
                                    onChange={(e) =>
                                      handleMRPChange(
                                        originalIndex,
                                        e.target.value
                                      )
                                    }
                                    Icon={() => (
                                      <span className="text-lg font-bold text-gray-400">
                                        ₹
                                      </span>
                                    )}
                                  />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                  <TextInputWithIcon
                                    label={t(
                                      "PRODUCT_CREATION.PRODUCT_DISCOUNT"
                                    )}
                                    name="ProductDiscount"
                                    value={variant.ProductDiscount}
                                    onChange={(e) =>
                                      handleVariantChange(
                                        originalIndex,
                                        "ProductDiscount",
                                        e.target.value
                                      )
                                    }
                                    Icon={Tag}
                                  />

                                  <TextInputWithIcon
                                    label={t(
                                      "PRODUCT_CREATION.SELLING_PRICE"
                                    )}
                                    name="SellingPrice"
                                    value={
                                      Math.round(
                                        Number(variant.SellingPrice)
                                      ) || ""
                                    }
                                    onChange={(e) =>
                                      handleSellingPriceChange(
                                        originalIndex,
                                        e.target.value
                                      )
                                    }
                                    Icon={() => (
                                      <span className="text-lg font-bold text-gray-400">
                                        ₹
                                      </span>
                                    )}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* ----- VARIANT SHIPPING SECTION ----- */}
                          <div className="mt-6">
                            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                              <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                                {SECTION_TITLES.SHIPPING_INFORMATION}
                              </h4>
                              
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div>
                                  <SelectWithIcon
                                    label="Package"
                                    id={`package-${originalIndex}`}
                                    name="package"
                                    value={variant.shippingData?.package || ""}
                                    onChange={(e) => {
                                      if (e.target.value === SELECT_VALUES.ADD_NEW) {
                                        // Handle Add New functionality
                                        setCurrentVariantIndex(originalIndex);
                                        setShowAddPackageModal(true);
                                        console.log("showAddPackageModal set to true");
                                        return;
                                      }
                                      handleVariantChange(originalIndex, "shippingData", {
                                        ...(variant.shippingData || {}),
                                        package: e.target.value,
                                      });
                                    }}
                                    onInputChange={(searchText) => {
                                      dispatch(fetchResource({ key: "packagingBoxes", params: { searchText } }));
                                    }}
                                    options={[
                                      { value: "add-new", label: "Add New", isSpecial: true, icon: PlusCircle },
                                      ...packagingBoxes.map((box) => ({
                                        value: box.PackagingBoxID,
                                        label: box.PackageName || box.Name || box.PackagingBoxID,
                                      })),
                                    ]}
                                    Icon={Package}
                                    placeholder="Select package"
                                    onEditOption={(packageOption) => {
                                      setEditingPackage({
                                        ...packageOption,
                                        PackagingBoxID: packageOption.PackagingBoxID || packageOption.value,
                                      });
                                      setCurrentVariantIndex(originalIndex);
                                      setShowEditPackageModal(true);
                                    }}
                                  />
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">Weight</label>
                                  <div className="flex gap-2">
                                    <div className="flex-1">
                                      <TextInputWithIcon
                                        id={`weight-${originalIndex}`}
                                        name="weight"
                                        value={variant.shippingData?.weight || ""}
                                        onChange={(e) => {
                                          handleVariantChange(originalIndex, "shippingData", {
                                            ...(variant.shippingData || {}),
                                            weight: e.target.value,
                                          });
                                        }}
                                        placeholder="0.0"
                                        type="number"
                                        step="0.1"
                                        Icon={Scale}
                                      />
                                    </div>
                                    <div className="w-24">
                                      <SelectWithIcon
                                        id={`weightUnit-${originalIndex}`}
                                        name="weightUnit"
                                        value={variant.shippingData?.weightUnit || ""}
                                        onChange={(e) => handleVariantChange(originalIndex, "shippingData", { ...(variant.shippingData || {}), weightUnit: e.target.value })}
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
                                
                                <div>
                                  <SelectWithIcon
                                    label="Country of origin"
                                    id={`country-${originalIndex}`}
                                    name="countryOfOrigin"
                                    value={variant.shippingData?.countryOfOrigin || ""}
                                    onChange={(e) => {
                                      handleVariantChange(originalIndex, "shippingData", {
                                        ...(variant.shippingData || {}),
                                        countryOfOrigin: e.target.value,
                                      });
                                    }}
                                    options={countries.map((c) => ({
                                      value: c.CountryCode || c.value,
                                      label: c.CountryName || c.label,
                                    }))}
                                    Icon={Globe}
                                    placeholder="Select country"
                                  />
                                </div>
                                
                                <div>
                                  <TextInputWithIcon
                                    label="HS Code"
                                    id={`hsCode-${originalIndex}`}
                                    name="hsCode"
                                    value={variant.shippingData?.hsCode || ""}
                                    onChange={(e) => {
                                      handleVariantChange(originalIndex, "shippingData", {
                                        ...(variant.shippingData || {}),
                                        hsCode: e.target.value,
                                      });
                                    }}
                                    placeholder="Enter HS code"
                                    Icon={Hash}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </Accordion>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500 px-2">
                    {t("PRODUCTS.NO_VARIANTS_IN_GROUP")}
                  </p>
                )}
              </Tab.Panel>
            );
          })}
        </Tab.Panels>
      </Tab.Group>

      {/* ---------------- PREVIEW MODAL ---------------- */}
      {previewVariant && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto relative shadow-2xl">
            <button
              className="absolute top-3 right-3 p-2 bg-gray-100 rounded-full hover:bg-gray-200"
              onClick={() => setPreviewVariant(null)}
            >
              <X className="h-5 w-5" />
            </button>

            <VariantPreviewSection
              oFormData={oFormData}
              brands={brands}
              aSpecifications={aSpecifications}
              specificationTypes={specificationTypes}
              aVariants={aVariants}
              attributeTypes={attributeTypes}
              attributes={attributes}
              groupingAttributeTypeID={groupingAttributeTypeID}
            />
          </div>
        </div>
      )}

      {/* ----- ADD PACKAGE MODAL ----- */}
      <AddPackageModal
        isOpen={showAddPackageModal}
        onClose={() => {
          setShowAddPackageModal(false);
          setCurrentVariantIndex(null);
        }}
        onAddPackage={(newPackage) => {
          // Refresh packaging boxes list from API
          dispatch(fetchResource({ key: "packagingBoxes" }));
          if (currentVariantIndex !== null && newPackage.PackagingBoxID) {
            handleVariantChange(currentVariantIndex, "shippingData", {
              ...(aVariants[currentVariantIndex].shippingData || {}),
              package: newPackage.PackagingBoxID,
            });
          }
          setShowAddPackageModal(false);
          setCurrentVariantIndex(null);
        }}
      />

      {/* ----- EDIT PACKAGE MODAL ----- */}
      <EditPackageModal
        isOpen={showEditPackageModal}
        onClose={() => {
          setShowEditPackageModal(false);
          setEditingPackage(null);
          setCurrentVariantIndex(null);
        }}
        packageData={editingPackage}
        onUpdatePackage={(updatedPackage) => {
          dispatch(fetchResource({ key: "packagingBoxes" }));
          if (currentVariantIndex !== null && updatedPackage.PackagingBoxID) {
            handleVariantChange(currentVariantIndex, "shippingData", {
              ...(aVariants[currentVariantIndex].shippingData || {}),
              package: updatedPackage.PackagingBoxID,
            });
          }
          setShowEditPackageModal(false);
          setEditingPackage(null);
          setCurrentVariantIndex(null);
        }}
      />
    </>
  );
}
