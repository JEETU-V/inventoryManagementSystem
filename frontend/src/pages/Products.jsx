import { useState } from "react";
import { FilterX, Plus, Search } from "lucide-react";
import { useAppData } from "../contexts/useAppData";
import ProductTable from "../features/products/ProductTable";
import AddProductModal from "../features/products/AddProductModal";

function Products() {
  const {
    canManageProducts,
    products,
    suppliers,
    addProduct,
    updateProduct,
    deleteProduct,
  } = useAppData();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [pageError, setPageError] = useState("");

  const categories = [...new Set(products.map((product) => (product.category || "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
  const hasUncategorizedProducts = products.some((product) => !product.category?.trim());

  const filteredProducts = products.filter((product) => {
    const matchesSearch = [product.name, product.sku, product.category]
      .join(" ")
      .toLowerCase()
      .includes(searchTerm.trim().toLowerCase());
    const matchesCategory =
      !categoryFilter ||
      (categoryFilter === "__uncategorized__" && !(product.category || "").trim()) ||
      (product.category || "").trim() === categoryFilter;
    const matchesStock =
      !stockFilter ||
      (stockFilter === "out" && product.quantity === 0) ||
      (stockFilter === "low" && product.quantity > 0 && product.quantity <= product.reorderLevel) ||
      (stockFilter === "in" && product.quantity > product.reorderLevel);

    return matchesSearch && matchesCategory && matchesStock;
  });

  function handleEdit(product) {
    setSelectedProduct(product);
    setIsModalOpen(true);
  }

  async function handleDelete(productId) {
    const product = products.find((item) => item.id === productId);
    if (!window.confirm(`Delete "${product?.name || "this product"}"? This cannot be undone.`)) return;
    setPageError("");
    try {
      await deleteProduct(productId);
    } catch (error) {
      setPageError(error.response?.data?.message || "Unable to delete product. Please try again.");
    }
  }

  async function handleSaveProduct(product) {
    setPageError("");
    if (product.id) {
      await updateProduct(product.id, product);
      return;
    }

    await addProduct(product);
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

        {canManageProducts ? (
          <button
            onClick={() => {
              setSelectedProduct(null);
              setPageError("");
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={18} />
            {selectedProduct ? "Edit Product" : "Add Product"}
          </button>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
            Read-only access for product inventory
          </div>
        )}
      </div>

      {pageError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {pageError}
        </div>
      )}

      <div className="grid gap-3 rounded-xl border bg-white p-4 shadow-sm md:grid-cols-[minmax(12rem,1fr)_repeat(2,minmax(10rem,0.55fr))_auto]">
        <label className="flex items-center rounded-lg bg-gray-100 px-4 py-3">
          <Search size={18} className="shrink-0 text-gray-500" />
          <input
            type="search"
            placeholder="Search name, SKU, or category"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="ml-2 w-full bg-transparent outline-none"
            aria-label="Search products"
          />
        </label>

        <label className="sr-only" htmlFor="product-category-filter">Filter by category</label>
        <select
          id="product-category-filter"
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          className="rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All categories</option>
          {hasUncategorizedProducts && <option value="__uncategorized__">Uncategorized</option>}
          {categories.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>

        <label className="sr-only" htmlFor="product-stock-filter">Filter by stock status</label>
        <select
          id="product-stock-filter"
          value={stockFilter}
          onChange={(event) => setStockFilter(event.target.value)}
          className="rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All stock statuses</option>
          <option value="in">In stock</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </select>

        <button
          type="button"
          onClick={() => {
            setSearchTerm("");
            setCategoryFilter("");
            setStockFilter("");
          }}
          disabled={!searchTerm && !categoryFilter && !stockFilter}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FilterX size={16} /> Clear filters
        </button>
        <p className="text-sm text-gray-500 md:col-span-4">
          Showing {filteredProducts.length} of {products.length} products
        </p>
      </div>

      <ProductTable
        products={filteredProducts}
        onDelete={handleDelete}
        onEdit={handleEdit}
        canEdit={canManageProducts}
        canDelete={canManageProducts}
      />

      {isModalOpen && (
        <AddProductModal
          isOpen={isModalOpen}
          setIsOpen={handleModalClose}
          onSaveProduct={handleSaveProduct}
          productToEdit={selectedProduct}
          suppliers={suppliers}
        />
      )}
    </div>
  );
}

export default Products;
