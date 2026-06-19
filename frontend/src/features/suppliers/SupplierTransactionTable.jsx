function SupplierTransactionTable({ transactions }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr className="text-left">
            <th className="p-4">Date</th>
            <th className="p-4">Supplier</th>
            <th className="p-4">Product</th>
            <th className="p-4">Qty</th>
            <th className="p-4">Total Cost</th>
          </tr>
        </thead>
        <tbody>
          {transactions.length === 0 ? (
            <tr>
              <td colSpan={5} className="p-8 text-center text-sm text-gray-500">
                No supplier purchases recorded yet.
              </td>
            </tr>
          ) : (
            transactions.map((transaction) => (
              <tr key={transaction.id} className="border-t hover:bg-gray-50 transition">
                <td className="p-4">{transaction.date}</td>
                <td className="p-4 font-medium">{transaction.supplierName}</td>
                <td className="p-4">{transaction.productName}</td>
                <td className="p-4">{transaction.quantity}</td>
                <td className="p-4">{transaction.totalCost}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default SupplierTransactionTable;
