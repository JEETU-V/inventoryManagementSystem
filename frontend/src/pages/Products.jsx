import { useState } from "react";
import { Search, Plus } from "lucide-react";
import { useAppData } from "../contexts/AppContext";
import ProductTable from "../features/products/ProductTable";
import AddProductModal from "../features/products/AddProductModal";

function Products() {
  const { products, suppliers, addProduct, updateProduct, deleteProduct } = useAppData();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const filteredProducts = products.filter((product) =>
    [product.name, product.sku, product.category]
      .join(" ")
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  function handleEdit(product) {
    setSelectedProduct(product);
    setIsModalOpen(true);
  }

  function handleDelete(productId) {
    deleteProduct(productId);
  }

  function handleSaveProduct(product) {
    if (selectedProduct) {
      updateProduct(product.id, product);
    } else {
      addProduct(product);
    }

    setSelectedProduct(null);
  }

  function handleModalClose() {
    setSelectedProduct(null);
    setIsModalOpen(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Products</h1>
          <p className="text-gray-500 mt-1">Manage stationery inventory, stock, and pricing.</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={18} />
          {selectedProduct ? "Edit Product" : "Add Product"}
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border">
        <div className="flex items-center bg-gray-100 px-4 py-3 rounded-lg">
          <Search size={18} className="text-gray-500" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent outline-none ml-2 w-full"
          />
        </div>
      </div>

      <ProductTable products={filteredProducts} onDelete={handleDelete} onEdit={handleEdit} />

      <AddProductModal
        isOpen={isModalOpen}
        setIsOpen={handleModalClose}
        onSaveProduct={handleSaveProduct}
        productToEdit={selectedProduct}
        suppliers={suppliers}
      />
    </div>
  );
}

export default Products;
