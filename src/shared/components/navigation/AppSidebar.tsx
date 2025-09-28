import React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "../ui/sidebar";
import { SidebarBrand } from "./SidebarBrand";
import { SidebarNavigation } from "./SidebarNavigation";
import { SidebarUserMenu } from "./SidebarUserMenu";
import { SidebarEducatorSection } from "./SidebarEducatorSection";
import { SidebarAdminSection } from "./SidebarAdminSection";

interface AppSidebarProps {
  user?: any;
  navigationItems?: Array<{
    to: string;
    icon: any;
    label: string;
  }>;
  showEducatorSection?: boolean;
  showAdminSection?: boolean;
}

export function AppSidebar({ 
  user, 
  navigationItems,
  showEducatorSection = false,
  showAdminSection = false
}: AppSidebarProps) {
  const isMobile = window.innerWidth < 768;

  return (
    <Sidebar
      variant={isMobile ? "floating" : "sidebar"}
      className={isMobile ? "z-40" : ""}
    >
      <SidebarHeader>
        <SidebarBrand isCollapsed={false} />
      </SidebarHeader>
      
      <SidebarContent className="px-2">
        <SidebarNavigation 
          isCollapsed={false} 
          navigationItems={navigationItems}
        />
        
        {showEducatorSection && user && (
          <SidebarEducatorSection isCollapsed={false} />
        )}
        
        {showAdminSection && user && (
          <SidebarAdminSection isCollapsed={false} />
        )}
      </SidebarContent>
      
      <SidebarFooter className="p-2">
        <SidebarUserMenu isCollapsed={false} />
      </SidebarFooter>
    </Sidebar>
  );
}