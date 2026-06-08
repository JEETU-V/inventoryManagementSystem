import { Upload, ChevronDown } from "lucide-react";

function SupplierTable({ suppliers, metrics, onUploadClick, onManageUploads }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr className="text-left">
            <th className="p-4">Supplier</th>
            <th className="p-4">Contact</th>
            <th className="p-4">Email</th>
            <th className="p-4">Products</th>
            <th className="p-4">Purchase</th>
            <th className="p-4 text-center">Actions</th>
          </tr>
        </thead>

        <tbody>
          {suppliers.map((supplier) => {
            const metric = metrics[supplier.id] || { purchase: 0 };

            return (
              <tr key={supplier.id} className="border-t hover:bg-gray-50 transition">
                <td className="p-4 font-medium">{supplier.name}</td>
                <td className="p-4">{supplier.contact}</td>
                <td className="p-4">{supplier.email}</td>
                <td className="p-4">{supplier.productsSupplied}</td>
                <td className="p-4">₹{metric.purchase.toLocaleString("en-IN")}</td>
                <td className="p-4 flex justify-center gap-2">
                  <button
                    onClick={() => onUploadClick(supplier.id)}
                    className="flex items-center gap-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded transition"
                    title="Upload Supplier PDF"
                  >
                    <Upload size={16} />
                    Upload PDF
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default SupplierTable;
