import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../ui/sidebar";

interface SidebarNavigationProps {
  isCollapsed: boolean;
  navigationItems?: Array<{
    to: string;
    icon: any;
    label: string;
  }>;
}

export function SidebarNavigation({ isCollapsed, navigationItems }: SidebarNavigationProps) {
  const location = useLocation();

  const isActive = (url: string) => {
    if (url === "/dashboard/home") {
      return (
        location.pathname === "/dashboard/home" ||
        location.pathname === "/dashboard"
      );
    }
    return location.pathname === url;
  };

  const handleNavigationClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Default navigation items if none provided
  const defaultNavigationItems = [
    { to: "/dashboard/home", icon: () => <span>🏠</span>, label: "Home" },
    { to: "/dashboard/education", icon: () => <span>🎓</span>, label: "Education" },
    { to: "/dashboard/signal-stream", icon: () => <span>📡</span>, label: "Signal Stream" },
    { to: "/dashboard/live", icon: () => <span>📹</span>, label: "Live Sessions" },
    { to: "/dashboard/forum", icon: () => <span>💬</span>, label: "Forum" },
    { to: "/dashboard/advanced-tools", icon: () => <span>🔧</span>, label: "Advanced Tools" },
    { to: "/dashboard/my-progress", icon: () => <span>📈</span>, label: "My Progress" },
    { to: "/dashboard/athena", icon: () => <span>🤖</span>, label: "Athena AI" },
  ];

  const items = navigationItems || defaultNavigationItems;

  return (
    <SidebarGroup>
      <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>
        Navigation
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
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
}