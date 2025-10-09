
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

  // Base responsive classes for all devices
  const baseClasses = "border-r-0 nav-glass-effect flex flex-col";
  const responsiveClasses = "w-full sm:w-80 md:w-72 lg:w-80 xl:w-96";
  const heightClasses = "h-[100vh] max-h-[100vh] min-h-0";

  // For mobile devices (phones)
  if (isMobile) {
    return (
      <Sidebar 
        className={`${baseClasses} ${heightClasses} max-w-full`}
        collapsible="offcanvas"
        variant="floating"
      >
        <SidebarHeader className="p-2 sm:p-3 border-b border-border/20 flex-shrink-0">
          <SidebarBrand isCollapsed={false} />
        </SidebarHeader>

        <SidebarContent className="px-2 sm:px-3 py-2 sm:py-3 flex-1 min-h-0 max-h-full overflow-y-auto overscroll-contain scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border">
          <div className="space-y-2 sm:space-y-3 min-h-min pb-24">
            <SidebarNavigation isCollapsed={false} />
            <SidebarEducatorSection isCollapsed={false} />
            <SidebarAdminSection isCollapsed={false} />
          </div>
        </SidebarContent>

        <SidebarFooter className="p-2 sm:p-3 flex-shrink-0 border-t border-border/20">
          <SidebarUserMenu isCollapsed={false} />
        </SidebarFooter>
      </Sidebar>
    );
  }

  // For tablet and desktop devices
  return (
    <Sidebar 
      className={`${baseClasses} ${heightClasses} ${responsiveClasses}`}
      collapsible="none"
      variant="sidebar"
    >
      <SidebarHeader className="p-3 lg:p-4 border-b border-border/20 flex-shrink-0">
        <SidebarBrand isCollapsed={false} />
      </SidebarHeader>

      <SidebarContent className="px-3 lg:px-4 py-3 lg:py-4 flex-1 min-h-0 max-h-full overflow-y-auto overscroll-contain scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border">
        <div className="space-y-3 lg:space-y-4 min-h-min pb-24">
          <SidebarNavigation isCollapsed={false} />
          <SidebarEducatorSection isCollapsed={false} />
          <SidebarAdminSection isCollapsed={false} />
        </div>
      </SidebarContent>

      <SidebarFooter className="p-3 lg:p-4 flex-shrink-0 border-t border-border/20">
        <SidebarUserMenu isCollapsed={false} />
      </SidebarFooter>
    </Sidebar>
  );
}
