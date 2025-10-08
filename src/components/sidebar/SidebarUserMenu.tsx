
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  SidebarMenu,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthorizationAware } from '@/hooks/useAuthorizationAware';
import { Bell, LogOut } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { DashboardUserRole } from '@/components/dashboard/DashboardUserRole';

interface SidebarUserMenuProps {
  isCollapsed: boolean;
}

export function SidebarUserMenu({ isCollapsed }: SidebarUserMenuProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { isAdmin, isEducator, isEducatorPlus, isModerator } = useAuthorizationAware();
  
  // Determine if user can access admin panel
  const canAccessAdminPanel = isAdmin || isEducatorPlus || isEducator || isModerator;
  
  // Get display name from user metadata or email
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User";

  const handleSignOut = async () => {
    await signOut();
  };
  
  // Handle profile click - redirect privileged users to admin panel
  const handleProfileClick = () => {
    if (canAccessAdminPanel) {
      navigate('/dashboard/admin');
    }
  };

  return (
    <div className="mt-auto border-t border-sidebar-border pt-4">
      <SidebarMenu>
        <SidebarMenuItem>
          {/* Main Profile Container with Context Menu */}
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <div className="flex items-center gap-2 px-2 py-2">
                {/* Left Side: Profile Section (clickable for privileged users) */}
                <div
                  onClick={handleProfileClick}
                  className={`flex items-center gap-3 flex-1 ${
                    canAccessAdminPanel 
                      ? 'cursor-pointer hover:bg-sidebar-accent rounded-md px-2 py-1 transition-colors' 
                      : 'px-2 py-1'
                  }`}
                >
                  <Avatar className="h-10 w-10 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
                      {user?.email?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold text-sidebar-foreground">
                        {displayName}
                      </span>
                      <DashboardUserRole />
                    </div>
                  )}
                </div>

                {/* Right Side: Icons (Bell + Theme Toggle) */}
                {!isCollapsed && (
                  <div className="flex items-center gap-1">
                    {/* Notification Bell (placeholder - not functional yet) */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-8 h-8 p-0 text-muted-foreground hover:text-foreground hover:bg-accent"
                      aria-label="Notifications"
                    >
                      <Bell className="h-4 w-4" />
                    </Button>
                    
                    {/* Theme Toggle */}
                    <ThemeToggle isCollapsed={false} />
                  </div>
                )}
              </div>
            </ContextMenuTrigger>
            
            {/* Context Menu for Settings and Log out (right-click) */}
            <ContextMenuContent className="w-56 bg-popover border border-border">
              <ContextMenuItem asChild>
                <Link to="/dashboard/settings" className="flex items-center text-popover-foreground cursor-pointer">
                  Settings
                </Link>
              </ContextMenuItem>
              <ContextMenuItem 
                onClick={handleSignOut}
                className="text-popover-foreground cursor-pointer"
              >
                Log out
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        </SidebarMenuItem>
      </SidebarMenu>
      
      {/* Visible Sign Out Button */}
      {!isCollapsed && (
        <div className="px-2 mt-3">
          <Button
            onClick={handleSignOut}
            variant="ghost"
            className="w-full justify-start gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 transition-all duration-200"
            size="sm"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm font-medium">Sign Out</span>
          </Button>
        </div>
      )}
    </div>
  );
}
