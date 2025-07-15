import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Crown, Info, Briefcase, Star, Menu, LayoutDashboard, TrendingUp, Bell, GraduationCap, Video, Users, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
const AppBar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();
  const isAccountRequestPage = location.pathname === '/account-request';
  const isSigninPage = location.pathname === '/signin';
  const {
    user,
    loading
  } = useAuth();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const navigationItems = [{
    to: "/advanced-tools",
    icon: TrendingUp,
    label: "Advanced Tools",
    description: "Professional trading tools and analytics",
    features: ["Risk Calculator", "Portfolio Analysis", "Market Scanner"]
  }, {
    to: "/signals",
    icon: Bell,
    label: "Signals",
    description: "Real-time trading signals and alerts",
    features: ["Live Alerts", "Custom Indicators", "Signal History"]
  }, {
    to: "/education",
    icon: GraduationCap,
    label: "Education",
    description: "Comprehensive trading education platform",
    features: ["Video Courses", "Live Webinars", "Trading Guides"]
  }, {
    to: "/live-sessions",
    icon: Video,
    label: "Live Sessions",
    description: "Interactive live trading sessions",
    features: ["Market Analysis", "Live Q&A", "Trading Psychology"]
  }, {
    to: "/community-forum",
    icon: Users,
    label: "Community Forum",
    description: "Connect with fellow traders",
    features: ["Discussions", "Strategy Sharing", "Expert Advice"]
  }, {
    to: "/ib-partnership-new",
    icon: Handshake,
    label: "IB Partnership",
    description: "Institutional broker partnerships",
    features: ["Revenue Share", "White Label", "API Access"]
  }];
  const closeMobileMenu = () => setMobileMenuOpen(false);

  // Show "Get Started" by default, "Dashboard" when authenticated
  const renderAuthButton = () => {
    if (user) {
      return <Link to="/dashboard/home">
          <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Button>
        </Link>;
    }
    
    // Don't show Get Started button if already on account request page or signin page
    if (isAccountRequestPage || isSigninPage) {
      return null;
    }
    
    return <Link to="/account-request">
        <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
          Get Started
        </Button>
      </Link>;
  };
  return <header className={`fixed top-0 left-0 right-0 z-50 h-20 flex items-center justify-center px-6 ${isAccountRequestPage ? '' : isSigninPage ? 'bg-transparent' : 'backdrop-blur-xl border-b border-border/50 bg-background/80'}`}>
      <div className={`w-full max-w-7xl flex items-center ${isSigninPage ? 'justify-between' : 'justify-between'}`}>
        
        {/* Go back button for signin page */}
        {isSigninPage && (
          <Link to="/" className="flex items-center gap-2 text-white/80 hover:text-white transition-colors">
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
          <nav className="hidden lg:flex items-center gap-1 bg-muted/30 rounded-2xl p-1 backdrop-blur-sm border border-border/50">
            {navigationItems.map(item => <div key={item.to} className="relative" onMouseEnter={() => setActiveDropdown(item.label)} onMouseLeave={() => setActiveDropdown(null)}>
                  <Link to={item.to}>
                    <Button variant="ghost" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-xl px-3 py-2 transition-all duration-200">
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                
                {/* Apple/Stripe style dropdown */}
                {activeDropdown === item.label && <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-80 bg-background/95 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl p-6 animate-fade-in-up z-50">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">{item.label}</h3>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                      <div className="space-y-2">
                        {item.features.map((feature, idx) => <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                            {feature}
                          </div>)}
                      </div>
                      <Link to={item.to}>
                        <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl">
                          Explore {item.label}
                        </Button>
                      </Link>
                    </div>
                  </div>}
              </div>)}
          </nav>
        ) : (
          <nav className="hidden lg:flex items-center gap-1 bg-muted/30 rounded-2xl p-1 backdrop-blur-sm border border-border/50">
            {navigationItems.map(item => (
              <Link key={item.to} to={item.to}>
                <Button variant="ghost" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-xl px-3 py-2 transition-all duration-200">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>
        )}

        {/* Desktop Auth & Theme Toggle */}
        <div className={`hidden lg:flex items-center gap-2 ${isSigninPage ? 'mr-4' : ''}`}>
          <ThemeToggle />
          {renderAuthButton()}
        </div>
      </div>

      {/* Mobile & Tablet Navigation */}
      {(isMobile || window.innerWidth < 1024) && <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
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
              {/* Hide navigation items on signin page */}
              {!isSigninPage && navigationItems.map(item => <div key={item.to} className="space-y-2">
                  <Link to={item.to} onClick={closeMobileMenu} className="flex items-center gap-3 p-4 rounded-xl transition-all duration-200 hover:bg-primary/10 text-foreground border border-border/50">
                    <item.icon className="h-5 w-5 text-primary" />
                    <div>
                      <span className="text-base font-medium block">{item.label}</span>
                      <span className="text-sm text-muted-foreground">{item.description}</span>
                    </div>
                  </Link>
                </div>)}

              <div className="mt-6 pt-6 border-t border-border/50 space-y-4">
                <div className="flex justify-center">
                  <ThemeToggle />
                </div>
                {user ? <Link to="/dashboard/home" onClick={closeMobileMenu}>
                    <Button size="lg" className="w-full bg-accent-green hover:bg-green-500 text-white font-semibold flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Button>
                   </Link> : !isAccountRequestPage && !isSigninPage && <Link to="/account-request" onClick={closeMobileMenu}>
                     <Button size="lg" className="w-full bg-accent-green hover:bg-green-500 text-white font-semibold">
                       Get Started
                     </Button>
                   </Link>}
              </div>
            </nav>
          </SheetContent>
        </Sheet>}

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
    </header>;
};
export default AppBar;