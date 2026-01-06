// VariantTabs.jsx  (Fully Patched)
import React, { useState } from "react";
import { Tab } from "@headlessui/react";
import { Hash, Tag, X } from "lucide-react";
import Accordion from "../../components/products/Accordion.jsx";
import ImageManagement from "./ImagesManager.jsx";
import VariantPreviewSection from "../../pages/products/VariantPreviewCard";

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
}) {
  const [previewVariant, setPreviewVariant] = useState(null);
  const [mrpEditedMap, setMrpEditedMap] = useState({});

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
              const valObj = attributes.find(
                (a) => String(a.AttributeValueID) === String(valueId)
              );
              // fallback: use valueLabels provided in aAttributes for this grouping attribute
              const groupingAttr = aAttributes.find(
                (a) => String(a.AttributeTypeID) === String(groupingAttributeTypeID)
              );
              const fallbackLabel =
                groupingAttr?.valueLabels?.[
                (groupingAttr?.NewAttributeValueIDs || []).findIndex(
                  (id) => String(id) === String(valueId)
                )
                ];
              const options = localAttributeOptions?.[groupingAttributeTypeID] || [];
              const foundOption = options.find((o) => String(o.id) === String(valueId));

              const label = foundOption
                ? foundOption.label
                : valObj
                  ? `${valObj.Value}${valObj.Unit ? ` (${valObj.Unit})` : ""}`
                  : fallbackLabel || valueId;

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
            const valObj = attributes.find(
              (a) => String(a.AttributeValueID) === String(valueId)
            );

            // fallback: use valueLabels provided in aAttributes for this grouping attribute
            const groupingAttr = aAttributes.find(
              (a) => String(a.AttributeTypeID) === String(groupingAttributeTypeID)
            );
            const fallbackLabel =
              groupingAttr?.valueLabels?.[
              (groupingAttr?.NewAttributeValueIDs || []).findIndex(
                (id) => String(id) === String(valueId)
              )
              ];
            const groupLabel = valObj
              ? `${valObj.Value}${valObj.Unit ? ` (${valObj.Unit})` : ""}`
              : fallbackLabel || valueId;

            const groupVariants = aVariants.filter((variant) =>
              variant.attributes.some(
                (a) =>
                  String(a.AttributeTypeID) ===
                  String(groupingAttributeTypeID) &&
                  a.AttributeValueIDs?.includes(String(valueId))
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

                    return (
                      <div key={variant.id} className="bg-gray-50 mb-4">
                        <Accordion
                          title={
                            <div className="flex justify-between w-full items-center">
                              <span className="font-semibold text-gray-900">
                                Variant: {getVariantName(variant)}
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
                                {getVariantName(variant)}
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
    </>
  );
}
