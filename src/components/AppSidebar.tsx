
import React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { SidebarNavigation } from "./sidebar/SidebarNavigation";
import { SidebarAdminSection } from "./sidebar/SidebarAdminSection";
import { SidebarFooterContent } from "./sidebar/SidebarFooterContent";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";

export function AppSidebar() {
  const { user, profile } = useAuth();
  const { state: sidebarState } = useSidebar();
  const isCollapsed = sidebarState === "collapsed";
  const isMobile = useIsMobile();

  if (!user) {
    return null;
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/" className="flex items-center">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <span className="text-xs font-bold">IT</span>
                </div>
                {!isCollapsed && (
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Imperial Trading</span>
                    <span className="truncate text-xs">Elite Signals</span>
                  </div>
                )}
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {isMobile ? (
          <div className="flex flex-col h-full">
            <SidebarNavigation 
              isCollapsed={false} 
            />
            <SidebarAdminSection 
              isCollapsed={false} 
            />
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <SidebarNavigation 
              isCollapsed={isCollapsed} 
            />
            <SidebarAdminSection 
              isCollapsed={isCollapsed} 
            />
          </div>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarFooterContent 
          isCollapsed={isCollapsed} 
          displayName={profile?.display_name} 
        />
      </SidebarFooter>
    </Sidebar>
  );
}
