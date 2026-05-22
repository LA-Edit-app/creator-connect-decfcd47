import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Megaphone,
  Users,

  Settings,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsAgencyAdmin } from "@/hooks/useAgencyMembers";
import { useProfile } from "@/hooks/useDatabase";
import { useAuth } from "@/hooks/useAuth";

const baseNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: ClipboardList, label: "Campaign Tracker", path: "/campaign-tracker" },
  { icon: Users, label: "Creators", path: "/creators" },

  { icon: Settings, label: "Profile Settings", path: "/settings" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: isAdmin } = useIsAgencyAdmin();

  const navItems = isAdmin
    ? [
        ...baseNavItems,
        { icon: Building2, label: "Agency Settings", path: "/agency-settings" },
      ]
    : baseNavItems;

  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    user?.email ||
    "User";

  const displayEmail = user?.email ?? "";

  const initials = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .map((n) => n![0].toUpperCase())
    .join("") || displayEmail[0]?.toUpperCase() || "?";

  return (
    <aside
      className={cn(
        "h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 relative",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Floating expand button on sidebar edge when collapsed */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="absolute -right-3 top-5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-background border border-sidebar-border shadow-sm hover:bg-accent transition-colors"
          title="Expand sidebar"
        >
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        </button>
      )}

      {/* Logo */}
      <div className="h-16 px-4 border-b border-sidebar-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <Megaphone className="w-4 h-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-foreground">Briefly Suite</span>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-sidebar-foreground" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn("sidebar-link", isActive && "active")}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-sidebar-border">
        <div
          className={cn(
            "flex items-center gap-3 p-2 rounded-lg",
            collapsed && "justify-center"
          )}
        >
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium text-sm flex-shrink-0">
            {initials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {displayName}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {displayEmail}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
