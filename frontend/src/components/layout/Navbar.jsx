import { useState } from "react";
import { Bell, LogOut, CircleCheck, AlertTriangle, Store, Plus, X } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAppData } from "../../contexts/useAppData";

function Navbar() {
  const {
    user,
    isPlatformAdmin,
    businesses,
    activeBusiness,
    activeBusinessId,
    selectBusiness,
    createBusiness,
    logout,
    lowStockProducts,
    apiError,
  } = useAppData();
  const [showAlerts, setShowAlerts] = useState(false);
  const [showBusinessForm, setShowBusinessForm] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("retail");
  const [businessError, setBusinessError] = useState("");
  const [isCreatingBusiness, setIsCreatingBusiness] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const pageName = location.pathname.split("/").filter(Boolean).at(-1) || "dashboard";
  const pageLabel = pageName.charAt(0).toUpperCase() + pageName.slice(1);
  const initials = (user?.name || "Inventory User")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleCreateBusiness(event) {
    event.preventDefault();
    setBusinessError("");
    setIsCreatingBusiness(true);
    try {
      const business = await createBusiness({ name: businessName, businessType });
      navigate(`/shop/${business.slug}/dashboard`);
      setBusinessName("");
      setBusinessType("retail");
      setShowBusinessForm(false);
    } catch (error) {
      setBusinessError(error.response?.data?.message || "Unable to create business.");
    } finally {
      setIsCreatingBusiness(false);
    }
  }

  async function handleBusinessChange(businessId) {
    await selectBusiness(businessId);
    const business = businesses.find((item) => String(item.id) === String(businessId));
    if (!business) return;
    const shopPath = location.pathname.match(/^\/shop\/[^/]+(?:\/(.*))?$/);
    if (shopPath) {
      navigate(`/shop/${business.slug}/${shopPath[1] || "dashboard"}`);
    } else {
      navigate(`/shop/${business.slug}/dashboard`);
    }
  }

  return (
    <header className="topbar">
      {apiError && (
        <div className="api-notice" role="alert">
          <AlertTriangle size={16} />
          <span>{apiError}</span>
        </div>
      )}

      <div className="topbar-context">
        <span className="topbar-eyebrow">{isPlatformAdmin ? "PLATFORM" : "YOUR WORKSPACE"}</span>
        <span className="topbar-divider">/</span>
        <span className="topbar-current">{pageLabel}</span>
      </div>

      <div className="topbar-actions">
        {!isPlatformAdmin && businesses.length > 0 && (
          <div className="business-controls">
            <label className="business-switcher">
              <Store size={15} aria-hidden="true" />
              <span className="sr-only">Active business</span>
              <select
                value={activeBusinessId || ""}
                onChange={(event) => handleBusinessChange(event.target.value)}
                aria-label="Active business"
              >
                {businesses.map((business) => (
                  <option key={business.id} value={business.id}>{business.name}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="add-business-button"
              onClick={() => setShowBusinessForm((shown) => !shown)}
              aria-label={showBusinessForm ? "Close add business form" : "Add a business"}
              title="Add a business"
            >
              {showBusinessForm ? <X size={15} /> : <Plus size={15} />}
            </button>
            {showBusinessForm && (
              <form className="business-create-popover" onSubmit={handleCreateBusiness}>
                <strong>Create a business</strong>
                <label>
                  <span>Business name</span>
                  <input
                    value={businessName}
                    onChange={(event) => setBusinessName(event.target.value)}
                    required
                    maxLength={160}
                  />
                </label>
                <label>
                  <span>Business type</span>
                  <select value={businessType} onChange={(event) => setBusinessType(event.target.value)}>
                    <option value="retail">Retail</option>
                    <option value="wholesale">Wholesale</option>
                    <option value="both">Retail and wholesale</option>
                  </select>
                </label>
                {businessError && <p role="alert">{businessError}</p>}
                <button type="submit" disabled={isCreatingBusiness}>
                  {isCreatingBusiness ? "Creating…" : "Create business"}
                </button>
              </form>
            )}
          </div>
        )}
        {!isPlatformAdmin && <span className="today-label">
          {new Intl.DateTimeFormat("en", {
            weekday: "short",
            month: "short",
            day: "numeric",
          }).format(new Date())}
        </span>}
        {!isPlatformAdmin && <div className="alert-anchor">
          <button
            type="button"
            onClick={() => setShowAlerts((open) => !open)}
            className={`icon-button${showAlerts ? " is-pressed" : ""}`}
            title="Low stock alerts"
            aria-label={`Low stock alerts${lowStockProducts.length ? `, ${lowStockProducts.length} items` : ""}`}
            aria-expanded={showAlerts}
          >
            <Bell size={18} strokeWidth={1.8} />
            {lowStockProducts.length > 0 && <span className="alert-dot" />}
          </button>

          {showAlerts && (
            <div className="alert-popover">
              <div className="popover-heading">
                <div>
                  <strong>Stock alerts</strong>
                  <span>
                    {lowStockProducts.length === 0
                      ? "Everything is looking good."
                      : `${lowStockProducts.length} items need a little attention.`}
                  </span>
                </div>
                <span className={`popover-count${lowStockProducts.length ? " has-alerts" : ""}`}>
                  {lowStockProducts.length}
                </span>
              </div>
              <div className="alert-list">
                {lowStockProducts.length === 0 ? (
                  <div className="all-clear"><CircleCheck size={18} /> No low-stock items</div>
                ) : (
                  lowStockProducts.map((product) => (
                    <Link
                      key={product.id}
                      to="/inventory"
                      onClick={() => setShowAlerts(false)}
                      className="alert-item"
                    >
                      <span className="alert-item-icon"><AlertTriangle size={15} /></span>
                      <span>
                        <strong>{product.name}</strong>
                        <small>{product.quantity} left · reorder at {product.reorderLevel}</small>
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}
        </div>}

        <span className="topbar-separator" />
        <div className="account-chip" title={user?.email || ""}>
          <span className="account-avatar">{initials}</span>
          <span className="account-copy">
            <strong>{user?.name ?? "Inventory User"}</strong>
            <small>
              {isPlatformAdmin
                ? "Platform administrator"
                : activeBusiness?.role === "owner"
                ? "Business owner"
                : activeBusiness?.role === "manager"
                  ? "Manager"
                  : activeBusiness?.role === "staff"
                    ? "Staff"
                    : "Viewer"}
            </small>
          </span>
        </div>
        <button type="button" onClick={logout} className="logout-button" aria-label="Sign out">
          <LogOut size={16} strokeWidth={1.8} />
          <span>Sign out</span>
        </button>
      </div>
    </header>
  );
}

export default Navbar;
