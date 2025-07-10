
import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarTriggerButton } from "@/components/sidebar/SidebarTriggerButton";
import { Crown } from "lucide-react";
import LoadingSpinner from '@/components/layout/LoadingSpinner';
import { User } from '@supabase/supabase-js';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface DashboardHeaderProps {
  user: User | null;
}

function DashboardHeader({ user }: DashboardHeaderProps) {
  const { openMobile } = useSidebar();

  return (
    <header className="h-16 flex items-center justify-between px-6 bg-background/80 backdrop-blur-xl border-b border-border/50 sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <SidebarTriggerButton />
        <div className={`flex items-center gap-2 transition-all duration-300 ${
          openMobile ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100 scale-100'
        }`}>
          <Crown className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-amber-300 bg-clip-text text-transparent">
            IMPERIAL
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 text-sm text-foreground">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-foreground">Market Open</span>
        </div>
        {user && (
          <div className="text-sm text-foreground">
            Welcome, {user.user_metadata?.full_name || user.email}
          </div>
        )}
      </div>
    </header>
  );
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, session, loading, refreshSession } = useAuth();
  const [isValidating, setIsValidating] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const validateSession = async () => {
      if (!loading && !user) {
        navigate('/access-portal', { replace: true });
        return;
      }

      if (user && session) {
        try {
          await refreshSession();
        } catch (error) {
          console.error('Session validation failed:', error);
          navigate('/signin', { replace: true });
          return;
        }
      }

      setIsValidating(false);
    };

    validateSession();
  }, [user, session, loading, navigate, refreshSession]);

  if (loading || isValidating) {
    return <LoadingSpinner />;
  }

  if (!user || !session) {
    return <Navigate to="/access-portal" replace />;
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <DashboardHeader user={user} />
        
        <div className="flex-1 relative">
          <AppSidebar />
          <main className="w-full h-full overflow-auto bg-background text-foreground">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
