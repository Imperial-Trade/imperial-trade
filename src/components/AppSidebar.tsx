
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

export function AppSidebar() {
  const { user } = useAuth();
  const { state: sidebarState, setOpenMobile } = useSidebar();
  const isCollapsed = sidebarState === "collapsed";

  const handleSidebarClick = () => {
    // Close the sidebar when clicking inside it
    setOpenMobile(false);
  };

  return (
    <Sidebar 
      className="border-r-0 bg-background/80 backdrop-blur-xl"
      collapsible="offcanvas"
      variant="floating"
      onClick={handleSidebarClick}
    >
      <SidebarHeader className="p-4 border-b border-border/20">
        <SidebarBrand isCollapsed={isCollapsed} />
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarNavigation isCollapsed={isCollapsed} />
        <SidebarAdminSection 
          isCollapsed={isCollapsed} 
          userAccessLevel={user?.user_metadata?.access_level} 
        />
      </SidebarContent>

      <SidebarFooter className="p-4">
        <SidebarUserMenu isCollapsed={isCollapsed} />
      </SidebarFooter>
    </Sidebar>
  );
}
