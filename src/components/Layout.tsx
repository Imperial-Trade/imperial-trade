
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/AppSidebar"
import { SidebarTriggerButton } from "@/components/sidebar/SidebarTriggerButton"
import { Crown } from "lucide-react"
import { useLocation } from "react-router-dom"
import AppBar from "@/components/layout/AppBar"
import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary"

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const isHomePage = location.pathname === '/'

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

  // For other pages, use the overlay sidebar layout
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex flex-col w-full bg-background">
        {/* Fixed Header */}
        <ErrorBoundary componentName="Header">
          <header className="h-16 flex items-center justify-between px-6 bg-background/95 backdrop-blur-xl border-b border-border sticky top-0 z-50">
            <div className="flex items-center gap-4">
              <SidebarTriggerButton />
              <div className="flex items-center gap-2">
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
        </ErrorBoundary>

        {/* Main Content Area with Sidebar Overlay */}
        <div className="flex-1 relative">
          <ErrorBoundary componentName="Sidebar">
            <AppSidebar />
          </ErrorBoundary>
          <main className="w-full h-full overflow-auto bg-background">
            <ErrorBoundary componentName="Page Content">
              {children}
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
