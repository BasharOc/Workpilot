import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  CheckSquare2,
  Receipt,
  Sun,
  Moon,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useTheme } from "@/hooks/useTheme";
import { useLocalStorage } from "@/hooks/useLocalStorage";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/clients", icon: Users, label: "Clients", end: false },
  { to: "/projects", icon: Briefcase, label: "Projects", end: false },
  { to: "/tasks", icon: CheckSquare2, label: "Tasks", end: false },
  { to: "/invoices", icon: Receipt, label: "Invoices", end: false },
];

function SidebarContent({
  collapsed = false,
  onLinkClick,
  onToggleCollapse,
}: {
  collapsed?: boolean;
  onLinkClick?: () => void;
  onToggleCollapse?: () => void;
}) {
  const { user } = useAuthStore();
  const { theme, toggleTheme } = useTheme();

  const itemClass = (isActive: boolean) =>
    `flex items-center rounded-md py-2 text-sm transition-colors ${
      collapsed ? "justify-center px-2" : "gap-3 px-3"
    } ${
      isActive
        ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
    }`;

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div
        className={`flex h-14 items-center border-b border-sidebar-border ${
          collapsed ? "justify-center px-2" : "px-3"
        }`}
      >
        {collapsed ? (
          onToggleCollapse ? (
            <button
              onClick={onToggleCollapse}
              title="Expand sidebar"
              className="flex h-7 w-7 items-center justify-center rounded-md text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          ) : (
            <img
              src="/workpilot_no_bg.png"
              alt="Workpilot"
              className="h-7 w-7 shrink-0 object-contain"
            />
          )
        ) : (
          <>
            <img
              src="/workpilot_no_bg.png"
              alt="Workpilot"
              className="h-7 w-7 shrink-0 object-contain"
            />
            <span className="ml-2 flex-1 text-sm font-semibold text-sidebar-foreground">
              Workpilot
            </span>
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                title="Collapse sidebar"
                className="flex h-7 w-7 items-center justify-center rounded-md text-sidebar-foreground/40 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Nav */}
      <nav className={`flex-1 space-y-0.5 py-3 ${collapsed ? "px-1" : "px-2"}`}>
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onLinkClick}
            title={collapsed ? label : undefined}
            className={({ isActive }) => itemClass(isActive)}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div
        className={`space-y-0.5 border-t border-sidebar-border py-3 ${
          collapsed ? "px-1" : "px-2"
        }`}
      >
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Light mode" : "Dark mode"}
          className={`flex w-full items-center rounded-md py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground ${
            collapsed ? "justify-center px-2" : "gap-3 px-3"
          }`}
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4 shrink-0" />
          ) : (
            <Moon className="h-4 w-4 shrink-0" />
          )}
          {!collapsed && (theme === "dark" ? "Light mode" : "Dark mode")}
        </button>

        {/* Profile */}
        <NavLink
          to="/profile"
          onClick={onLinkClick}
          title={collapsed ? "Profil" : undefined}
          className={({ isActive }) =>
            `flex w-full items-center rounded-md py-2 text-sm transition-colors ${
              collapsed ? "justify-center px-2" : "gap-3 px-3"
            } ${
              isActive
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            }`
          }
        >
          {/* Avatar circle with initials */}
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {`${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase()}
          </span>
          {!collapsed && (
            <span className="truncate">
              {user?.firstName} {user?.lastName}
            </span>
          )}
        </NavLink>
      </div>
    </div>
  );
}

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useLocalStorage("sidebar_collapsed", false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside
        className={`hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200 md:flex ${
          collapsed ? "w-14" : "w-60"
        }`}
      >
        <SidebarContent
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((p) => !p)}
        />
      </aside>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      {mobileOpen && (
        <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-sidebar-border bg-sidebar md:hidden">
          <SidebarContent
            collapsed={false}
            onLinkClick={() => setMobileOpen(false)}
          />
        </aside>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="flex h-14 items-center gap-3 border-b border-border bg-background px-4 md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold">Workpilot</span>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
