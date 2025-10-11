
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SidebarMenu,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthorizationAware } from '@/hooks/useAuthorizationAware';
import { User, LogOut, Settings as SettingsIcon } from 'lucide-react';
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
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      navigate('/signin');
    }
  };
  
  // Handle profile click - redirect privileged users to admin panel
  const handleProfileClick = () => {
    if (canAccessAdminPanel) {
      navigate('/dashboard/admin');
    }
  };

  return (
    <div className="w-full border-t border-sidebar-border pt-4 space-y-3">
      <SidebarMenu>
        <SidebarMenuItem>
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

            {/* Right Side: Profile Icon + Theme Toggle */}
            {!isCollapsed && (
              <div className="flex items-center gap-1">
                {/* Profile Icon with Settings Dropdown */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-8 h-8 p-0 text-muted-foreground hover:text-foreground hover:bg-accent"
                      aria-label="Profile Settings"
                    >
                      <User className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-48 p-2 bg-popover border border-border"
                    align="end"
                    side="top"
                  >
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-2 text-sm"
                        onClick={() => navigate('/dashboard/settings')}
                      >
                        <SettingsIcon className="h-4 w-4" />
                        <span>Settings</span>
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
                
                {/* Theme Toggle */}
                <ThemeToggle isCollapsed={false} />
              </div>
            )}
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
      
      {/* Visible Sign Out Button */}
      {!isCollapsed && (
        <Button
          onClick={handleSignOut}
          variant="ghost"
          className="w-full justify-start gap-2 mx-2 text-red-500 hover:text-red-400 hover:bg-red-500/10 border border-red-500/30 transition-all duration-200"
          size="sm"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-sm font-medium">Sign Out</span>
        </Button>
      )}
    </div>
  );
}
