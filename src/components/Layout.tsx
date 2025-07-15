import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/AppSidebar"
import { SidebarTriggerButton } from "@/components/sidebar/SidebarTriggerButton"
import { Crown, Bell } from "lucide-react"
import { Outlet, useLocation } from "react-router-dom"
import AppBar from "@/components/layout/AppBar"
import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary"
import { useSidebar } from "@/components/ui/sidebar"
import { useIsMobile, useIsTablet, useIsDesktop } from "@/hooks/use-mobile"
import { useAuth } from "@/contexts/AuthContext"
import { Badge } from "@/components/ui/badge"
import { PostHogTracker } from "@/components/analytics/PostHogTracker"

function DashboardHeader() {
  const { openMobile } = useSidebar();
  const { user } = useAuth();

  const getUserAccessLevel = () => {
    if (!user) return 'free';
    return (user.user_metadata?.access_level as string) || 'free';
  };

  const getAccessLevelDisplay = (level: string) => {
    const levels = {
      free: { label: 'Free', color: 'bg-gray-500' },
      user: { label: 'Member', color: 'bg-blue-500' },
      admin: { label: 'Admin', color: 'bg-red-500' }
    };
    return levels[level as keyof typeof levels] || levels.free;
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 bg-slate-900/95 backdrop-blur-xl border-b border-slate-700/50">
      <div className="flex items-center gap-4">
        <SidebarTriggerButton />
        <div className={`flex items-center gap-2 transition-opacity duration-300 ${openMobile ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <Crown className="h-6 w-6 text-amber-400" />
          <span className="text-xl font-bold text-white">
            IMPERIAL
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {user && (
          <>
            <div className="hidden md:flex flex-col items-end text-sm">
              <span className="text-white font-medium">
                Welcome back, {user.email?.split('@')[0] || 'User'}
              </span>
              <div className="flex items-center gap-2">
                <Badge className={`${getAccessLevelDisplay(getUserAccessLevel()).color} text-white text-xs`}>
                  {getAccessLevelDisplay(getUserAccessLevel()).label}
                </Badge>
              </div>
            </div>
            
            <Bell className="h-5 w-5 text-slate-300 hover:text-white cursor-pointer" />
          </>
        )}
        
        <div className="hidden md:flex items-center gap-2 text-sm text-slate-300">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          Market Open
        </div>
      </div>
    </header>
  );
}

function SidebarOverlay() {
  const { openMobile, setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();

  // Don't render overlay for mobile (uses Sheet)
  if (isMobile) return null;

  // For tablet and desktop, show custom overlay when open
  if (!openMobile) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm"
        onClick={() => setOpenMobile(false)}
      />
      {/* Sidebar Content */}
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

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const isHomePage = location.pathname === '/'
  const isMobile = useIsMobile()

  // For home page, use AppBar instead of sidebar
  if (isHomePage) {
    return (
      <div className="min-h-screen bg-background">
        <PostHogTracker />
        <ErrorBoundary componentName="AppBar">
          <AppBar />
        </ErrorBoundary>
        <main className="pt-16">
          <ErrorBoundary componentName="Page Content">
            {children}
          </ErrorBoundary>
        </main>
      </div>
    )
  }

  // For dashboard pages, use sidebar layout
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen w-full bg-background">
        <PostHogTracker />
        <ErrorBoundary componentName="Header">
          <DashboardHeader />
        </ErrorBoundary>

        {/* Mobile: Use existing Sheet-based sidebar */}
        {isMobile && (
          <ErrorBoundary componentName="Mobile Sidebar">
            <AppSidebar />
          </ErrorBoundary>
        )}

        {/* Tablet & Desktop: Use custom overlay sidebar */}
        <ErrorBoundary componentName="Sidebar Overlay">
          <SidebarOverlay />
        </ErrorBoundary>
        
        {/* Main content - always full width, independent of sidebar */}
        <main className="w-full min-h-screen pt-16 bg-background">
          <ErrorBoundary componentName="Page Content">
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </SidebarProvider>
  )
}
