
import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Crown } from "lucide-react";
import LoadingSpinner from '@/components/layout/LoadingSpinner';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, session, loading, refreshSession } = useAuth();
  const [isValidating, setIsValidating] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const validateSession = async () => {
      if (!loading && !user) {
        // No user found, redirect to access portal
        navigate('/access-portal', { replace: true });
        return;
      }

      if (user && session) {
        // Validate session is still active
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

  const getUserAccessLevel = () => {
    return (user.user_metadata?.access_level as string) || 'free';
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background text-foreground">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="text-primary hover:text-primary/80 transition-colors" />
            <div className="flex items-center gap-2">
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
            <div className="text-sm text-foreground">
              Welcome, {user.user_metadata?.full_name || user.email}
            </div>
          </div>
        </header>

        <div className="flex w-full pt-16">
          <AppSidebar />
          <main className="flex-1 overflow-auto bg-background text-foreground">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
