
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { 
  Home, 
  BookOpen, 
  TrendingUp, 
  Video, 
  MessageCircle, 
  BarChart3,
  Users
} from 'lucide-react';

const navigationItems = [
  { title: "Home", url: "/dashboard/home", icon: Home },
  { title: "Education", url: "/dashboard/education", icon: BookOpen },
  { title: "Signal Stream", url: "/dashboard/signals", icon: TrendingUp },
  { title: "Live Sessions", url: "/dashboard/live", icon: Video },
  { title: "Community Forum", url: "/dashboard/forum", icon: MessageCircle },
  { title: "IB Partnership", url: "/partnership", icon: Users },
  { title: "Advanced Tools", url: "/dashboard/tools", icon: BarChart3 },
  { title: "My Progress", url: "/dashboard/progress", icon: BarChart3 },
];

interface SidebarNavigationProps {
  isCollapsed: boolean;
}

export function SidebarNavigation({ isCollapsed }: SidebarNavigationProps) {
  const location = useLocation();

  const isActive = (url: string) => {
    return location.pathname === url;
  };

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu className="space-y-1">
          {navigationItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton 
                asChild 
                isActive={isActive(item.url)}
                className={`w-full justify-start transition-colors ${
                  isActive(item.url) 
                    ? "bg-accent-green text-white" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
                tooltip={isCollapsed ? item.title : undefined}
              >
                <Link to={item.url} className="flex items-center gap-3 px-3 py-2 rounded-md">
                  <item.icon className="w-4 h-4 shrink-0" />
                  {!isCollapsed && (
                    <span className="text-sm font-medium">{item.title}</span>
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
