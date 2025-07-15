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
  Home,
  GraduationCap,
  Radio,
  Video,
  MessageSquare,
  Briefcase,
  Wrench,
  TrendingUp,
  Bot,
} from "lucide-react";

interface SidebarNavigationProps {
  isCollapsed: boolean;
}

export function SidebarNavigation({ isCollapsed }: SidebarNavigationProps) {
  const location = useLocation();

  const isActive = (url: string) => {
    // Handle both exact matches and home route special case
    if (url === "/dashboard/home") {
      return (
        location.pathname === "/dashboard/home" ||
        location.pathname === "/dashboard"
      );
    }
    return location.pathname === url;
  };

  const navigationItems = [
    { to: "/dashboard/home", icon: Home, label: "Home" },
    { to: "/dashboard/education", icon: GraduationCap, label: "Education" },
    { to: "/dashboard/signal-stream", icon: Radio, label: "Signal Stream" },
    { to: "/dashboard/live", icon: Video, label: "Live Sessions" },
    { to: "/dashboard/forum", icon: MessageSquare, label: "Forum" },
    { to: "/dashboard/advanced-tools", icon: Wrench, label: "Advanced Tools" },
    { to: "/dashboard/my-progress", icon: TrendingUp, label: "My Progress" },
    { to: "/dashboard/athena", icon: Bot, label: "Athena AI" },
  ];

  const handleNavigationClick = (e: React.MouseEvent) => {
    // Prevent the sidebar click handler from being triggered
    e.stopPropagation();
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel className={`${isCollapsed ? "sr-only" : ""} text-white/60 uppercase tracking-widest text-xs font-bold mb-4`}>
        Navigation
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="space-y-2">
          {navigationItems.map((item) => (
            <SidebarMenuItem key={item.to}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.to)}
                className={`w-full justify-start rounded-xl border-0 transition-all duration-300 ${
                  isActive(item.to)
                    ? "bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold shadow-lg"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
                tooltip={isCollapsed ? item.label : undefined}
              >
                <Link
                  to={item.to}
                  className="flex items-center gap-4 px-4 py-3"
                  onClick={handleNavigationClick}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  {!isCollapsed && (
                    <span className="font-medium tracking-wide">{item.label}</span>
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
