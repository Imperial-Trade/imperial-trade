
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
  const { state: sidebarState } = useSidebar();
  const isCollapsed = sidebarState === "collapsed";

  return (
    <Sidebar 
      className="border-r border-sidebar-border bg-sidebar"
      collapsible="offcanvas"
      variant="floating"
    >
      <SidebarHeader className="p-4 border-b border-sidebar-border">
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
