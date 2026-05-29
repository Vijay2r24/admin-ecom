import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { X, Package, Plus, Tag, Ruler, Scale } from "lucide-react";
import { useTranslation } from "react-i18next";
import { apiPost, apiGet } from "../../utils/ApiUtils";
import {
  CREATE_PACKAGING_BOX,
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

const AddPackageModal = ({ isOpen, onClose, onAddPackage }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(INITIAL);
  const [saving, setSaving] = useState(false);
  const [packageTypes, setPackageTypes] = useState([]);
  const [weightUnits, setWeightUnits] = useState([]);
  const [dimensionUnits, setDimensionUnits] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = "";
      setForm(INITIAL);
      return;
    }

    document.body.style.overflow = "hidden";
    setTimeout(() => modalRef.current?.focus(), 50);

    const fetchMeta = async () => {
      setLoadingMeta(true);
      try {
        const token = localStorage.getItem("token");
        const [typesRes, weightRes, dimRes] = await Promise.all([
          apiGet(GET_PACKAGING_BOX_TYPES, {}, token),
          apiGet(GET_WEIGHT_UNITS, {}, token),
          apiGet(GET_DIMENSION_UNITS, {}, token),
        ]);

        const types = toOptions(typesRes?.data?.data || []);
        const weights = toOptions(weightRes?.data?.data || []);
        const dims = toOptions(dimRes?.data?.data || []);

        setPackageTypes(types);
        setWeightUnits(weights);
        setDimensionUnits(dims);

        setForm((prev) => ({
          ...prev,
          PackageType: prev.PackageType || types[0]?.value || "",
          WeightUnit: prev.WeightUnit || weights[0]?.value || "",
          Unit: prev.Unit || dims[0]?.value || "",
        }));
      } catch {
        showEmsg(t("ADD_PACKAGE.FAILED_TO_LOAD_OPTIONS"), STATUS.ERROR);
      } finally {
        setLoadingMeta(false);
      }
    };

    fetchMeta();
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const toOptions = (arr) =>
    arr.map((item) => {
      if (typeof item === "string") return { label: item, value: item };
      const val = item.PackageType || item.Unit || item.value || item.Code || item.Name || "";
      const lbl = item.label || item.Name || item.PackageType || item.Unit || val;
      return { label: lbl, value: val };
    });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async () => {
    if (!form.PackageName.trim()) {
      showEmsg(t("ADD_PACKAGE.PACKAGE_NAME_REQUIRED"), STATUS.ERROR);
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
      const res = await apiPost(CREATE_PACKAGING_BOX, payload, token);
      if (res?.data?.status?.toUpperCase() === STATUS.SUCCESS.toUpperCase()) {
        const created = res.data.data;
        showEmsg(res.data.message || t("ADD_PACKAGE.PACKAGE_CREATED"), STATUS.SUCCESS);
        onAddPackage({
          PackagingBoxID: created?.PackagingBoxID,
          PackageName: payload.PackageName,
          PackageType: payload.PackageType,
          value: created?.PackagingBoxID,
          label: payload.PackageName,
        });
        onClose();
      } else {
        showEmsg(res?.data?.message || t("ADD_PACKAGE.FAILED_TO_CREATE"), STATUS.ERROR);
      }
    } catch (err) {
      showEmsg(err?.response?.data?.message || t("ADD_PACKAGE.FAILED_TO_CREATE"), STATUS.ERROR);
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
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg outline-none"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 id="modal-title" className="text-xl font-semibold text-gray-900 flex items-center">
            <Package className="h-6 w-6 mr-3 text-custom-bg" />
            {t("ADD_PACKAGE.TITLE")}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Package Name */}
          <TextInputWithIcon
            label={t("ADD_PACKAGE.PACKAGE_NAME_LABEL")}
            name="PackageName"
            id="PackageName"
            value={form.PackageName}
            onChange={handleChange}
            placeholder={t("ADD_PACKAGE.PACKAGE_NAME_PLACEHOLDER")}
            Icon={Tag}
            required
          />

          {/* Package Type */}
          <SelectWithIcon
            label={t("ADD_PACKAGE.PACKAGE_TYPE_LABEL")}
            name="PackageType"
            id="PackageType"
            value={form.PackageType}
            onChange={handleChange}
            options={packageTypes}
            Icon={Package}
            placeholder={t("ADD_PACKAGE.PACKAGE_TYPE_PLACEHOLDER")}
            loading={loadingMeta}
          />

          {/* Dimensions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("ADD_PACKAGE.DIMENSIONS_LABEL")}
            </label>
            <div className="grid grid-cols-4 gap-2">
              <TextInputWithIcon
                name="Length"
                id="Length"
                value={form.Length}
                onChange={handleChange}
                placeholder={t("ADD_PACKAGE.LENGTH_PLACEHOLDER")}
                type="number"
                Icon={Ruler}
              />
              <TextInputWithIcon
                name="Width"
                id="Width"
                value={form.Width}
                onChange={handleChange}
                placeholder={t("ADD_PACKAGE.WIDTH_PLACEHOLDER")}
                type="number"
                Icon={Ruler}
              />
              <TextInputWithIcon
                name="Height"
                id="Height"
                value={form.Height}
                onChange={handleChange}
                placeholder={t("ADD_PACKAGE.HEIGHT_PLACEHOLDER")}
                type="number"
                Icon={Ruler}
              />
              <SelectWithIcon
                name="Unit"
                id="Unit"
                value={form.Unit}
                onChange={handleChange}
                options={dimensionUnits}
                Icon={Ruler}
                placeholder={t("ADD_PACKAGE.UNIT_PLACEHOLDER")}
                loading={loadingMeta}
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
                  id="EmptyWeight"
                  value={form.EmptyWeight}
                  onChange={handleChange}
                  placeholder="0"
                  type="number"
                  Icon={Scale}
                />
              </div>
              <SelectWithIcon
                name="WeightUnit"
                id="WeightUnit"
                value={form.WeightUnit}
                onChange={handleChange}
                options={weightUnits}
                Icon={Scale}
                placeholder={t("ADD_PACKAGE.UNIT_PLACEHOLDER")}
                loading={loadingMeta}
              />
            </div>
          </div>

          {/* Default */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="IsDefaultPackage"
              id="IsDefaultPackage"
              checked={form.IsDefaultPackage}
              onChange={handleChange}
              className="w-4 h-4 text-custom-bg border-gray-300 rounded focus:ring-custom-bg"
            />
            <label htmlFor="IsDefaultPackage" className="text-sm font-medium text-gray-700">
              {t("ADD_PACKAGE.DEFAULT_PACKAGE_LABEL")}
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors text-sm">
            {t("ADD_PACKAGE.CANCEL")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || loadingMeta}
            className="px-4 py-2 bg-custom-bg text-white rounded-lg hover:bg-opacity-90 transition-colors flex items-center text-sm disabled:opacity-60"
          >
            <Plus className="h-4 w-4 mr-2" />
            {saving ? t("ADD_PACKAGE.SAVING") : t("ADD_PACKAGE.TITLE")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AddPackageModal;
