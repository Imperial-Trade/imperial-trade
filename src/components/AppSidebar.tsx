
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
        className="border-r-0 bg-background/95 backdrop-blur-xl min-h-0 h-full w-full max-w-full flex flex-col"
        collapsible="offcanvas"
        variant="floating"
      >
        <SidebarHeader className="p-4 border-b border-border/20 flex-shrink-0">
          <SidebarBrand isCollapsed={false} />
        </SidebarHeader>

        <SidebarContent className="px-3 py-4 flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border">
          <div className="space-y-4 min-h-min">
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

        <SidebarFooter className="p-4 flex-shrink-0 border-t border-border/20">
          <SidebarUserMenu isCollapsed={false} />
        </SidebarFooter>
      </Sidebar>
    );
  }

  // For tablet and desktop, use proper Sidebar component with no collapsing
  return (
    <Sidebar 
      className="border-r-0 bg-background/95 backdrop-blur-xl min-h-0 h-full w-full max-w-full flex flex-col"
      collapsible="none"
      variant="sidebar"
    >
      <SidebarHeader className="p-4 border-b border-border/20 flex-shrink-0">
        <SidebarBrand isCollapsed={false} />
      </SidebarHeader>

      <SidebarContent className="px-3 py-4 flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border">
        <div className="space-y-4 min-h-min">
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

      <SidebarFooter className="p-4 flex-shrink-0 border-t border-border/20">
        <SidebarUserMenu isCollapsed={false} />
      </SidebarFooter>
    </Sidebar>
  );
}
