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
import { Settings } from "lucide-react";

interface SidebarAdminSectionProps {
  isCollapsed: boolean;
  userAccessLevel?: string;
}

export function SidebarAdminSection({
  isCollapsed,
  userAccessLevel,
}: SidebarAdminSectionProps) {
  const location = useLocation();

  const isActive = (url: string) => {
    return location.pathname === url;
  };

  const handleNavigationClick = (e: React.MouseEvent) => {
    // Prevent the sidebar click handler from being triggered
    e.stopPropagation();
  };

  if (userAccessLevel !== "admin") {
    return null;
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>
        Administration
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive("/dashboard/admin")}
              className={`w-full justify-start ${
                isActive("/dashboard/admin")
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
              tooltip={isCollapsed ? "Admin Panel" : undefined}
            >
              <Link
                to="/dashboard/admin"
                className="flex items-center gap-3 px-3 py-2"
                onClick={handleNavigationClick}
              >
                <Settings className="w-4 h-4 shrink-0" />
                {!isCollapsed && (
                  <span className="text-sm font-medium">Admin Panel</span>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
