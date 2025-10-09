
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Crown,
  Info,
  Briefcase,
  Star,
  Menu,
  LayoutDashboard,
  TrendingUp,
  Bell,
  GraduationCap,
  Video,
  Users,
  Handshake,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const AppBar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();
  const isAccountRequestPage = location.pathname === "/account-request";
  const isSigninPage = location.pathname === "/signin";
  const isResetPasswordPage = false; // No longer used since reset is handled by isolated flow
  const { user, loading } = useAuth();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const navigationItems = [
    {
      to: "/advanced-tools",
      icon: TrendingUp,
      label: "Advanced Tools",
      description: "Advanced trading tools and analytics",
      features: ["Risk Calculator", "Portfolio Analysis", "Market Scanner"],
    },
    {
      to: "/signals",
      icon: Bell,
      label: "Signals",
      description: "Real-time trading signals and alerts",
      features: ["Live Alerts", "Custom Indicators", "Signal History"],
    },
    {
      to: "/education",
      icon: GraduationCap,
      label: "Education",
      description: "Comprehensive trading education platform",
      features: ["Video Courses", "Live Webinars", "Trading Guides"],
    },
    {
      to: "/live-sessions",
      icon: Video,
      label: "Live Sessions",
      description: "Interactive live trading sessions",
      features: ["Market Analysis", "Live Q&A", "Trading Psychology"],
    },
    {
      to: "/community-forum",
      icon: Users,
      label: "Community Forum",
      description: "Connect with fellow traders",
      features: ["Discussions", "Strategy Sharing", "Expert Advice"],
    },
    {
      to: "/ib-partnership-new",
      icon: Handshake,
      label: "IB Partnership",
      description: "Institutional broker partnerships",
      features: ["Revenue Share", "White Label", "API Access"],
    },
  ];

  // During password reset page, redirect all navigation to safe landing page
  const getSafeNavigation = (item: typeof navigationItems[0]) => {
    return isResetPasswordPage ? "/" : item.to;
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  // Show "Get Started" by default, "Dashboard" when authenticated (except during password reset)
  const renderAuthButton = () => {
    // During password reset, always show unauthenticated buttons
    if (isResetPasswordPage) {
      return (
        <div className="flex gap-2">
          <Link to="/account-request">
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Get Started
            </Button>
          </Link>
        </div>
      );
    }

    if (user) {
      return (
        <Link to="/dashboard/home">
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2"
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Button>
        </Link>
      );
    }

    // Don't show Get Started button if already on account request page or signin page
    if (isAccountRequestPage || isSigninPage) {
      return null;
    }

    return (
      <div className="flex gap-2">
        <Link to="/account-request">
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Get Started
          </Button>
        </Link>
        <Link to="/signin">
          <Button
            size="sm"
            variant="outline"
            className="border-primary text-primary hover:bg-primary/10"
          >
            Sign In
          </Button>
        </Link>
      </div>
    );
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 h-20 flex items-center justify-center px-6 ${
        isAccountRequestPage
          ? ""
          : isSigninPage
          ? "bg-transparent"
          : "nav-glass-effect border-b"
      }`}
    >
      <div
        className={`w-full max-w-7xl flex items-center ${
          isSigninPage ? "justify-between" : "justify-between"
        }`}
      >
        {/* Go back button for signin page */}
        {isSigninPage && (
          <Link
            to="/"
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <span className="text-lg">←</span>
            <span className="text-sm font-medium">Go back</span>
          </Link>
        )}

        {/* Logo - hide on signin page */}
        {!isSigninPage && (
          <Link to="/" className="flex items-center gap-2">
            <Crown className="h-6 w-6 text-primary" />
            <span className="text-xl imperial-tech-font">IMPERIAL</span>
          </Link>
        )}

        {/* Desktop Navigation - Compact - show on signin page but simplified */}
        {!isSigninPage ? (
          <nav className="hidden lg:flex items-center gap-1 nav-glass-effect rounded-2xl p-1">
            {navigationItems.map((item) => (
              <div
                key={item.to}
                className="relative"
                onMouseEnter={() => setActiveDropdown(item.label)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <Link to={getSafeNavigation(item)}>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-xl px-3 py-2 transition-all duration-200"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>

                {/* Apple/Stripe style dropdown */}
                {activeDropdown === item.label && (
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-80 nav-glass-effect rounded-2xl shadow-2xl p-6 animate-fade-in-up z-50">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">
                          {item.label}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                      <div className="space-y-2">
                        {item.features.map((feature, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-sm text-muted-foreground"
                          >
                            <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                            {feature}
                          </div>
                        ))}
                      </div>
                       <Link to={getSafeNavigation(item)}>
                        <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl">
                          Explore {item.label}
                        </Button>
                       </Link>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>
        ) : (
          <nav className="hidden lg:flex items-center gap-1 nav-glass-effect rounded-2xl p-1">
            {navigationItems.map((item) => (
              <Link key={item.to} to={getSafeNavigation(item)}>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-xl px-3 py-2 transition-all duration-200"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>
        )}

        {/* Desktop Auth & Theme Toggle */}
        <div
          className={`hidden lg:flex items-center gap-2 ${
            isSigninPage ? "mr-4" : ""
          }`}
        >
          <ThemeToggle />
          {renderAuthButton()}
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
                  {navigationItems.map((item) => (
                    <Link
                      key={item.to}
                      to={getSafeNavigation(item)}
                      onClick={closeMobileMenu}
                      className="flex items-center gap-4 p-4 min-h-[64px] rounded-xl transition-all duration-200 hover:bg-primary/10 text-foreground border border-border/50 active:scale-98 touch-manipulation"
                      aria-label={`Navigate to ${item.label}`}
                    >
                      <item.icon className="h-6 w-6 text-primary flex-shrink-0" />
                      <div className="flex-1 text-left">
                        <span className="text-base font-medium block leading-tight">
                          {item.label}
                        </span>
                        <span className="text-sm text-muted-foreground leading-tight">
                          {item.description}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Authentication Section */}
                <div className="mt-8 pt-6 border-t border-border/50 space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground px-2">
                    Account Access
                  </h3>
                  
                   {user && !isResetPasswordPage ? (
                     <div className="space-y-3">
                       <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                         <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                             {user.email?.[0]?.toUpperCase() || 'U'}
                           </div>
                           <div>
                             <p className="font-medium text-sm">{user.email}</p>
                             <p className="text-xs text-muted-foreground">Welcome back!</p>
                           </div>
                         </div>
                       </div>
                       <Link to="/dashboard/home" onClick={closeMobileMenu}>
                         <Button
                           size="lg"
                           className="w-full min-h-[56px] bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-3 touch-manipulation active:scale-98 transition-all duration-200"
                           aria-label="Go to Dashboard"
                         >
                           <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
                           Go to Dashboard
                         </Button>
                       </Link>
                     </div>
                   ) : (
                     <div className="space-y-3">
                       {!isAccountRequestPage && (
                         <Link to="/account-request" onClick={closeMobileMenu}>
                           <Button
                             size="lg"
                             className="w-full min-h-[56px] bg-primary hover:bg-primary/90 text-primary-foreground font-semibold touch-manipulation active:scale-98 transition-all duration-200"
                             aria-label="Get Started - Request Account"
                           >
                             Get Started
                           </Button>
                         </Link>
                       )}
                       {!isSigninPage && !isResetPasswordPage && (
                         <Link to="/signin" onClick={closeMobileMenu}>
                           <Button
                             size="lg"
                             variant="outline"
                             className="w-full min-h-[56px] border-primary text-primary hover:bg-primary/10 font-semibold touch-manipulation active:scale-98 transition-all duration-200"
                             aria-label="Sign In to Account"
                           >
                             Sign In
                           </Button>
                         </Link>
                       )}
                     </div>
                  )}
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
};

export default AppBar;
