
import React from 'react';
import { Link } from 'react-router-dom';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { Settings, LogOut, ChevronsUpDown } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

interface SidebarUserMenuProps {
  isCollapsed: boolean;
}

export function SidebarUserMenu({ isCollapsed }: SidebarUserMenuProps) {
  const { user, profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  // Get display name with fallback logic
  const displayName = profile?.display_name || profile?.real_name || user?.email?.split('@')[0] || 'User';
  
  // Get user role/type display
  const getRoleDisplay = () => {
    if (profile?.access_level === 'admin') return 'Admin';
    if (profile?.access_level === 'moderator') return 'Moderator';
    if (profile?.user_type === 'educator') return 'Educator';
    return 'Member';
  };

  const userInitials = displayName[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U";

  return (
    <div className="mt-auto border-t border-sidebar-border pt-4">
      {/* Theme Toggle Section */}
      <div className="px-3 py-2">
        <ThemeToggle isCollapsed={isCollapsed} />
      </div>
      
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                {!isCollapsed && (
                  <>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold text-sidebar-foreground">
                        {displayName}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {getRoleDisplay()}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4" />
                  </>
                )}
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg bg-popover border border-border"
              side={isCollapsed ? "right" : "bottom"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold text-popover-foreground">
                      {displayName}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {getRoleDisplay()}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/dashboard/settings" className="text-popover-foreground">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-popover-foreground">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </div>
  );
}
