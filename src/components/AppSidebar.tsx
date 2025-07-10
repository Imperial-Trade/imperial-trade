
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
  const isTablet = window.innerWidth >= 640 && window.innerWidth < 1024;

  // For mobile and tablet, use Sheet behavior (existing)
  if (isMobile || isTablet) {
    return (
      <Sidebar 
        className="border-r-0 bg-background/95 backdrop-blur-xl"
        collapsible="offcanvas"
        variant="floating"
      >
        <div className="h-full bg-background/95 backdrop-blur-xl">
          <SidebarHeader className="p-4 border-b border-border/20">
            <SidebarBrand isCollapsed={false} />
          </SidebarHeader>

          <SidebarContent className="px-3 py-4">
            <SidebarNavigation isCollapsed={false} />
            <SidebarAdminSection 
              isCollapsed={false} 
              userAccessLevel={user?.user_metadata?.access_level} 
            />
          </SidebarContent>

          <SidebarFooter className="p-4">
            <SidebarUserMenu isCollapsed={false} />
          </SidebarFooter>
        </div>
      </Sidebar>
    );
  }

  // For desktop, render just the content (overlay handles positioning)
  return (
    <>
      <SidebarHeader className="p-4 border-b border-border/20">
        <SidebarBrand isCollapsed={isCollapsed} />
      </SidebarHeader>

      <SidebarContent className="px-3 py-4 flex-1 overflow-auto">
        <SidebarNavigation isCollapsed={isCollapsed} />
        <SidebarAdminSection 
          isCollapsed={isCollapsed} 
          userAccessLevel={user?.user_metadata?.access_level} 
        />
      </SidebarContent>

      <SidebarFooter className="p-4">
        <SidebarUserMenu isCollapsed={isCollapsed} />
      </SidebarFooter>
    </>
  );
}
