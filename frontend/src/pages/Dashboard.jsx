import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  CircleAlert,
  ClipboardList,
  Package,
  Plus,
  ShoppingCart,
  Users,
} from "lucide-react";
import { useAppData } from "../contexts/useAppData";
import { getOrderItems, parseAmount } from "../utils/orderHelpers";

function Dashboard() {
  const navigate = useNavigate();
  const {
    user,
    totalProducts,
    lowStockCount,
    totalSuppliers,
    totalCustomers,
    totalOrders,
    products,
    recentOrders,
    canViewProfit,
    canManageOrders,
    canManageProducts,
    canManageSuppliers,
    dashboardSummary,
    lowStockProducts,
  } = useAppData();

  const stats = [
    { title: "Products in catalog", value: dashboardSummary?.totalProducts ?? totalProducts, icon: Package, tone: "blue", detail: "Across your store" },
    {
      title: "Inventory value",
      value: `₹${products.reduce((sum, product) => sum + Number(product.purchasePriceValue ?? parseAmount(product.purchasePrice)) * product.quantity, 0).toLocaleString("en-IN")}`,
      icon: Boxes,
      tone: "violet",
      detail: "At recorded purchase cost",
    },
    {
      title: "Completed sales",
      value: dashboardSummary?.totalSales ?? "₹0",
      icon: ShoppingCart,
      tone: "green",
      detail: `${dashboardSummary?.totalOrders ?? totalOrders} total orders`,
    },
    {
      title: "Pending orders",
      value: dashboardSummary?.pendingOrders ?? 0,
      icon: ClipboardList,
      tone: "amber",
      detail: `${totalCustomers} customers · ${totalSuppliers} suppliers`,
    },
  ];

  const firstName = user?.name?.trim().split(/\s+/)[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="dashboard-page">
      <section className="dashboard-intro">
        <div>
          <p className="section-kicker">YOUR BUSINESS, IN FOCUS</p>
          <h1>{greeting}, {firstName}.</h1>
          <p className="intro-copy">A little clarity for everything you have in motion.</p>
        </div>
        {canManageOrders && (
          <button type="button" className="primary-action" onClick={() => navigate("/orders")}>
            <Plus size={17} /> Create an order
          </button>
        )}
      </section>

      {lowStockCount > 0 && (
        <button type="button" className="stock-notice" onClick={() => navigate("/inventory")}>
          <span className="notice-symbol"><CircleAlert size={18} /></span>
          <span className="notice-copy">
            <strong>{lowStockCount} {lowStockCount === 1 ? "item needs" : "items need"} a restock</strong>
            <small>A quick look now can keep your shelves ready.</small>
          </span>
          <span className="notice-link">Review inventory <ArrowRight size={15} /></span>
        </button>
      )}

      <section className="metric-grid" aria-label="Store overview">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article key={stat.title} className="metric-card">
              <div className={`metric-icon tone-${stat.tone}`}><Icon size={19} strokeWidth={1.8} /></div>
              <p className="metric-label">{stat.title}</p>
              <p className="metric-value">{stat.value}</p>
              <div className="metric-footnote">
                {stat.tone === "amber" ? <ArrowUpRight size={14} /> : <span className="metric-indicator" />}
                {stat.detail}
              </div>
            </article>
          );
        })}
      </section>

      <section className="dashboard-grid">
        <article className="panel inventory-panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">INVENTORY</p>
              <h2>Stock at a glance</h2>
            </div>
            <button type="button" className="text-action" onClick={() => navigate("/inventory")}>
              View inventory <ArrowRight size={15} />
            </button>
          </div>
          <div className="inventory-summary">
            <div className="inventory-total">
              <span className="inventory-orbit"><Boxes size={21} /></span>
              <span>
                <strong>{products.reduce((sum, product) => sum + Number(product.quantity || 0), 0).toLocaleString("en-IN")}</strong>
                <small>total units on hand</small>
              </span>
            </div>
            <span className={`inventory-health${lowStockCount ? " needs-attention" : ""}`}>
              <span /> {lowStockCount ? `${lowStockCount} to review` : "All stocked"}
            </span>
          </div>

          <div className="stock-list">
            {lowStockProducts.length === 0 ? (
              <div className="empty-stock">
                <span className="empty-stock-icon"><Boxes size={19} /></span>
                <span><strong>Everything is in good shape</strong><small>There are no items below their reorder level.</small></span>
              </div>
            ) : (
              lowStockProducts.slice(0, 4).map((product) => {
                const progress = product.reorderLevel > 0
                  ? Math.min((product.quantity / product.reorderLevel) * 100, 100)
                  : 0;
                return (
                  <div className="stock-row" key={product.id}>
                    <span className="stock-product-mark"><Package size={16} /></span>
                    <span className="stock-product">
                      <strong>{product.name}</strong>
                      <small>{product.quantity} left · reorder at {product.reorderLevel}</small>
                    </span>
                    <span className="stock-progress" aria-label={`${progress}% of reorder threshold`}>
                      <span style={{ width: `${progress}%` }} />
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </article>

        <article className="panel actions-panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">SHORTCUTS</p>
              <h2>Make something happen</h2>
            </div>
          </div>
          <div className="shortcut-list">
            <button type="button" className="shortcut-row" onClick={() => navigate("/products")}>
              <span className="shortcut-icon shortcut-blue"><Package size={17} /></span>
              <span><strong>{canManageProducts ? "Manage products" : "Browse products"}</strong><small>{canManageProducts ? "Update your catalog and prices" : "View catalog and stock availability"}</small></span>
              <ArrowRight size={16} />
            </button>
            <button type="button" className="shortcut-row" onClick={() => navigate("/customers")}>
              <span className="shortcut-icon shortcut-violet"><Users size={17} /></span>
              <span><strong>Meet your customers</strong><small>Keep relationships growing</small></span>
              <ArrowRight size={16} />
            </button>
            <button type="button" className="shortcut-row" onClick={() => navigate("/suppliers")}>
              <span className="shortcut-icon shortcut-green"><Boxes size={17} /></span>
              <span><strong>{canManageSuppliers ? "Record a purchase" : "Supplier history"}</strong><small>{canManageSuppliers ? "Bring a new delivery into stock" : "Review supplier and purchase records"}</small></span>
              <ArrowRight size={16} />
            </button>
          </div>
          <button type="button" className="shortcut-foot" onClick={() => navigate("/sales")}>
            Explore your sales overview <ArrowUpRight size={15} />
          </button>
        </article>
      </section>

      <section className="panel recent-orders">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">WHAT'S HAPPENING</p>
            <h2>Recent orders</h2>
            <p className="panel-description">The latest activity from your customers.</p>
          </div>
          <button type="button" className="text-action" onClick={() => navigate("/orders")}>
            All orders <ArrowRight size={15} />
          </button>
        </div>
        {recentOrders.length === 0 ? (
          <div className="empty-orders">
            <span className="empty-stock-icon"><ClipboardList size={19} /></span>
            <span><strong>{canManageOrders ? "Your next order starts here" : "No orders yet"}</strong><small>{canManageOrders ? "Create an order when a customer is ready." : "Orders will appear here when created."}</small></span>
            {canManageOrders && <button type="button" className="secondary-action" onClick={() => navigate("/orders")}>Create order</button>}
          </div>
        ) : (
          <div className="table-scroll">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>ORDER</th>
                  <th>CUSTOMER</th>
                  <th>ITEMS</th>
                  <th>AMOUNT</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td><span className="order-reference">{order.orderNumber}</span></td>
                    <td><span className="customer-cell">{order.customerName}</span></td>
                    <td className="order-items-cell">
                      {getOrderItems(order).map((item) => item.productName).join(", ")}
                    </td>
                    <td className="amount-cell">₹{parseAmount(order.totalPrice).toLocaleString("en-IN")}</td>
                    <td>
                      <span className={`status-pill status-${order.status.toLowerCase()}`}>
                        <span />{order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer className="dashboard-footer">
        <span>Made for the details that keep your business moving.</span>
        <button type="button" onClick={() => navigate(canViewProfit ? "/profit" : "/sales")}>
          <ArrowRight size={14} /> {canViewProfit ? "See the bigger picture" : "Explore sales overview"}
        </button>
      </footer>
    </div>
  );
}

export default Dashboard;
