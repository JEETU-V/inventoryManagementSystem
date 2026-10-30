import { Pencil, Trash2 } from "lucide-react";
import EmptyState from "../../components/ui/EmptyState";

function ProductTable({ products, onDelete, onEdit, canEdit = true, canDelete = true }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="p-4">Product Name</th>
              <th className="p-4">SKU</th>
              <th className="p-4">Category</th>
              <th className="p-4">Quantity</th>
              <th className="p-4">Price</th>
              <th className="p-4">Status</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>

          <tbody>
            {products.length === 0 ? (
              <EmptyState
                title="No products found"
                description="Add a product or adjust your search and filters."
              />
            ) : (
              products.map((product) => {
                const outOfStock = product.quantity === 0;
                const inStock = product.quantity > product.reorderLevel;
                const stockStatus = outOfStock ? "Out of Stock" : inStock ? "In Stock" : "Low Stock";

                return (
                  <tr key={product.id} className="border-t transition hover:bg-gray-50">
                    <td className="p-4 font-medium">{product.name}</td>
                    <td className="p-4">{product.sku}</td>
                    <td className="p-4">{product.category || "Uncategorized"}</td>
                    <td className="p-4">{product.quantity}</td>
                    <td className="p-4">{product.price}</td>
                    <td className="p-4">
                      <span
                        className={`rounded-full px-3 py-1 text-sm ${
                          outOfStock
                            ? "bg-red-100 text-red-700"
                            : inStock
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {stockStatus}
                      </span>
                    </td>
                    <td className="p-4">
                      {canEdit || canDelete ? (
                        <div className="flex gap-3">
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => onEdit?.(product)}
                              className="text-blue-600 hover:text-blue-800"
                              aria-label={`Edit ${product.name}`}
                              title="Edit product"
                            >
                              <Pencil size={18} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => onDelete?.(product.id)}
                              className="text-red-600 hover:text-red-800"
                              aria-label={`Delete ${product.name}`}
                              title="Delete product"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-500">Read-only</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ProductTable;
