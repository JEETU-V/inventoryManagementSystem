import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Boxes,
  Package,
  Truck,
  Users,
  ShoppingCart,
  TrendingUp,
  Command,
  CircleHelp,
  UserRoundCog,
} from "lucide-react";
import { useAppData } from "../../contexts/useAppData";

function Sidebar() {
  const { canViewProfit, canManageUsers, lowStockCount } = useAppData();

  const navItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
      section: "Workspace",
    },
    {
      name: "Inventory",
      path: "/inventory",
      icon: Boxes,
      section: "Workspace",
    },
    {
      name: "Products",
      path: "/products",
      icon: Package,
      section: "Manage",
    },
    {
      name: "Suppliers",
      path: "/suppliers",
      icon: Truck,
      section: "Manage",
    },
    {
      name: "Customers",
      path: "/customers",
      icon: Users,
      section: "Manage",
    },
    {
      name: "Orders",
      path: "/orders",
      icon: ShoppingCart,
      section: "Business",
    },
    {
      name: "Sales",
      path: "/sales",
      icon: TrendingUp,
      section: "Business",
    },
  ];

  if (canViewProfit) {
    navItems.push({
      name: "Profit",
      path: "/profit",
      icon: TrendingUp,
      section: "Business",
    });
  }
  if (canManageUsers) {
    navItems.push({
      name: "Team access",
      path: "/users",
      icon: UserRoundCog,
      section: "Manage",
    });
  }

  const sections = [...new Set(navItems.map((item) => item.section))];

  return (
    <aside className="sidebar">
      <NavLink to="/dashboard" className="brand-lockup" aria-label="Stockroom dashboard">
        <span className="brand-mark"><Boxes size={19} strokeWidth={2.2} /></span>
        <span className="brand-copy">
          <strong>Stockroom</strong>
          <small>INVENTORY STUDIO</small>
        </span>
      </NavLink>

      <div className="sidebar-section-label">MENU</div>
      <nav className="sidebar-nav" aria-label="Main navigation">
        {sections.map((section) => (
          <div className="nav-section" key={section}>
            <p className="nav-section-label">{section}</p>
            {navItems.filter((item) => item.section === section).map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `nav-link${isActive ? " is-active" : ""}`}
                  end={item.path === "/dashboard"}
                >
                  <Icon size={18} strokeWidth={1.8} />
                  <span>{item.name}</span>
                  {item.path === "/inventory" && lowStockCount > 0 && (
                    <span className="nav-count">{lowStockCount}</span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-tip">
          <span className="sidebar-tip-icon"><Command size={16} /></span>
          <div>
            <strong>Everything in place</strong>
            <span>Your shop, at a glance.</span>
          </div>
        </div>
        <div className="sidebar-help"><CircleHelp size={15} /> Built for your business</div>
      </div>
    </aside>
  );
}

export default Sidebar;