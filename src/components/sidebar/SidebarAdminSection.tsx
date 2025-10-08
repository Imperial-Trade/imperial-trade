import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuthorizationAware } from '@/hooks/useAuthorizationAware';
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
}

/**
 * ✅ SECURITY FIX (ERROR #17): Use secure RPC-based authorization
 * Removed userAccessLevel prop in favor of useAuthorizationAware hook
 */
export function SidebarAdminSection({ isCollapsed }: SidebarAdminSectionProps) {
  const location = useLocation();
  const { isAdmin } = useAuthorizationAware();
  
  const isActive = (url: string) => {
    return location.pathname === url;
  };

  const handleNavigationClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };
  
  // Only show for admin users
  if (!isAdmin) {
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
