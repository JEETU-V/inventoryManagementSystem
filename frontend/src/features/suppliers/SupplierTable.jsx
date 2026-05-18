function SupplierTable({ suppliers, metrics }) {
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
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default SupplierTable;
