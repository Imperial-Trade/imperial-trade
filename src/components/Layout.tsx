
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/AppSidebar"
import { SidebarTriggerButton } from "@/components/sidebar/SidebarTriggerButton"
import { Crown } from "lucide-react"
import { useLocation } from "react-router-dom"
import AppBar from "@/components/layout/AppBar"
import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary"
import { useSidebar } from "@/components/ui/sidebar"
import { useIsMobile, useIsTablet, useIsDesktop } from "@/hooks/use-mobile"
import { useEffect, useState } from "react"

function DashboardHeader() {
  const { openMobile } = useSidebar();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 bg-background/95 backdrop-blur-xl border-b border-border">
      <div className="flex items-center gap-4">
        <SidebarTriggerButton />
        <div className={`flex items-center gap-2 transition-opacity duration-300 ${openMobile ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <Crown className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-amber-300 bg-clip-text text-transparent">
            IMPERIAL
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
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
        <div className="h-full bg-background/95 backdrop-blur-xl border-r border-border/50 shadow-2xl flex flex-col">
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
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </SidebarProvider>
  )
}
