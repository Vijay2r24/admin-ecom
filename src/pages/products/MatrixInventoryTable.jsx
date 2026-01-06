import { useTranslation } from "react-i18next";
// 2 Matrix Table for 2–6 Stores
export const MatrixInventoryTable = ({
  allStores,
  product,
  getVariantAttributes,
  handleStoreStatusToggle,
  openInventoryEditModal,
}) => {
  const { t } = useTranslation();
  return (
    <div className="overflow-x-auto bg-white border rounded-lg shadow-sm">
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-600">
              {t("INVENTORY.VARIANT")}
            </th>

            {allStores.map((store) => (
              <th
                key={store.StoreID}
                className="px-4 py-3 text-center font-medium text-gray-600"
              >
                {store.StoreName}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-200">
          {product.Variants.map((variant) => {
            const attrs = getVariantAttributes(variant);

            return (
              <tr key={variant.VariantID}>
                <td className="px-4 py-4 text-gray-900 text-sm">
                  {attrs.Size?.value || t("INVENTORY.NA")} / {attrs.Color?.value || t("INVENTORY.NA")}
                </td>

                {allStores.map((store) => {
                  const inv = variant.Inventory.find(
                    (s) => s.StoreID === store.StoreID
                  );

                  if (!inv)
                    return (
                      <td
                        key={store.StoreID}
                        className="px-4 py-4 text-center text-gray-400"
                      >
                        —
                      </td>
                    );

                  return (
                    <td
                      key={store.StoreID}
                      className="px-4 py-4 text-sm text-gray-800 text-center"
                    >
                      <div>{t("INVENTORY.QTY")}: {inv.Quantity}</div>
                      <div>{t("INVENTORY.PRICE")}: ₹{inv.SellingPrice}</div>
                      <div>{t("INVENTORY.DISCOUNT")}: {inv.DiscountPercentage}%</div>

                      <div className="mt-1">
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
                        />
                      </div>

                      <button
                        className="text-blue-600 text-xs mt-1 hover:underline"
                        onClick={() => openInventoryEditModal(variant, inv)}
                      >
                        {t("INVENTORY.EDIT")}
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
