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
  ShieldCheck,
  UserRound,
  Building2,
  CreditCard,
  Activity,
  HeartHandshake,
  Settings,
} from "lucide-react";
import { useAppData } from "../../contexts/useAppData";

const APP_NAME = import.meta.env.VITE_APP_NAME || "Stockroom";

function Sidebar() {
  const { canViewProfit, canManageUsers, isPlatformAdmin, lowStockCount, activeBusiness } = useAppData();
  const workspaceBase = activeBusiness?.slug ? `/shop/${activeBusiness.slug}` : "";

  const workspaceNavItems = [
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
    workspaceNavItems.push({
      name: "Profit",
      path: "/profit",
      icon: TrendingUp,
      section: "Business",
    });
  }
  if (canManageUsers) {
    workspaceNavItems.push({
      name: "Team access",
      path: "/users",
      icon: UserRoundCog,
      section: "Manage",
    });
  }
  if (canViewProfit) {
    workspaceNavItems.push({
      name: "Storefront settings",
      path: "/settings",
      icon: Settings,
      section: "Manage",
    });
  }
  const businessNavItems = workspaceNavItems.map((item) => ({
    ...item,
    path: `${workspaceBase}${item.path}`,
  }));
  const navItems = isPlatformAdmin
    ? [
      { name: "Platform administration", path: "/platform-admin", icon: ShieldCheck, section: "Platform" },
      { name: "Shop owner accounts", path: "/platform-admin/owners", icon: UserRound, section: "Platform" },
      { name: "Business registration", path: "/platform-admin/businesses", icon: Building2, section: "Platform" },
      { name: "Subscription plans", path: "/platform-admin/plans", icon: CreditCard, section: "Platform" },
      { name: "Account status", path: "/platform-admin/status", icon: Activity, section: "Platform" },
      { name: "Platform usage", path: "/platform-admin/usage", icon: TrendingUp, section: "Platform" },
      { name: "Technical health", path: "/platform-admin/health", icon: Activity, section: "Platform" },
      { name: "Support & audit logs", path: "/platform-admin/support", icon: HeartHandshake, section: "Platform" },
    ]
    : businessNavItems;

  const sections = [...new Set(navItems.map((item) => item.section))];

  return (
    <aside className="sidebar">
      <NavLink to={isPlatformAdmin ? "/platform-admin" : "/dashboard"} className="brand-lockup" aria-label={isPlatformAdmin ? "Platform administration" : "Stockroom dashboard"}>
        <span className="brand-mark"><Boxes size={19} strokeWidth={2.2} /></span>
        <span className="brand-copy">
          <strong>{isPlatformAdmin ? APP_NAME : activeBusiness?.name || APP_NAME}</strong>
          <small>{isPlatformAdmin ? "PLATFORM ADMIN" : APP_NAME.toUpperCase()}</small>
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
                  end={item.name === "Dashboard" || item.path === "/platform-admin"}
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
            <strong>{isPlatformAdmin ? "Platform access" : "Everything in place"}</strong>
            <span>{isPlatformAdmin ? "Business enrollments only." : "Your shop, at a glance."}</span>
          </div>
        </div>
        <div className="sidebar-help"><CircleHelp size={15} /> {isPlatformAdmin ? "Platform operations" : "Built for your business"}</div>
      </div>
    </aside>
  );
}

export default Sidebar;