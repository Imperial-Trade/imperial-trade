
import React, { useState } from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/AppSidebar"
import { SidebarTriggerButton } from "@/components/sidebar/SidebarTriggerButton"
import { Crown, Bell, Menu, GraduationCap, Video, Users, TrendingUp, User, Settings, BarChart3, Shield, Plus, ChevronUp, ChevronDown, LogOut } from "lucide-react"
import { Link, Outlet, useLocation } from "react-router-dom"
import AppBar from "@/components/layout/AppBar"
import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary"
import { useSidebar } from "@/components/ui/sidebar"
import { useIsMobile, useIsTablet, useIsDesktop } from "@/hooks/use-mobile"
import { useAuth } from "@/contexts/AuthContext"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ThemeToggle } from "@/components/theme/ThemeToggle"

function DashboardHeader() {
  const { openMobile } = useSidebar();
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();

  const getUserAccessLevel = () => {
    if (!user) return 'free';
    
    // Check if user is educator
    if (user.user_metadata?.role === 'educator' || user.user_metadata?.user_type === 'educator') {
      return 'educator';
    }
    
    return (user.user_metadata?.access_level as string) || 'free';
  };

  const getAccessLevelDisplay = (level: string) => {
    const levels = {
      free: { label: 'Free', color: 'text-green-500' },
      user: { label: 'Member', color: 'text-green-500' },
      educator: { label: 'Educator', color: 'text-blue-500' },
      admin: { label: 'Admin', color: 'text-red-500' }
    };
    return levels[level as keyof typeof levels] || levels.free;
  };

  // Dashboard navigation items
  const navigationItems = [
    {
      to: "/dashboard/signal-stream",
      icon: Bell,
      label: "Signals",
      description: "Real-time trading signals and alerts",
      features: ["Live Alerts", "Custom Indicators", "Signal History"]
    },
    {
      to: "/dashboard/education",
      icon: GraduationCap,
      label: "Education", 
      description: "Comprehensive trading education platform",
      features: ["Video Courses", "Live Webinars", "Trading Guides"]
    },
    {
      to: "/dashboard/live",
      icon: Video,
      label: "Live Sessions",
      description: "Interactive live trading sessions", 
      features: ["Market Analysis", "Live Q&A", "Trading Psychology"]
    },
    {
      to: "/dashboard/forum",
      icon: Users,
      label: "Community",
      description: "Connect with fellow traders",
      features: ["Discussions", "Strategy Sharing", "Expert Advice"]
    },
    {
      to: "/dashboard/advanced-tools",
      icon: TrendingUp,
      label: "Tools",
      description: "Professional trading tools and analytics",
      features: ["Risk Calculator", "Portfolio Analysis", "Market Scanner"]
    }
  ];

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 ${isHeaderCollapsed ? 'h-12' : 'h-20'} flex items-center justify-center px-6 transition-all duration-300 ${
      isHeaderCollapsed 
        ? 'backdrop-blur-md bg-background/20 border-b border-border/20' 
        : 'backdrop-blur-xl border-b border-border/50 bg-background/80'
    }`}>
      <div className={`w-full max-w-7xl flex items-center ${isHeaderCollapsed ? 'justify-end' : 'justify-between'}`}>
        
        {/* Logo - Hide when collapsed */}
        {!isHeaderCollapsed && (
          <Link to="/dashboard/home" className="flex items-center gap-2">
            <Crown className="h-6 w-6 text-primary" />
            <span className="text-xl imperial-tech-font">IMPERIAL</span>
          </Link>
        )}

        {/* Desktop Navigation */}
        {!isHeaderCollapsed && (
          <nav className="hidden lg:flex items-center gap-1 bg-muted/30 rounded-2xl p-1 backdrop-blur-sm border border-border/50">
          {navigationItems.map(item => {
            const isActive = location.pathname === item.to;
            return (
              <div key={item.to} className="relative" onMouseEnter={() => setActiveDropdown(item.label)} onMouseLeave={() => setActiveDropdown(null)}>
                <Link to={item.to}>
                  <Button 
                    variant="ghost" 
                    className={`flex items-center gap-2 text-sm font-medium rounded-xl px-3 py-2 transition-all duration-200 ${
                      isActive 
                        ? 'bg-primary/10 text-primary border border-primary/20' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/80'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              
                {/* Apple/Stripe style dropdown */}
                {activeDropdown === item.label && (
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-80 bg-background/95 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl p-6 animate-fade-in-up z-50">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">{item.label}</h3>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                      <div className="space-y-2">
                        {item.features.map((feature, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                            {feature}
                          </div>
                        ))}
                      </div>
                      <Link to={item.to}>
                        <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl">
                          Explore {item.label}
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          </nav>
        )}

        {/* Desktop Actions & User Info - Hide when collapsed */}
        {!isHeaderCollapsed && (
          <div className="hidden lg:flex items-center gap-4">
            {/* Live Market Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-green-700 dark:text-green-400">Market Open</span>
            </div>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* User Info */}
            {user && (
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-end text-sm">
                  <span className="font-medium text-foreground">
                    {user.user_metadata?.first_name && user.user_metadata?.last_name 
                      ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
                      : user.user_metadata?.full_name || user.user_metadata?.display_name || user.email?.split('@')[0] || 'User'}
                  </span>
                  <Badge className={`${getAccessLevelDisplay(getUserAccessLevel()).color} text-xs font-medium border-0 bg-transparent px-0`}>
                    {getAccessLevelDisplay(getUserAccessLevel()).label}
                  </Badge>
                </div>
                <Bell className="h-5 w-5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors" />
                
                {/* Profile Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="flex items-center gap-1 p-1 h-auto ml-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 border border-primary/20">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-background/95 backdrop-blur-xl border border-border/50 shadow-2xl">
                    {/* User Menu Items */}
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard/progress" className="flex items-center gap-2 cursor-pointer">
                        <BarChart3 className="h-4 w-4" />
                        My Progress
                      </Link>
                    </DropdownMenuItem>
                    
                    {/* Educator Menu Items */}
                    {(user.user_metadata?.role === 'educator' || user.user_metadata?.user_type === 'educator') && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link to="/live-sessions" className="flex items-center gap-2 cursor-pointer">
                            <Video className="h-4 w-4" />
                            Manage Sessions
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/trade-alerts" className="flex items-center gap-2 cursor-pointer">
                            <TrendingUp className="h-4 w-4" />
                            Trade Alerts
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    
                    {/* Admin Menu Items */}
                    {(getUserAccessLevel() === 'admin' || user.user_metadata?.role === 'admin') && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link to="/dashboard/administration" className="flex items-center gap-2 cursor-pointer">
                            <Settings className="h-4 w-4" />
                            Administration
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/dashboard/admin" className="flex items-center gap-2 cursor-pointer">
                            <Shield className="h-4 w-4" />
                            Admin Panel
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    
                    {/* Logout */}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={signOut}
                      className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        )}

        {/* Menu Button - Always visible, rightmost position when collapsed */}
        <div className="hidden lg:flex">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
            className={`h-8 w-8 rounded-full hover:bg-muted/50 transition-all duration-200 ${
              isHeaderCollapsed ? 'ml-auto' : 'ml-2'
            }`}
            title={isHeaderCollapsed ? "Expand header" : "Collapse header"}
          >
            {isHeaderCollapsed ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            ) : (
              <ChevronUp className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            )}
          </Button>
        </div>

        {/* Mobile Menu */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden text-primary hover:text-primary/80">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Open navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 bg-background/95 backdrop-blur-xl">
            <SheetHeader className="border-b border-border/50 pb-6">
              <SheetTitle className="flex items-center gap-2 text-left">
                <Crown className="h-6 w-6 text-primary" />
                <span className="text-xl imperial-tech-font">IMPERIAL</span>
              </SheetTitle>
            </SheetHeader>

            <nav className="flex flex-col gap-2 mt-8">
              {navigationItems.map(item => {
                const isActive = location.pathname === item.to;
                return (
                  <div key={item.to} className="space-y-2">
                    <Link 
                      to={item.to} 
                      onClick={closeMobileMenu} 
                      className={`flex items-center gap-3 p-4 rounded-xl transition-all duration-200 border ${
                        isActive 
                          ? 'bg-primary/10 border-primary/20 text-primary' 
                          : 'hover:bg-primary/10 text-foreground border-border/50'
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      <div>
                        <span className="text-base font-medium block">{item.label}</span>
                        <span className="text-sm text-muted-foreground">{item.description}</span>
                      </div>
                    </Link>
                  </div>
                );
              })}

              <div className="mt-6 pt-6 border-t border-border/50 space-y-4">
                <div className="flex justify-center">
                  <ThemeToggle />
                </div>
                {user && (
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">
                      {user.user_metadata?.first_name && user.user_metadata?.last_name 
                        ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
                        : user.user_metadata?.full_name || user.user_metadata?.display_name || user.email?.split('@')[0] || 'User'}
                    </p>
                    <Badge className={`${getAccessLevelDisplay(getUserAccessLevel()).color} text-xs font-medium mt-1 border-0 bg-transparent px-0`}>
                      {getAccessLevelDisplay(getUserAccessLevel()).label}
                    </Badge>
                  </div>
                )}
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      <style>{`
        /* Imperial Tech Font Styles */
        .imperial-tech-font {
          font-family: 'Orbitron', 'Courier New', monospace;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          background: linear-gradient(135deg, #e6d3b3, #c09a58);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-shadow: 0 0 20px rgba(192, 154, 88, 0.4);
        }

        /* Load Orbitron font */
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');

        /* Dropdown animations */
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px) translateX(-50%);
          }
          to {
            opacity: 1;
            transform: translateY(0) translateX(-50%);
          }
        }

        .animate-fade-in-up {
          animation: fadeInUp 0.2s ease-out;
        }
      `}</style>
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
        <main className="w-full min-h-screen pt-20 bg-background">
          <ErrorBoundary componentName="Page Content">
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </SidebarProvider>
  )
}
