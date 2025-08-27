
import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Settings, Activity } from "lucide-react";
import { useAuthorization } from "@/hooks/useAuthorization";

interface SidebarAdminSectionProps {
  isCollapsed: boolean;
}

export const SidebarAdminSection: React.FC<SidebarAdminSectionProps> = ({
  isCollapsed,
}) => {
  const location = useLocation();
  const { isAdmin, loading } = useAuthorization();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleNavigationClick = (e: React.MouseEvent) => {
    // Allow default navigation behavior
  };

  // Don't show admin section if not admin or still loading
  if (loading || !isAdmin) {
    return null;
  }

  const adminItems = [
    { to: "/dashboard/admin", icon: Settings, label: "Admin Panel" },
    { to: "/dashboard/signal-diagnostics", icon: Activity, label: "Signal Diagnostics" },
  ];

  return (
    <SidebarGroup>
      <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>
        Admin
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {adminItems.map((item) => (
            <SidebarMenuItem key={item.to}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.to)}
                className={`w-full justify-start ${
                  isActive(item.to)
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
                tooltip={isCollapsed ? item.label : undefined}
              >
                <Link
                  to={item.to}
                  className="flex items-center gap-3 px-3 py-2"
                  onClick={handleNavigationClick}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {!isCollapsed && (
                    <span className="text-sm font-medium">{item.label}</span>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
};
