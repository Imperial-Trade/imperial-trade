
import { useState } from "react";
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
  const isAccountRequestStatusPage = location.pathname === "/account-request-status";
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
              className="glass-button-primary"
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
      <div className="flex gap-1 xl:gap-2">
        <Link to="/account-request">
          <Button
            size="sm"
            className="glass-button-primary text-xs lg:text-sm px-2 lg:px-3"
          >
            Get Started
          </Button>
        </Link>
        <Link to="/signin">
          <Button
            size="sm"
            className="glass-button-outline text-xs lg:text-sm px-2 lg:px-3"
          >
            Sign In
          </Button>
        </Link>
      </div>
    );
  };

  return (
    <header
      className={`fixed left-0 right-0 z-50 flex flex-col overflow-hidden ${
        isSigninPage || isAccountRequestPage || isAccountRequestStatusPage
          ? "bg-transparent"
          : ""
      }`}
      style={{
        // Extend to cover status bar
        top: '0',
        minHeight: window.innerWidth < 1024 
          ? 'calc(56px + env(safe-area-inset-top, 0px))' 
          : 'calc(64px + env(safe-area-inset-top))',
      }}
    >
      {/* Glass effect overlay - covers status bar and header (full width left to right) */}
      {!isSigninPage && !isAccountRequestPage && !isAccountRequestStatusPage && (
      <div
          className="nav-glass-effect absolute inset-x-0"
          style={{
            top: '0',
            // Cover status bar + header content area
            height: window.innerWidth < 1024 
              ? `calc(env(safe-area-inset-top, 0px) + 56px)` 
              : `calc(env(safe-area-inset-top) + 64px)`,
            zIndex: 1,
            borderBottom: '0.5px solid rgba(255, 255, 255, 0.08)',
          }}
        />
      )}
      
      {/* Header content - logo and hamburger positioned inside glass effect, centered vertically */}
      <div
        className={`w-full flex items-center justify-between gap-1 lg:gap-2 px-3 lg:px-4 xl:px-6 relative`}
        style={{
          zIndex: 2,
          paddingTop: window.innerWidth < 1024 
            ? `calc(env(safe-area-inset-top, 0px) + 0.25rem)` 
            : `calc(env(safe-area-inset-top) + 0.25rem)`,
          paddingBottom: window.innerWidth < 1024 ? '0.5rem' : '0.5rem',
        }}
      >
        {/* Go back button for signin, account request, and account request status pages */}
        {(isSigninPage || isAccountRequestPage || isAccountRequestStatusPage) && (
          <Link
            to="/"
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors flex-shrink-0"
          >
            <span className="text-lg">←</span>
            <span className="text-sm font-medium">Go back</span>
          </Link>
        )}

        {/* Logo and Hamburger Container - constrained to glass area (Mobile/Tablet only) */}
        {!isSigninPage && !isAccountRequestPage && !isAccountRequestStatusPage && (
          <div
            className="absolute left-0 right-0 flex items-center justify-between px-3 lg:px-4 xl:px-6 lg:hidden"
            style={{
              zIndex: 3,
              top: window.innerWidth < 1024 
                ? `env(safe-area-inset-top, 0px)` 
                : `env(safe-area-inset-top)`,
              height: window.innerWidth < 1024 
                ? `calc(56px / 3 + 0.5rem)` 
                : `calc(64px / 3 + 0.5rem)`,
            }}
          >
            {/* Logo - Mobile/Tablet */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <Crown className="h-6 w-6 text-primary" />
            <span className="text-xl imperial-tech-font hidden sm:inline">IMPERIAL</span>
          </Link>

            {/* Mobile & Tablet Navigation */}
            <div className="lg:hidden relative">
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
                  className="w-[90vw] max-w-md nav-glass-effect overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                  style={{
                    paddingTop: '0',
                    top: window.innerWidth < 1024 ? 'env(safe-area-inset-top)' : '0',
                    border: 'none',
                  }}
                >
                  <SheetHeader 
                    className="border-b border-border/50"
                    style={{
                      paddingTop: '0',
                      paddingBottom: '0',
                      minHeight: window.innerWidth < 1024 
                        ? `calc(env(safe-area-inset-top, 0px) + 56px / 3 + 0.5rem)` 
                        : `calc(env(safe-area-inset-top) + 64px / 3 + 0.5rem)`,
                    }}
                  >
                    <div 
                      className="flex items-center justify-start px-3 lg:px-4 xl:px-6"
                      style={{
                        paddingTop: window.innerWidth < 1024 
                          ? 'env(safe-area-inset-top, 0px)' 
                          : 'env(safe-area-inset-top)',
                        height: window.innerWidth < 1024 
                          ? `calc(56px / 3 + 0.5rem)` 
                          : `calc(64px / 3 + 0.5rem)`,
                      }}
                    >
                      <SheetTitle className="flex items-center gap-2 text-left">
                        <Crown className="h-6 w-6 text-primary" />
                        <span className="text-xl imperial-tech-font">IMPERIAL</span>
                      </SheetTitle>
                    </div>
                  </SheetHeader>
                  <nav className="flex flex-col gap-2 mt-4 pb-4">
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-muted-foreground px-2">Platform Features</h3>
                      {navigationItems.map((item) => (
                        <Link
                          key={item.to}
                          to={getSafeNavigation(item)}
                          onClick={closeMobileMenu}
                          className="flex items-center gap-3 p-3 min-h-[56px] rounded-xl transition-all duration-200 hover:bg-primary/10 text-foreground border border-border/50 active:scale-98 touch-manipulation"
                          aria-label={`Navigate to ${item.label}`}
                        >
                          <item.icon className="h-5 w-5 text-primary flex-shrink-0" />
                          <div className="flex-1 text-left">
                            <span className="text-sm font-medium block leading-tight">{item.label}</span>
                            <span className="text-xs text-muted-foreground leading-tight">{item.description}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                    <div className="mt-6 pt-4 border-t border-border/50 space-y-3">
                      <h3 className="text-xs font-semibold text-muted-foreground px-2">Account Access</h3>
                      {/* Auth Buttons - Mobile Style */}
                      {user ? (
                        <Link
                          to="/dashboard/home"
                          onClick={closeMobileMenu}
                          className="flex items-center gap-3 p-3 min-h-[56px] rounded-xl transition-all duration-200 hover:bg-primary/10 text-foreground border border-border/50 active:scale-98 touch-manipulation"
                        >
                          <LayoutDashboard className="h-5 w-5 text-primary flex-shrink-0" />
                          <div className="flex-1 text-left">
                            <span className="text-sm font-medium block leading-tight">Go to Dashboard</span>
                          </div>
                        </Link>
                      ) : (
                        <>
                          {!isAccountRequestPage && (
                            <Link
                              to="/account-request"
                              onClick={closeMobileMenu}
                              className="flex items-center justify-center gap-2 p-2.5 min-h-[56px] rounded-xl transition-all duration-200 hover:bg-primary/10 text-foreground border border-border/50 active:scale-98 touch-manipulation bg-primary/5"
                            >
                              <span className="text-sm font-medium">Get Started</span>
                            </Link>
                          )}
                          {!isSigninPage && !isResetPasswordPage && (
                            <Link
                              to="/signin"
                              onClick={closeMobileMenu}
                              className="flex items-center justify-center gap-2 p-2.5 min-h-[56px] rounded-xl transition-all duration-200 hover:bg-primary/10 text-foreground border border-border/50 active:scale-98 touch-manipulation"
                            >
                              <span className="text-sm font-medium">Sign In</span>
                            </Link>
                          )}
                        </>
                      )}
                      {/* Theme Toggle */}
                      <div className="flex items-center justify-center px-2 py-2">
                        <ThemeToggle />
                      </div>
                    </div>
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        )}

        {/* Desktop Logo - Left Side */}
        {!isSigninPage && !isAccountRequestPage && !isAccountRequestStatusPage && (
          <Link to="/" className="hidden lg:flex items-center gap-2 flex-shrink-0 z-10">
            <Crown className="h-6 w-6 text-primary" />
            <span className="text-xl imperial-tech-font">IMPERIAL</span>
          </Link>
        )}

        {/* Desktop Navigation - Responsive scaling */}
        {!isSigninPage && !isAccountRequestPage && !isAccountRequestStatusPage ? (
          <nav className="hidden lg:flex lg:items-center nav-glass-effect rounded-2xl p-1 flex-1 justify-center mx-1 lg:mx-2 max-w-4xl">
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
                    className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-xl nav-button-responsive py-2 transition-all duration-200 whitespace-nowrap"
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    <span className="nav-label">{item.label}</span>
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
          <nav className="hidden lg:flex lg:items-center nav-glass-effect rounded-2xl p-1 flex-1 justify-center mx-1 lg:mx-2">
            {navigationItems.map((item) => (
              <Link key={item.to} to={getSafeNavigation(item)}>
                <Button
                  variant="ghost"
                  className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-xl nav-button-responsive py-2 transition-all duration-200 whitespace-nowrap"
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  <span className="nav-label">{item.label}</span>
                </Button>
              </Link>
            ))}
          </nav>
        )}

        {/* Desktop Auth & Theme Toggle */}
        <div
          className={`hidden lg:flex items-center gap-1 xl:gap-2 flex-shrink-0 ${
            isSigninPage ? "mr-4" : ""
          }`}
        >
          <ThemeToggle />
          <div className="auth-buttons">
          {renderAuthButton()}
          </div>
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

        /* Default nav button styles */
        .nav-button-responsive {
          padding-left: 0.75rem;
          padding-right: 0.75rem;
        }

        .nav-label {
          font-size: 0.875rem;
        }

        /* Large screens (1280px+) - full spacing */
        @media (min-width: 1280px) {
          .nav-button-responsive {
            padding-left: 0.75rem;
            padding-right: 0.75rem;
          }
          .nav-label {
            font-size: 0.875rem;
          }
        }

        /* Medium-large screens (1150px - 1279px) - slightly reduced */
        @media (min-width: 1150px) and (max-width: 1279px) {
          .nav-button-responsive {
            padding-left: 0.625rem;
            padding-right: 0.625rem;
          }
          .nav-label {
            font-size: 0.8125rem;
          }
        }

        /* Medium screens (1100px - 1149px) - compact */
        @media (min-width: 1100px) and (max-width: 1149px) {
          .nav-button-responsive {
            padding-left: 0.375rem;
            padding-right: 0.375rem;
          }
          .nav-label {
            font-size: 0.75rem;
          }
          .auth-buttons button {
            padding-left: 0.375rem;
            padding-right: 0.375rem;
            font-size: 0.75rem;
          }
        }

        /* Small-medium screens (1024px - 1099px) - very compact */
        @media (min-width: 1024px) and (max-width: 1099px) {
          .nav-button-responsive {
            padding-left: 0.25rem;
            padding-right: 0.25rem;
            gap: 0.25rem;
          }
          .nav-label {
            font-size: 0.6875rem;
          }
          .auth-buttons button {
            padding-left: 0.25rem;
            padding-right: 0.25rem;
            font-size: 0.6875rem;
          }
        }

        /* Auth buttons responsive */
        @media (min-width: 1150px) and (max-width: 1279px) {
          .auth-buttons button {
            padding-left: 0.5rem;
            padding-right: 0.5rem;
            font-size: 0.8125rem;
          }
        }
      `}</style>
    </header>
  );
};

export default AppBar;
