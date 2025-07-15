
import React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarBrand } from "./sidebar/SidebarBrand";
import { SidebarNavigation } from "./sidebar/SidebarNavigation";
import { SidebarAdminSection } from "./sidebar/SidebarAdminSection";
import { SidebarEducatorSection } from "./sidebar/SidebarEducatorSection";
import { SidebarUserMenu } from "./sidebar/SidebarUserMenu";
import { useIsMobile } from "@/hooks/use-mobile";

export function AppSidebar() {
  const { user } = useAuth();
  const { state: sidebarState } = useSidebar();
  const isCollapsed = sidebarState === "collapsed";
  const isMobile = useIsMobile();

  // For mobile, use Sheet behavior with full sidebar structure
  if (isMobile) {
    return (
      <Sidebar 
        className="border-r-0 glass-effect"
        collapsible="offcanvas"
        variant="floating"
      >
        <SidebarHeader className="p-6 border-b border-white/10">
          <SidebarBrand isCollapsed={false} />
        </SidebarHeader>

        <SidebarContent className="px-4 py-6 flex-1">
          <SidebarNavigation isCollapsed={false} />
          <SidebarEducatorSection 
            isCollapsed={false} 
            userType={user?.user_metadata?.user_type} 
          />
          <SidebarAdminSection 
            isCollapsed={false} 
            userAccessLevel={user?.user_metadata?.access_level} 
          />
        </SidebarContent>

        <SidebarFooter className="p-6 mt-auto border-t border-white/10">
          <SidebarUserMenu isCollapsed={false} />
        </SidebarFooter>
      </Sidebar>
    );
  }

  // For tablet and desktop, use proper Sidebar component with no collapsing
  return (
    <Sidebar 
      className="border-r-0 glass-effect"
      collapsible="none"
      variant="sidebar"
    >
      <SidebarHeader className="p-6 border-b border-white/10">
        <SidebarBrand isCollapsed={false} />
      </SidebarHeader>

      <SidebarContent className="px-4 py-6 flex-1 overflow-auto">
        <SidebarNavigation isCollapsed={false} />
        <SidebarEducatorSection 
          isCollapsed={false} 
          userType={user?.user_metadata?.user_type} 
        />
        <SidebarAdminSection 
          isCollapsed={false} 
          userAccessLevel={user?.user_metadata?.access_level} 
        />
      </SidebarContent>

      <SidebarFooter className="p-6 mt-auto border-t border-white/10">
        <SidebarUserMenu isCollapsed={false} />
      </SidebarFooter>
    </Sidebar>
  );
}
