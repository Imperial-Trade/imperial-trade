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
import {
  GraduationCap,
  Radio,
  Video,
  MessageSquare,
  Wrench,
  Bot,
} from "lucide-react";

interface SidebarNavigationProps {
  isCollapsed: boolean;
}

export function SidebarNavigation({ isCollapsed }: SidebarNavigationProps) {
  const location = useLocation();

  const isActive = (url: string) => {
    if (url === "/dashboard/signal-stream") {
      return (
        location.pathname === "/dashboard/signal-stream" ||
        location.pathname === "/dashboard"
      );
    }
    return location.pathname === url;
  };

  const navigationItems = [
    { to: "/dashboard/signal-stream", icon: Radio, label: "Signal Stream" },
    { to: "/dashboard/education", icon: GraduationCap, label: "Education" },
    { to: "/dashboard/live", icon: Video, label: "Live Sessions" },
    { to: "/dashboard/forum", icon: MessageSquare, label: "Forum" },
    { to: "/dashboard/journal-xx", icon: Wrench, label: "Advanced Tools" },
    { to: "/dashboard/athena", icon: Bot, label: "Athena AI" },
  ];

  const handleNavigationClick = (e: React.MouseEvent) => {
    // Prevent the sidebar click handler from being triggered
    e.stopPropagation();
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>
        Navigation
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {navigationItems.map((item) => (
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
