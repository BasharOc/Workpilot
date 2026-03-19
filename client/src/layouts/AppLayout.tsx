import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  CheckSquare2,
  Sun,
  Moon,
  Menu,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useTheme } from "@/hooks/useTheme";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/clients", icon: Users, label: "Clients", end: false },
  { to: "/projects", icon: Briefcase, label: "Projects", end: false },
  { to: "/tasks", icon: CheckSquare2, label: "Tasks", end: false },
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
  const { user, logout } = useAuthStore();
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
          collapsed ? "justify-center px-0" : "gap-2.5 px-4"
        }`}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary">
          <CheckSquare2 className="h-4 w-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold text-sidebar-foreground">
            FreelanceFlow
          </span>
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

        {collapsed ? (
          <button
            onClick={() => void logout()}
            title="Sign out"
            className="flex w-full items-center justify-center rounded-md px-2 py-2 text-sidebar-foreground/50 transition hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        ) : (
          <div className="flex items-center justify-between rounded-md px-3 py-2">
            <span className="truncate text-sm text-sidebar-foreground/70">
              {user?.first_name} {user?.last_name}
            </span>
            <button
              onClick={() => void logout()}
              title="Sign out"
              className="ml-2 shrink-0 text-sidebar-foreground/50 transition hover:text-sidebar-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`flex w-full items-center rounded-md py-2 text-sm text-sidebar-foreground/40 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground ${
              collapsed ? "justify-center px-2" : "gap-3 px-3"
            }`}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4 shrink-0" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4 shrink-0" />
                <span>Collapse</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

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
          <span className="text-sm font-semibold">FreelanceFlow</span>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
