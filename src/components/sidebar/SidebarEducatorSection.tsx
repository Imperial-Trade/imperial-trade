
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
  TrendingUp, 
  BarChart3, 
  Users, 
  Award,
  Signal,
  BookOpen
} from "lucide-react";

interface SidebarEducatorSectionProps {
  isCollapsed: boolean;
  userType?: string;
}

export function SidebarEducatorSection({
  isCollapsed,
  userType,
}: SidebarEducatorSectionProps) {
  const location = useLocation();

  const isActive = (url: string) => {
    return location.pathname === url;
  };

  const handleNavigationClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  if (userType !== "educator" && userType !== "ib_partner") {
    return null;
  }

  const menuItems = [
    {
      title: "Trade Signal Management",
      url: "/dashboard/educator/signals",
      icon: Signal,
      description: "Manage your trading signals"
    },
    {
      title: "Performance Analytics",
      url: "/dashboard/educator/analytics",
      icon: BarChart3,
      description: "View performance metrics"
    },
    {
      title: "Followers & Engagement",
      url: "/dashboard/educator/followers",
      icon: Users,
      description: "Track your followers"
    }
  ];

  if (userType === "ib_partner") {
    menuItems.push({
      title: "IB Partner Dashboard",
      url: "/dashboard/educator/ib-dashboard",
      icon: Award,
      description: "IB partner tools and commissions"
    });
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>
        {userType === "ib_partner" ? "IB Partner Tools" : "Educator Tools"}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.url)}
                className={`w-full justify-start ${
                  isActive(item.url)
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
                tooltip={isCollapsed ? item.title : undefined}
              >
                <Link
                  to={item.url}
                  className="flex items-center gap-3 px-3 py-2"
                  onClick={handleNavigationClick}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {!isCollapsed && (
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{item.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {item.description}
                      </span>
                    </div>
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
