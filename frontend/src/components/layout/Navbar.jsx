import { useState } from "react";
import { Bell, LogOut, CircleCheck, AlertTriangle } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAppData } from "../../contexts/useAppData";

function Navbar() {
  const { user, logout, lowStockProducts, apiError } = useAppData();
  const [showAlerts, setShowAlerts] = useState(false);
  const location = useLocation();
  const pageName = location.pathname.split("/")[1] || "dashboard";
  const pageLabel = pageName.charAt(0).toUpperCase() + pageName.slice(1);
  const initials = (user?.name || "Inventory User")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="topbar">
      {apiError && (
        <div className="api-notice" role="alert">
          <AlertTriangle size={16} />
          <span>{apiError}</span>
        </div>
      )}

      <div className="topbar-context">
        <span className="topbar-eyebrow">YOUR WORKSPACE</span>
        <span className="topbar-divider">/</span>
        <span className="topbar-current">{pageLabel}</span>
      </div>

      <div className="topbar-actions">
        <span className="today-label">
          {new Intl.DateTimeFormat("en", {
            weekday: "short",
            month: "short",
            day: "numeric",
          }).format(new Date())}
        </span>
        <div className="alert-anchor">
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
        </div>

        <span className="topbar-separator" />
        <div className="account-chip" title={user?.email || ""}>
          <span className="account-avatar">{initials}</span>
          <span className="account-copy">
            <strong>{user?.name ?? "Inventory User"}</strong>
            <small>{user?.role === "admin" ? "Administrator" : user?.role === "staff" ? "Staff" : "Viewer"}</small>
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
