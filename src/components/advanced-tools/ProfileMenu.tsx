import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { User, Settings, LogOut, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface ProfileMenuProps {
  children: React.ReactNode;
}

export const ProfileMenu: React.FC<ProfileMenuProps> = ({ children }) => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Signed out successfully');
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  const getAccessLevelInfo = (level: string) => {
    switch (level) {
      case 'admin':
        return { label: 'Admin', variant: 'destructive' as const, icon: Shield };
      case 'educator':
        return { label: 'Educator', variant: 'default' as const, icon: User };
      case 'member':
        return { label: 'Member', variant: 'secondary' as const, icon: User };
      default:
        return { label: 'Free', variant: 'outline' as const, icon: User };
    }
  };

  const accessInfo = getAccessLevelInfo(profile?.access_level || 'free');
  const AccessIcon = accessInfo.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-64 glass-dark backdrop-blur-xl border-white/10 mb-2" 
        align="end"
        side="top"
      >
        <DropdownMenuLabel className="text-white">
          <div className="flex flex-col space-y-2">
            <p className="text-sm font-medium leading-none">
              {user?.user_metadata?.full_name || 'User'}
            </p>
            <p className="text-xs leading-none text-gray-400">
              {user?.email}
            </p>
            <Badge variant={accessInfo.variant} className="w-fit flex items-center gap-1">
              <AccessIcon className="w-3 h-3" />
              {accessInfo.label}
            </Badge>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem 
          onClick={() => navigate('/dashboard/profile')}
          className="text-gray-300 hover:text-white hover:bg-white/5 cursor-pointer"
        >
          <User className="mr-2 h-4 w-4" />
          <span>View Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => navigate('/dashboard/settings')}
          className="text-gray-300 hover:text-white hover:bg-white/5 cursor-pointer"
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem 
          onClick={handleSignOut}
          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
