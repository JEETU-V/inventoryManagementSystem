import { useState } from "react";
import { Search, Plus, X } from "lucide-react";
import { useAppData } from "../contexts/AppContext";
import SupplierTable from "../features/suppliers/SupplierTable";
import AddSupplierModal from "../features/suppliers/AddSupplierModal";
import AddSupplierTransactionModal from "../features/suppliers/AddSupplierTransactionModal";
import SupplierPdfUpload from "../features/suppliers/SupplierPdfUpload";
import SupplierTransactionTable from "../features/suppliers/SupplierTransactionTable";

function Suppliers() {
  const {
    canManageSuppliers,
    suppliers,
    products,
    supplierTransactions,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    addSupplierTransaction,
  } = useAppData();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  const filteredSuppliers = suppliers.filter((supplier) =>
    [supplier.name, supplier.contact, supplier.email, supplier.productsSupplied]
      .join(" ")
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  function parseAmount(value) {
    return Number(String(value).replace(/[^0-9.-]/g, "")) || 0;
  }

  const supplierMetrics = suppliers.reduce((acc, supplier) => {
    acc[supplier.id] = { purchase: 0 };
    return acc;
  }, {});

  supplierTransactions.forEach((transaction) => {
    const metric = supplierMetrics[transaction.supplierId];
    if (metric) {
      metric.purchase += parseAmount(transaction.totalCost);
    }
  });

  const totalPurchase = Object.values(supplierMetrics).reduce(
    (sum, metric) => sum + metric.purchase,
    0
  );

  const handleUploadClick = (supplierId) => {
    setSelectedSupplierId(supplierId);
    setIsPdfModalOpen(true);
  };

  function handleEdit(supplier) {
    setSelectedSupplier(supplier);
    setIsModalOpen(true);
  }

  async function handleDelete(supplierId) {
    if (!window.confirm("Delete this supplier? This cannot be undone.")) return;
    await deleteSupplier(supplierId);
  }

  async function handleSaveSupplier(supplier) {
    if (selectedSupplier) {
      await updateSupplier(supplier.id, supplier);
    } else {
      await addSupplier(supplier);
    }
    setSelectedSupplier(null);
  }

  function handleModalClose() {
    setSelectedSupplier(null);
    setIsModalOpen(false);
  }

  const handleUploadSuccess = () => {
    setTimeout(() => setIsPdfModalOpen(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Suppliers</h1>
          <p className="text-gray-500 mt-1">Manage supplier purchases and purchase history.</p>
        </div>

        <div className="flex flex-wrap gap-3">
          {canManageSuppliers ? (
            <>
              <button
                onClick={() => setIsTransactionModalOpen(true)}
                className="flex items-center gap-2 bg-purple-600 text-white px-5 py-3 rounded-lg hover:bg-purple-700 transition"
              >
                <Plus size={18} /> Record Purchase
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-lg hover:bg-indigo-700 transition"
              >
                <Plus size={18} /> Add Supplier
              </button>
            </>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              Manager-only supplier controls
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-sm font-medium text-gray-500">Total Purchase</h2>
          <p className="text-3xl font-bold text-gray-800 mt-3">
            ₹{totalPurchase.toLocaleString("en-IN")}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Supplier purchase cost recorded from supplier entries.
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border">
        <div className="flex items-center bg-gray-100 px-4 py-3 rounded-lg">
          <Search size={18} className="text-gray-500" />
          <input
            type="text"
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent outline-none ml-2 w-full"
          />
        </div>
      </div>

      <SupplierTable
        suppliers={filteredSuppliers}
        metrics={supplierMetrics}
        onUploadClick={handleUploadClick}
        onEdit={handleEdit}
        onDelete={handleDelete}
        canEdit={canManageSuppliers}
        canDelete={canManageSuppliers}
      />

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Supplier Purchase History</h2>
        <SupplierTransactionTable transactions={supplierTransactions} />
      </div>

      <AddSupplierModal
        isOpen={isModalOpen}
        setIsOpen={handleModalClose}
        onSaveSupplier={handleSaveSupplier}
        supplierToEdit={selectedSupplier}
      />

      <AddSupplierTransactionModal
        isOpen={isTransactionModalOpen}
        setIsOpen={setIsTransactionModalOpen}
        suppliers={suppliers}
        products={products}
        onAddSupplierTransaction={addSupplierTransaction}
      />

      {isPdfModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Upload Supplier Purchase PDF</h2>
              <button
                onClick={() => setIsPdfModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              {selectedSupplierId && (
                <SupplierPdfUpload
                  supplierId={selectedSupplierId}
                  onUploadSuccess={handleUploadSuccess}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Suppliers;
