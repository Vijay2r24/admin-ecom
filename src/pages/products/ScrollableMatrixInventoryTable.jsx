// 3 Scrollable Matrix Inventory Table for 7+ Stores
export const ScrollableMatrixInventoryTable = ({
  allStores,
  product,
  getVariantAttributes,
  handleStoreStatusToggle,
  openInventoryEditModal,
}) => {
  return (
    <div className="overflow-x-auto bg-white border rounded-lg shadow">
      <table className="min-w-max divide-y divide-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-3 sticky left-0 bg-gray-100 z-10 text-left font-medium text-gray-700">
              Variant
            </th>

            {allStores.map((store) => (
              <th
                key={store.StoreID}
                className="px-4 py-3 text-center font-medium text-gray-700"
              >
                {store.StoreName}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {product.Variants.map((variant) => {
            const attrs = getVariantAttributes(variant);

            return (
              <tr key={variant.VariantID}>
                <td className="px-4 py-4 sticky left-0 bg-white z-10 text-sm text-gray-900 font-medium">
                  {attrs.Size?.value || "N/A"} / {attrs.Color?.value || "N/A"}
                </td>

                {allStores.map((store) => {
                  const inv = variant.Inventory.find(
                    (s) => s.StoreID === store.StoreID
                  );

                  return (
                    <td
                      key={store.StoreID}
                      className="px-4 py-4 text-center text-sm text-gray-800"
                    >
                      {inv ? (
                        <>
                          <div>Qty: {inv.Quantity}</div>
                          <div>Price: ₹{inv.SellingPrice}</div>
                          <div>Discount: {inv.DiscountPercentage}%</div>

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
                            className="mt-1"
                          />

                          <button
                            className="block text-blue-600 text-xs mt-1 hover:underline"
                            onClick={() => openInventoryEditModal(variant, inv)}
                          >
                            Edit
                          </button>
                        </>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
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
