import { memo, ReactNode } from 'react';
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { WidgetSidebar } from "@/components/navigation/WidgetSidebar";
import { AdminArsenalSidebar } from "@/components/navigation/AdminArsenalSidebar";
import { Outlet, useLocation } from "react-router-dom";
import AppBar from "@/components/layout/AppBar";
import AuthenticatedAppBar from "@/components/dashboard/AuthenticatedAppBar";
import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary";
import { useSidebar } from "@/components/ui/sidebar";
import { useIsMobile, useIsTablet, useIsDesktop } from "@/hooks/use-mobile";
import { SharedHeader } from "@/components/shared/SharedHeader";
import { ComplianceFooter } from "@/components/compliance/ComplianceFooter";

// DashboardHeader replaced with SharedHeader component

function SidebarOverlay() {
  const {
    openMobile,
    setOpenMobile
  } = useSidebar();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();

  // Don't render overlay for mobile (uses Sheet)
  if (isMobile) return null;

  // For tablet and desktop, show custom overlay when open
  if (!openMobile) return null;
  return <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm" onClick={() => setOpenMobile(false)} />
      {/* Sidebar Content */}
      <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${isTablet ? 'w-72' : 'w-64'}`}>
        <div className="h-[100vh] max-h-[100vh] bg-background/95 backdrop-blur-xl border-r border-border/50 shadow-2xl flex flex-col">
          <AppSidebar />
        </div>
      </div>
    </>;
}
export default function Layout({
  children
}: {
  children: ReactNode;
}) {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const isJournalXXPage = location.pathname === '/dashboard/journal-xx' || location.pathname === '/dashboard/journal-xx-pro';
  const isMobile = useIsMobile();

  // For home page, use AppBar instead of sidebar
  if (isHomePage) {
    return <div className="min-h-screen bg-background">
        <ErrorBoundary componentName="AppBar">
          <AppBar />
        </ErrorBoundary>
        <main style={{ paddingTop: 'calc(64px + env(safe-area-inset-top))' }}>
          <ErrorBoundary componentName="Page Content">
            {children}
          </ErrorBoundary>
        </main>
      </div>;
  }

  // For dashboard pages, use sidebar layout
  return <SidebarProvider defaultOpen={false}>
      <div className={`h-screen min-h-screen w-full flex flex-col overflow-hidden ${isJournalXXPage ? '' : 'bg-background'}`}>
        {/* Authenticated Apple-style Navigation Bar - Desktop Only (Hidden on Journal XX) */}
        {!isJournalXXPage && (
          <ErrorBoundary componentName="Authenticated Navigation">
            <div className="hidden lg:block">
              <AuthenticatedAppBar />
            </div>
          </ErrorBoundary>
        )}

        {/* Mobile: Use existing Sheet-based sidebar - Hidden on Journal XX */}
        {isMobile && !isJournalXXPage && <ErrorBoundary componentName="Mobile Sidebar">
            <AppSidebar />
          </ErrorBoundary>}

        {/* Tablet & Desktop: Use custom overlay sidebar - Hidden on Journal XX */}
        {!isJournalXXPage && (
          <ErrorBoundary componentName="Sidebar Overlay">
            <SidebarOverlay />
          </ErrorBoundary>
        )}

        {/* Main content - scrollable when content is long (e.g. Admin Tools) */}
        <main data-scroll-root className={`w-full flex-1 min-h-0 overflow-y-auto ${isJournalXXPage ? '' : 'bg-background border-l border-border/10'} ${isJournalXXPage ? 'pt-0' : 'pt-0 lg:pt-20'}`}>
          <ErrorBoundary componentName="Page Content">
            <Outlet />
          </ErrorBoundary>
        </main>
        
        {/* Trading Arsenal Sidebar - Left side */}
        <ErrorBoundary componentName="Trading Arsenal Sidebar">
          <WidgetSidebar />
        </ErrorBoundary>
        
        {/* Admin Arsenal Sidebar - Right side - Only on Admin Tools page */}
        {location.pathname === '/dashboard/admin-tools' && <ErrorBoundary componentName="Admin Arsenal Sidebar">
            <AdminArsenalSidebar />
          </ErrorBoundary>}
        
        {/* Compliance Footer - Hidden on Journal XX */}
        {!isJournalXXPage && <ComplianceFooter />}
      </div>
    </SidebarProvider>;
}