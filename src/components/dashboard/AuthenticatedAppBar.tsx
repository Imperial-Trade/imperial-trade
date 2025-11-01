import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Crown,
  Menu,
  TrendingUp,
  Bell,
  GraduationCap,
  Video,
  Users,
  Handshake,
  Settings,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { DashboardUserRole } from "@/components/dashboard/DashboardUserRole";
import { supabase } from "@/integrations/supabase/client";
import { getAcademyAppUrl, getOrderFlowAppUrl } from "@/utils/environment";
import { cn } from "@/lib/utils";

const AuthenticatedAppBar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const navigationItems = [
    {
      to: "/dashboard/signal-stream",
      icon: Bell,
      label: "Pattern Stream",
    },
    {
      to: getAcademyAppUrl(),
      icon: GraduationCap,
      label: "Education",
      external: true,
    },
    {
      to: "/dashboard/live",
      icon: Video,
      label: "Live Session",
    },
    {
      to: getOrderFlowAppUrl(),
      icon: Users,
      label: "Community",
      external: true,
    },
    {
      to: "/dashboard/advanced-tools",
      icon: TrendingUp,
      label: "Tools",
    },
  ];

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const getInitials = (email: string) => {
    return email
      .split('@')[0]
      .split('.')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/signin');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-[200] flex items-center justify-center px-6 nav-glass-effect border-b transition-all duration-300",
      isCollapsed ? "h-16" : "h-20"
    )}>
      <div className="w-full max-w-7xl flex items-center justify-between">
        {/* Logo */}
        <Link to="/dashboard/home" className="flex items-center gap-2">
          <Crown className="h-6 w-6 text-primary" />
          <span className="text-xl imperial-tech-font">IMPERIAL</span>
        </Link>

        {/* Desktop Navigation - Compact pills */}
        {!isCollapsed && (
          <nav className="hidden lg:flex items-center gap-1 nav-glass-effect rounded-2xl p-1">
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.to;
              
              return item.external ? (
                <Button
                  key={item.to}
                  variant="ghost"
                  className={cn(
                    "flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-xl px-3 py-2 transition-all duration-200",
                    isActive && "bg-primary/15 text-primary"
                  )}
                  onClick={() => window.location.href = item.to}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              ) : (
                <Link key={item.to} to={item.to}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-xl px-3 py-2 transition-all duration-200",
                      isActive && "bg-primary/15 text-primary"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>
        )}

        {/* Desktop Theme Toggle & Collapse Button */}
        <div className="hidden lg:flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-8 w-8"
            aria-label={isCollapsed ? "Expand header" : "Collapse header"}
          >
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Mobile & Tablet Navigation */}
        <div className="lg:hidden">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 text-primary hover:text-primary/80 active:scale-95 transition-all duration-200"
                aria-label="Open navigation menu"
              >
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-[90vw] max-w-md nav-glass-effect border-r overflow-y-auto"
            >
              <SheetHeader className="border-b border-border/50 pb-6">
                <SheetTitle className="flex items-center gap-2 text-left">
                  <Crown className="h-6 w-6 text-primary" />
                  <span className="text-xl imperial-tech-font">IMPERIAL</span>
                </SheetTitle>
              </SheetHeader>

              <nav className="flex flex-col gap-3 mt-8 pb-8">
                {/* Main Navigation Items */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground px-2">
                    Platform Features
                  </h3>
                  {navigationItems.map((item) => {
                    const NavContent = (
                      <>
                        <item.icon className="h-6 w-6 text-primary flex-shrink-0" />
                        <div className="flex-1 text-left">
                          <span className="text-base font-medium block leading-tight">
                            {item.label}
                          </span>
                        </div>
                      </>
                    );

                    return item.external ? (
                      <button
                        key={item.to}
                        onClick={() => {
                          window.location.href = item.to;
                          closeMobileMenu();
                        }}
                        className="flex items-center gap-4 p-4 min-h-[64px] rounded-xl transition-all duration-200 hover:bg-primary/10 text-foreground border border-border/50 active:scale-98 touch-manipulation"
                        aria-label={`Navigate to ${item.label}`}
                      >
                        {NavContent}
                      </button>
                    ) : (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={closeMobileMenu}
                        className="flex items-center gap-4 p-4 min-h-[64px] rounded-xl transition-all duration-200 hover:bg-primary/10 text-foreground border border-border/50 active:scale-98 touch-manipulation"
                        aria-label={`Navigate to ${item.label}`}
                      >
                        {NavContent}
                      </Link>
                    );
                  })}
                </div>

                {/* User Info Section */}
                <div className="mt-8 pt-6 border-t border-border/50 space-y-4">
                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        {user?.email?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{user?.email}</p>
                        <DashboardUserRole />
                      </div>
                    </div>
                  </div>
                  <Link to="/dashboard/settings" onClick={closeMobileMenu}>
                    <Button className="w-full">
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Button>
                  </Link>
                  <Button 
                    onClick={() => {
                      closeMobileMenu();
                      handleSignOut();
                    }} 
                    variant="destructive"
                    className="w-full"
                  >
                    Sign out
                  </Button>
                </div>

                {/* Theme Toggle Section */}
                <div className="mt-6 pt-4 border-t border-border/50">
                  <div className="flex justify-center">
                    <ThemeToggle />
                  </div>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <style>{`
        /* AI Tech Font Styles */
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
      `}</style>
    </header>
  );
};

export default AuthenticatedAppBar;
