import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { X, Edit, Tag, Ruler, Scale, Package } from "lucide-react";
import { useTranslation } from "react-i18next";
import { apiGet, apiPut } from "../../utils/ApiUtils";
import {
  GET_PACKAGING_BOX_BY_ID,
  UPDATE_PACKAGING_BOX,
  GET_PACKAGING_BOX_TYPES,
  GET_WEIGHT_UNITS,
  GET_DIMENSION_UNITS,
} from "../../contants/apiRoutes";
import { STATUS } from "../../contants/constants";
import { showEmsg } from "../../utils/ShowEmsg";
import TextInputWithIcon from "../TextInputWithIcon";
import SelectWithIcon from "../SelectWithIcon";

const INITIAL = {
  PackageName: "",
  PackageType: "",
  Length: "",
  Width: "",
  Height: "",
  Unit: "",
  EmptyWeight: "",
  WeightUnit: "",
  IsDefaultPackage: false,
};

const EditPackageModal = ({ isOpen, onClose, onUpdatePackage, packageData }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(INITIAL);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [packageTypes, setPackageTypes] = useState([]);
  const [weightUnits, setWeightUnits] = useState([]);
  const [dimensionUnits, setDimensionUnits] = useState([]);
  const modalRef = useRef(null);

  const toOptions = (arr) =>
    arr.map((item) => {
      if (typeof item === "string") return { label: item, value: item };
      const val = item.PackageType || item.Unit || item.value || item.Code || item.Name || "";
      const lbl = item.label || item.Name || item.PackageType || item.Unit || val;
      return { label: lbl, value: val };
    });

  useEffect(() => {
    if (!isOpen || !packageData?.PackagingBoxID) {
      if (!isOpen) {
        setForm(INITIAL);
        document.body.style.overflow = "";
      }
      return;
    }

    document.body.style.overflow = "hidden";
    setTimeout(() => modalRef.current?.focus(), 50);

    const fetchAll = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const [boxRes, typesRes, weightRes, dimRes] = await Promise.all([
          apiGet(`${GET_PACKAGING_BOX_BY_ID}/${packageData.PackagingBoxID}`, {}, token),
          apiGet(GET_PACKAGING_BOX_TYPES, {}, token),
          apiGet(GET_WEIGHT_UNITS, {}, token),
          apiGet(GET_DIMENSION_UNITS, {}, token),
        ]);

        setPackageTypes(toOptions(typesRes?.data?.data || []));
        setWeightUnits(toOptions(weightRes?.data?.data || []));
        setDimensionUnits(toOptions(dimRes?.data?.data || []));

        if (boxRes?.data?.status?.toUpperCase() === STATUS.SUCCESS.toUpperCase()) {
          const d = boxRes.data.data;
          setForm({
            PackageName: d.PackageName || "",
            PackageType: d.PackageType || "",
            Length: d.Length ?? "",
            Width: d.Width ?? "",
            Height: d.Height ?? "",
            Unit: d.Unit || "",
            EmptyWeight: d.EmptyWeight ?? "",
            WeightUnit: d.WeightUnit || "",
            IsDefaultPackage: d.IsDefaultPackage || false,
          });
        } else {
          showEmsg(boxRes?.data?.message || t("EDIT_PACKAGE.FAILED_TO_LOAD"), STATUS.ERROR);
        }
      } catch {
        showEmsg(t("EDIT_PACKAGE.FAILED_TO_LOAD_DETAILS"), STATUS.ERROR);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
    return () => { document.body.style.overflow = ""; };
  }, [isOpen, packageData?.PackagingBoxID]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async () => {
    if (!form.PackageName.trim()) {
      showEmsg(t("EDIT_PACKAGE.PACKAGE_NAME_REQUIRED"), STATUS.ERROR);
      return;
    }
    const payload = {
      PackageName: form.PackageName.trim(),
      PackageType: form.PackageType,
      Length: Number(form.Length) || 0,
      Width: Number(form.Width) || 0,
      Height: Number(form.Height) || 0,
      Unit: form.Unit,
      EmptyWeight: Number(form.EmptyWeight) || 0,
      WeightUnit: form.WeightUnit,
      IsDefaultPackage: form.IsDefaultPackage,
    };

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await apiPut(`${UPDATE_PACKAGING_BOX}/${packageData.PackagingBoxID}`, payload, token);
      if (res?.data?.status?.toUpperCase() === STATUS.SUCCESS.toUpperCase()) {
        showEmsg(res.data.message || t("EDIT_PACKAGE.PACKAGE_UPDATED"), STATUS.SUCCESS);
        onUpdatePackage({
          ...packageData,
          ...payload,
          PackagingBoxID: packageData.PackagingBoxID,
          value: packageData.PackagingBoxID,
          label: payload.PackageName,
        });
        onClose();
      } else {
        showEmsg(res?.data?.message || t("EDIT_PACKAGE.FAILED_TO_UPDATE"), STATUS.ERROR);
      }
    } catch (err) {
      showEmsg(err?.response?.data?.message || t("EDIT_PACKAGE.FAILED_TO_UPDATE"), STATUS.ERROR);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg outline-none"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Edit className="h-6 w-6 mr-3 text-custom-bg" />
            {t("EDIT_PACKAGE.TITLE")}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-500 text-sm">{t("EDIT_PACKAGE.LOADING")}</div>
          ) : (
            <>
              {/* Package Name */}
              <TextInputWithIcon
                label={t("ADD_PACKAGE.PACKAGE_NAME_LABEL")}
                name="PackageName"
                id="PackageName_edit"
                value={form.PackageName}
                onChange={handleChange}
                placeholder={t("ADD_PACKAGE.PACKAGE_NAME_PLACEHOLDER")}
                Icon={Tag}
              />

              {/* Package Type */}
              <SelectWithIcon
                label={t("ADD_PACKAGE.PACKAGE_TYPE_LABEL")}
                name="PackageType"
                id="PackageType_edit"
                value={form.PackageType}
                onChange={handleChange}
                options={packageTypes}
                Icon={Package}
                placeholder={t("ADD_PACKAGE.PACKAGE_TYPE_PLACEHOLDER")}
              />

              {/* Dimensions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("ADD_PACKAGE.DIMENSIONS_LABEL")}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  <TextInputWithIcon
                    name="Length"
                    id="Length_edit"
                    value={form.Length}
                    onChange={handleChange}
                    placeholder={t("ADD_PACKAGE.LENGTH_PLACEHOLDER")}
                    type="number"
                    Icon={Ruler}
                  />
                  <TextInputWithIcon
                    name="Width"
                    id="Width_edit"
                    value={form.Width}
                    onChange={handleChange}
                    placeholder={t("ADD_PACKAGE.WIDTH_PLACEHOLDER")}
                    type="number"
                    Icon={Ruler}
                  />
                  <TextInputWithIcon
                    name="Height"
                    id="Height_edit"
                    value={form.Height}
                    onChange={handleChange}
                    placeholder={t("ADD_PACKAGE.HEIGHT_PLACEHOLDER")}
                    type="number"
                    Icon={Ruler}
                  />
                  <SelectWithIcon
                    name="Unit"
                    id="Unit_edit"
                    value={form.Unit}
                    onChange={handleChange}
                    options={dimensionUnits}
                    Icon={Ruler}
                    placeholder={t("ADD_PACKAGE.UNIT_PLACEHOLDER")}
                  />
                </div>
              </div>

              {/* Empty Weight */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t("ADD_PACKAGE.EMPTY_WEIGHT_LABEL")}</label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <TextInputWithIcon
                      name="EmptyWeight"
                      id="EmptyWeight_edit"
                      value={form.EmptyWeight}
                      onChange={handleChange}
                      placeholder="0"
                      type="number"
                      Icon={Scale}
                    />
                  </div>
                  <SelectWithIcon
                    name="WeightUnit"
                    id="WeightUnit_edit"
                    value={form.WeightUnit}
                    onChange={handleChange}
                    options={weightUnits}
                    Icon={Scale}
                    placeholder={t("ADD_PACKAGE.UNIT_PLACEHOLDER")}
                  />
                </div>
              </div>

              {/* Default */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="IsDefaultPackage"
                  id="IsDefaultPackage_edit"
                  checked={form.IsDefaultPackage}
                  onChange={handleChange}
                  className="w-4 h-4 text-custom-bg border-gray-300 rounded focus:ring-custom-bg"
                />
                <label htmlFor="IsDefaultPackage_edit" className="text-sm font-medium text-gray-700">
                  {t("ADD_PACKAGE.DEFAULT_PACKAGE_LABEL")}
                </label>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors text-sm">
            {t("EDIT_PACKAGE.CANCEL")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || loading}
            className="px-4 py-2 bg-custom-bg text-white rounded-lg hover:bg-opacity-90 transition-colors flex items-center text-sm disabled:opacity-60"
          >
            <Edit className="h-4 w-4 mr-2" />
            {saving ? t("EDIT_PACKAGE.SAVING") : t("EDIT_PACKAGE.UPDATE_BUTTON")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default EditPackageModal;
