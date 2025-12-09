import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function VariantPreviewSection({
  oFormData,
  brands = [],
  aSpecifications = [],
  specificationTypes = [],
  aVariants = [],
  attributeTypes = [],
  attributes = [],
  groupingAttributeTypeID = "",
}) {
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [imageIndexMap, setImageIndexMap] = useState({});
  const [showDetails, setShowDetails] = useState(false); // <-- MAIN STATE (LIST / DETAILS)

  /* --------------------------------------------
    BUILD ATTRIBUTE VALUE LOOKUP MAP
  -------------------------------------------- */
  const attributesById = useMemo(() => {
    const map = new Map();
    attributes.forEach((a) => {
      map.set(String(a.AttributeValueID || a.attributeValueID), a);
    });
    return map;
  }, [attributes]);

  /* --------------------------------------------
    PART 1 — GROUP LOGIC
  -------------------------------------------- */
  const groupingTid = groupingAttributeTypeID
    ? String(groupingAttributeTypeID)
    : "";

  const groupedVariants = useMemo(() => {
    if (!groupingTid) return null;

    const map = new Map();
    aVariants.forEach((v, idx) => {
      const row = (v.attributes || []).find(
        (a) => String(a.AttributeTypeID) === groupingTid
      );
      const val = row?.AttributeValueIDs?.[0]
        ? String(row.AttributeValueIDs[0])
        : null;

      if (!val) return;

      if (!map.has(val)) {
        const d = attributesById.get(val);
        map.set(val, {
          valueId: val,
          label: d?.Value || val,
          unit: d?.Unit || null,
          representativeVariantIndex: idx,
          variants: [{ variant: v, index: idx }],
        });
      } else {
        map.get(val).variants.push({ variant: v, index: idx });
      }
    });

    return Array.from(map.values());
  }, [aVariants, groupingTid, attributesById]);

  const hasGroupList =
    groupingTid && groupedVariants && groupedVariants.length > 0;

  const ungroupedVariantList = (() => {
    if (hasGroupList) return [];
    return aVariants.map((v, i) => {
      const img =
        v.images?.[0]?.preview ||
        v.images?.[0]?.documentUrl ||
        "https://placehold.co/200x200?text=No+Image";

      return {
        ...v,
        index: i,
        thumb: img,
        label:
          v.attributes
            ?.map(
              (a) => attributesById.get(String(a.AttributeValueIDs?.[0]))?.Value
            )
            ?.join(" - ") || `Variant ${i + 1}`,
      };
    });
  })();

  const hasVariantTabs =
    (hasGroupList && groupedVariants.length > 0) ||
    (!hasGroupList && ungroupedVariantList.length > 1);

  /* --------------------------------------------
    INITIAL DEFAULT SELECTED VARIANT
  -------------------------------------------- */
  useEffect(() => {
  if (!aVariants.length) return;

  // FIX: If only 1 variant → directly show details
  if (!hasGroupList && aVariants.length === 1) {
    const only = aVariants[0];

    // Build attribute map
    const attMap = {};
    only.attributes.forEach((a) => {
      if (a.AttributeTypeID && a.AttributeValueIDs?.[0]) {
        attMap[String(a.AttributeTypeID)] = String(a.AttributeValueIDs[0]);
      }
    });

    setSelectedVariantIndex(0);
    setSelectedAttributes(attMap);
    setImageIndexMap({ [only.id]: 0 });
    setShowDetails(true); // <-- this is the FIX
  }
}, [aVariants, hasGroupList]);

  /* --------------------------------------------
    FIND MATCHING VARIANT
  -------------------------------------------- */
  const findMatchingVariantIndex = (selAttrs) => {
    for (let i = 0; i < aVariants.length; i++) {
      const v = aVariants[i];
      const vMap = {};

      (v.attributes || []).forEach((att) => {
        vMap[String(att.AttributeTypeID)] = String(att.AttributeValueIDs?.[0]);
      });

      let ok = true;
      for (const [tid, vid] of Object.entries(selAttrs)) {
        if (vMap[tid] !== vid) ok = false;
      }

      if (ok) return i;
    }
    return 0;
  };

  useEffect(() => {
    if (!aVariants.length) return;

    const idx = findMatchingVariantIndex(selectedAttributes);
    setSelectedVariantIndex(idx);
    setImageIndexMap((p) => ({ ...p, [aVariants[idx].id]: 0 }));
  }, [selectedAttributes, aVariants]);

  if (!aVariants.length) return null;

  /* --------------------------------------------
    SELECT VARIANT (Open details)
  -------------------------------------------- */
  const handleSelectVariant = (index) => {
    const v = aVariants[index];

    const attMap = {};
    v.attributes.forEach((a) => {
      if (a.AttributeTypeID && a.AttributeValueIDs?.[0]) {
        attMap[String(a.AttributeTypeID)] = String(a.AttributeValueIDs[0]);
      }
    });

    setSelectedVariantIndex(index);
    setSelectedAttributes(attMap);
    setImageIndexMap((p) => ({ ...p, [v.id]: 0 }));

    setShowDetails(true); // <-- Go to Details Page
  };

  /* --------------------------------------------
    SELECT ATTRIBUTE OPTION
  -------------------------------------------- */
  const handleSelect = (typeID, valueID) => {
    setSelectedAttributes((p) => ({ ...p, [typeID]: valueID }));
  };

  /* --------------------------------------------
    CURRENT SELECTED VARIANT
  -------------------------------------------- */
  const variant = aVariants[selectedVariantIndex];
  const images = variant.images || [];
  const curImg = imageIndexMap[variant.id] || 0;

  const mainImg =
    images[curImg]?.preview ||
    images[curImg]?.documentUrl ||
    "https://placehold.co/600x400?text=No+Image";

  const price = Number(variant.SellingPrice || 0);
  const mrp = Number(variant.MRP || 0);
  const discountPct =
    mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

  const attributeList = attributeTypes.map((t) => ({
    id: String(t.AttributeTypeID),
    name: t.Name,
  }));

  const isHex = (v) =>
    typeof v === "string" && /^#[0-9A-Fa-f]{6}$/.test(v);

  /* --------------------------------------------
    RENDER
  -------------------------------------------- */
  return (
    <div className="p-6 space-y-6">

      {/* ==========================================================
          LIST PAGE (Shown when showDetails = false)
      ========================================================== */}
      {!showDetails && hasGroupList && (
  <div>
    <div className="p-3 bg-yellow-100 text-yellow-800 rounded mb-4 text-sm">
      To change variants, please modify the group-by option.
    </div>

    <h3 className="text-lg font-semibold mb-3">Variants List</h3>

          <div className="flex gap-3 overflow-x-auto">
            {groupedVariants.map((g) => {
              const rep = aVariants[g.representativeVariantIndex];
              const thumb =
                rep.images?.[0]?.preview ||
                rep.images?.[0]?.documentUrl ||
                "https://placehold.co/200?text=No+Image";

              return (
                <button
                  key={g.valueId}
                  onClick={() => handleSelectVariant(g.representativeVariantIndex)}
                  className="flex-shrink-0 w-40 p-3 border rounded-lg flex flex-col items-center gap-2 text-center hover:shadow bg-white"
                >
                  <img src={thumb} className="w-24 h-24 object-cover rounded" />
                  <div className="font-medium text-sm">{g.label}</div>
                  <span className="text-xs text-gray-500">
                    {g.variants.length} option
                    {g.variants.length > 1 ? "s" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* DEFAULT MODE */}
      {!hasGroupList && ungroupedVariantList.length > 1 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Variants</h3>

          <div className="flex gap-3 overflow-x-auto">
            {ungroupedVariantList.map((v, i) => {
              const active = selectedVariantIndex === i && showDetails;

              return (
                <button
                  key={i}
                  onClick={() => handleSelectVariant(i)}
                  className={`flex-shrink-0 w-40 p-3 border rounded-lg flex flex-col items-center gap-2 transition ${
                    active
                      ? "ring-2 ring-black bg-gray-50"
                      : "bg-white hover:shadow"
                  }`}
                >
                  <img src={v.thumb} className="w-24 h-24 rounded object-cover" />
                  <div className="font-medium text-sm">{v.label}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}
      {!showDetails && !hasGroupList && ungroupedVariantList.length > 1 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Variants</h3>

          <div className="flex gap-3 overflow-x-auto">
            {ungroupedVariantList.map((v, i) => (
              <button
                key={i}
                onClick={() => handleSelectVariant(i)}
                className="flex-shrink-0 w-40 p-3 border rounded-lg flex flex-col items-center gap-2 text-center hover:shadow bg-white"
              >
                <img src={v.thumb} className="w-24 h-24 object-cover rounded" />
                <div className="font-medium text-sm">{v.label}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ==========================================================
          DETAILS PAGE (Shown when showDetails = true)
      ========================================================== */}
      {showDetails && (
        <>
          {/* BACK BUTTON */}
          <button
            onClick={() => setShowDetails(false)}
            className="mb-4 flex items-center gap-2 text-gray-700 hover:underline"
          >
            <ChevronLeft size={18} />
            Back to Variants
          </button>

          <div className="lg:flex gap-10">
            {/* IMAGES */}
            <div className="lg:w-1/2">
              <div className="relative border rounded-lg bg-white">
                <img
                  src={mainImg}
                  className="w-full h-[300px] object-contain"
                />

                {images.length > 1 && (
                  <>
                    <button
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-white rounded-full shadow p-2"
                      onClick={() =>
                        setImageIndexMap((p) => ({
                          ...p,
                          [variant.id]:
                            curImg > 0 ? curImg - 1 : images.length - 1,
                        }))
                      }
                    >
                      <ChevronLeft size={22} />
                    </button>

                    <button
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-white rounded-full shadow p-2"
                      onClick={() =>
                        setImageIndexMap((p) => ({
                          ...p,
                          [variant.id]:
                            curImg < images.length - 1 ? curImg + 1 : 0,
                        }))
                      }
                    >
                      <ChevronRight size={22} />
                    </button>
                  </>
                )}
              </div>

              {images.length > 0 && (
                <div className="flex gap-2 mt-3 overflow-x-auto">
                  {images.map((img, i) => (
                    <img
                      key={i}
                      src={img.preview || img.documentUrl}
                      onClick={() =>
                        setImageIndexMap((p) => ({ ...p, [variant.id]: i }))
                      }
                      className={`w-20 h-20 rounded object-cover cursor-pointer ${
                        curImg === i ? "border-2 border-black" : "border"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* PRODUCT INFO */}
            <div className="lg:w-1/2 space-y-6">
              <div>
                <h1 className="text-2xl font-bold">{oFormData.ProductName}</h1>
                <p className="text-gray-600">
                  {
                    brands.find(
                      (b) =>
                        String(b.BrandID) === String(oFormData.BrandID)
                    )?.BrandName
                  }
                </p>
              </div>

              {/* PRICE */}
              <div className="flex items-center gap-4">
                <p className="text-2xl font-semibold text-green-600">
                  ₹{price}
                </p>

                {mrp > price && (
                  <>
                    <p className="line-through text-gray-500">₹{mrp}</p>
                    <span className="px-2 py-1 bg-red-500 text-white rounded text-xs">
                      {discountPct}% OFF
                    </span>
                  </>
                )}
              </div>

              {/* ATTRIBUTES */}
              {attributeList.map((t) => {
                const tid = t.id;

                const values = [];

                aVariants.forEach((v) => {
                  const att = v.attributes?.find(
                    (a) => String(a.AttributeTypeID) === tid
                  );

                  if (att?.AttributeValueIDs?.[0]) {
                    const val = String(att.AttributeValueIDs[0]);
                    const data = attributesById.get(val);

                    if (data && !values.some((x) => x.id === val)) {
                      values.push({
                        id: val,
                        label: data.Value,
                        unit: data.Unit,
                      });
                    }
                  }
                });

                if (!values.length) return null;

                return (
                  <div key={tid}>
                    <div className="text-sm mb-2 font-medium">{t.name}</div>

                    <div className="flex flex-wrap gap-3">
                      {values.map((v) => {
                        const selected = selectedAttributes[tid] === v.id;
                        const isColor = isHex(v.unit);

                        return (
                          <button
                            key={v.id}
                            className={`px-3 py-2 border rounded-lg flex items-center gap-2 ${
                              selected
                                ? "bg-custom-bg text-white border-black"
                                : "bg-white text-gray-700 border-gray-300"
                            }`}
                            onClick={() => handleSelect(tid, v.id)}
                          >
                            {isColor && (
                              <span
                                className="w-5 h-5 rounded border"
                                style={{ backgroundColor: v.unit }}
                              ></span>
                            )}
                            {v.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <p className="font-medium">Quantity: {variant.Quantity}</p>
            </div>
          </div>

          {/* DESCRIPTION */}
          <section>
            <h3 className="font-semibold text-lg mb-1">Description</h3>
            <div
              className="prose"
              dangerouslySetInnerHTML={{
                __html: oFormData.ProductDescription,
              }}
            ></div>
          </section>

          {/* SPECIFICATIONS */}
          {aSpecifications.length > 0 && (
            <section>
              <h3 className="font-semibold text-lg mb-2">Specifications</h3>
              <table className="w-full border">
                <tbody>
                  {aSpecifications.map((spec, i) => {
                    const label =
                      specificationTypes.find(
                        (s) =>
                          String(s.SpecificationTypeID) ===
                          String(spec.SpecificationTypeID)
                      )?.Name || "—";
                    return (
                      <tr key={i} className="border-b">
                        <td className="p-2 font-medium">{label}</td>
                        <td className="p-2">{spec.Value}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}
    </div>
  );
}
