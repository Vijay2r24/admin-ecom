import { useState } from "react";
import { useTranslation } from "react-i18next";

export const SingleStoreInventoryTable = ({
  product,
  getVariantAttributes,
  handleStoreStatusToggle,
}) => {
  const { t } = useTranslation();
  const store = product.Variants[0].Inventory[0];

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editData, setEditData] = useState(null); // variant+inventory details

  const openInventoryEditModal = (variant, inv) => {
    setEditData({
      VariantID: variant.VariantID,
      Quantity: inv.Quantity,
      SellingPrice: inv.SellingPrice,
      DiscountPercentage: inv.DiscountPercentage,
      IsActive: inv.IsActive,
    });

    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditData(null);
  };

  const handleEditChange = (e) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    closeModal();
  };

  return (
    <>
      <div className="bg-white border rounded-lg shadow-sm">

        {/* Store Name Header */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">
            {t("INVENTORY.STORE_LABEL")}: {store.StoreName}
          </h3>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left">{t("INVENTORY.VARIANT")}</th>
                <th className="px-6 py-3 text-left">{t("INVENTORY.QTY")}</th>
                <th className="px-6 py-3 text-left">{t("INVENTORY.PRICE")}</th>
                <th className="px-6 py-3 text-left">{t("INVENTORY.DISCOUNT")}</th>
                <th className="px-6 py-3 text-center">{t("INVENTORY.ACTIVE")}</th>
                <th className="px-6 py-3 text-center">{t("INVENTORY.EDIT")}</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {product.Variants.map((variant) => {
                const attrs = getVariantAttributes(variant);
                const inv = variant.Inventory[0];

                return (
                  <tr key={variant.VariantID}>
                    <td className="px-6 py-3">
                      {variant.Attributes && variant.Attributes.length > 0
                        ? variant.Attributes.map((attr) => {
                            const displayValue = attr.Unit
                              ? `${attr.Value} (${attr.Unit})`
                              : attr.Value;
                            return displayValue;
                          }).join(" / ")
                        : t("INVENTORY.NO_ATTRIBUTES")}
                    </td>

                    <td className="px-6 py-3">{inv.Quantity}</td>

                    <td className="px-6 py-3">₹{inv.SellingPrice}</td>

                    <td className="px-6 py-3">{inv.DiscountPercentage}%</td>

                    <td className="px-6 py-3 text-center">
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={inv.IsActive}
                          onChange={(e) =>
                            handleStoreStatusToggle(
                              variant,
                              inv,
                              e.target.checked
                            )
                          }
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-gray-300 rounded-full peer-checked:bg-green-600 relative">
                          <span className="absolute left-1 top-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-5 transition-all"></span>
                        </div>
                      </label>
                    </td>

                    <td className="px-6 py-3 text-center">
                      <button
                        className="text-blue-600 hover:underline"
                        onClick={() => openInventoryEditModal(variant, inv)}
                      >
                        {t("INVENTORY.EDIT")}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>

          </table>
        </div>
      </div>

      {/* ---------------------- MODAL ---------------------- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96 space-y-4">
            <h2 className="text-lg font-semibold">{t("INVENTORY.EDIT_INVENTORY_TITLE")}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium">{t("INVENTORY.QUANTITY")}</label>
                <input
                  type="number"
                  name="Quantity"
                  value={editData.Quantity}
                  onChange={handleEditChange}
                  className="mt-1 w-full border rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">{t("INVENTORY.SELLING_PRICE")}</label>
                <input
                  type="number"
                  name="SellingPrice"
                  value={editData.SellingPrice}
                  onChange={handleEditChange}
                  className="mt-1 w-full border rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">{t("INVENTORY.DISCOUNT_PERCENT")}</label>
                <input
                  type="number"
                  name="DiscountPercentage"
                  value={editData.DiscountPercentage}
                  onChange={handleEditChange}
                  className="mt-1 w-full border rounded-md px-3 py-2"
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm font-medium">{t("INVENTORY.ACTIVE")}</label>
                <input
                  type="checkbox"
                  name="IsActive"
                  checked={editData.IsActive}
                  onChange={(e) =>
                    setEditData({ ...editData, IsActive: e.target.checked })
                  }
                  className="h-4 w-4"
                />
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                className="px-4 py-2 border rounded-md"
                onClick={closeModal}
              >
                {t("PRODUCT_CREATION.CANCEL")}
              </button>

              <button
                className="px-4 py-2 bg-custom-bg text-white rounded-md"
                onClick={handleSave}
              >
                {t("PRODUCT_CREATION.SAVE_CHANGES")}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
