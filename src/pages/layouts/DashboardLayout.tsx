
import React, { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarTriggerButton } from "@/components/sidebar/SidebarTriggerButton";
import { Crown } from "lucide-react";
import LoadingSpinner from "@/components/layout/LoadingSpinner";
import { useSidebar } from "@/components/ui/sidebar";
import { User } from "@supabase/supabase-js";
import { useIsMobile, useIsTablet } from "@/hooks/use-mobile";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface DashboardHeaderProps {
  user: User | null;
}

function DashboardHeader({ user }: DashboardHeaderProps) {
  const { openMobile } = useSidebar();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 bg-background/95 backdrop-blur-xl border-b border-border/50">
      <div className="flex items-center gap-4">
        <SidebarTriggerButton />
        <div
          className={`flex items-center gap-2 transition-all duration-300 ${
            openMobile
              ? "opacity-0 pointer-events-none scale-95"
              : "opacity-100 scale-100"
          }`}
        >
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

function DesktopSidebarOverlay() {
  const { openMobile, setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  // Only render on desktop and tablet (not mobile)
  if (isMobile) return null;

  if (!openMobile) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm"
        onClick={() => setOpenMobile(false)}
      />
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${
        isTablet ? 'w-72' : 'w-64'
      }`}>
        <div className="h-full bg-background/95 backdrop-blur-xl border-r border-border/50 shadow-2xl">
          <AppSidebar />
        </div>
      </div>
    </>
  );
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, session, loading, refreshSession } = useAuth();
  const [isValidating, setIsValidating] = useState(true);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    const validateSession = async () => {
      if (!loading && !user) {
        navigate("/access-portal", { replace: true });
        return;
      }

      if (user && session) {
        try {
          await refreshSession();
        } catch (error) {
          console.error("Session validation failed:", error);
          navigate("/signin", { replace: true });
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
      <div className="min-h-screen bg-background text-foreground w-full">
        {/* Fixed Header - Always stays at top */}
        <DashboardHeader user={user} />
        
        {/* Mobile: Use existing Sheet-based sidebar */}
        {isMobile && <AppSidebar />}

        {/* Desktop & Tablet: Use custom overlay sidebar */}
        <DesktopSidebarOverlay />
        
        {/* Main Content - Full width, independent of sidebar state */}
        <main className="w-full min-h-screen pt-16 bg-background text-foreground">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
