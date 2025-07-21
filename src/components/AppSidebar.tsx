
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
  const baseClasses = "border-r-0 bg-background/95 backdrop-blur-xl flex flex-col";
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
        <SidebarHeader className="p-3 sm:p-4 border-b border-border/20 flex-shrink-0">
          <SidebarBrand isCollapsed={false} />
        </SidebarHeader>

        <SidebarContent className="px-2 sm:px-3 py-3 sm:py-4 flex-1 min-h-0 max-h-full overflow-y-auto overscroll-contain scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border">
          <div className="space-y-3 sm:space-y-4 min-h-min pb-20">
            <SidebarNavigation isCollapsed={false} />
            <SidebarEducatorSection 
              isCollapsed={false} 
              userType={user?.user_metadata?.user_type} 
            />
            <SidebarAdminSection 
              isCollapsed={false} 
              userAccessLevel={user?.user_metadata?.access_level} 
            />
          </div>
        </SidebarContent>

        <SidebarFooter className="p-3 sm:p-4 flex-shrink-0 border-t border-border/20">
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
      <SidebarHeader className="p-4 lg:p-5 border-b border-border/20 flex-shrink-0">
        <SidebarBrand isCollapsed={false} />
      </SidebarHeader>

      <SidebarContent className="px-3 lg:px-4 py-4 lg:py-5 flex-1 min-h-0 max-h-full overflow-y-auto overscroll-contain scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border">
        <div className="space-y-4 lg:space-y-5 min-h-min pb-20">
          <SidebarNavigation isCollapsed={false} />
          <SidebarEducatorSection 
            isCollapsed={false} 
            userType={user?.user_metadata?.user_type} 
          />
          <SidebarAdminSection 
            isCollapsed={false} 
            userAccessLevel={user?.user_metadata?.access_level} 
          />
        </div>
      </SidebarContent>

      <SidebarFooter className="p-4 lg:p-5 flex-shrink-0 border-t border-border/20">
        <SidebarUserMenu isCollapsed={false} />
      </SidebarFooter>
    </Sidebar>
  );
}
