
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
        className="border-r-0 bg-background/95 backdrop-blur-xl"
        collapsible="offcanvas"
        variant="floating"
      >
        <SidebarHeader className="p-4 border-b border-border/20">
          <SidebarBrand isCollapsed={false} />
        </SidebarHeader>

        <SidebarContent className="px-3 py-4 flex-1">
          <SidebarNavigation isCollapsed={false} />
          <SidebarAdminSection 
            isCollapsed={false} 
            userAccessLevel={user?.user_metadata?.access_level} 
          />
        </SidebarContent>

        <SidebarFooter className="p-4 mt-auto">
          <SidebarUserMenu isCollapsed={false} />
        </SidebarFooter>
      </Sidebar>
    );
  }

  // For tablet and desktop, use proper Sidebar component with no collapsing
  // This ensures proper styling context and always shows labels
  return (
    <Sidebar 
      className="border-r-0 bg-background/95 backdrop-blur-xl"
      collapsible="none"
      variant="sidebar"
    >
      <SidebarHeader className="p-4 border-b border-border/20">
        <SidebarBrand isCollapsed={false} />
      </SidebarHeader>

      <SidebarContent className="px-3 py-4 flex-1 overflow-auto">
        <SidebarNavigation isCollapsed={false} />
        <SidebarAdminSection 
          isCollapsed={false} 
          userAccessLevel={user?.user_metadata?.access_level} 
        />
      </SidebarContent>

      <SidebarFooter className="p-4 mt-auto">
        <SidebarUserMenu isCollapsed={false} />
      </SidebarFooter>
    </Sidebar>
  );
}
