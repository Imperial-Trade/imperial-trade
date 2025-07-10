import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Crown, Info, Briefcase, Star, Menu, LayoutDashboard } from "lucide-react";
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

const AppBar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const { user, loading } = useAuth();

  const navigationItems = [
    { to: "/about", icon: Info, label: "About" },
    { to: "/partnership", icon: Briefcase, label: "IB Partnership" },
    { to: "/features", icon: Star, label: "Features" },
  ];

  const closeMobileMenu = () => setMobileMenuOpen(false);

  // Don't render the auth-dependent button while loading
  const renderAuthButton = () => {
    if (loading) return null;
    
    if (user) {
      return (
        <Link to="/dashboard/home">
          <Button
            size="sm"
            className="bg-accent-green hover:bg-green-500 text-white flex items-center gap-2"
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Button>
        </Link>
      );
    }
    
    return (
      <Link to="/account-request">
        <Button
          size="sm"
          className="bg-accent-green hover:bg-green-500 text-white"
        >
          Get Started
        </Button>
      </Link>
    );
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <Link to="/" className="flex items-center gap-2">
        <Crown className="h-6 w-6 text-primary" />
        <span className="text-xl imperial-tech-font">IMPERIAL</span>
      </Link>

      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-6">
        {navigationItems.map((item) => (
          <Link key={item.to} to={item.to}>
            <Button
              variant="ghost"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Button>
          </Link>
        ))}
      </nav>

      {/* Desktop Auth Button */}
      <div className="hidden md:flex items-center gap-4">
        {renderAuthButton()}
      </div>

      {/* Mobile Navigation */}
      {isMobile && (
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-primary hover:text-primary/80"
            >
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
            
            <nav className="flex flex-col gap-4 mt-8">
              {navigationItems.map((item) => (
                <Link 
                  key={item.to} 
                  to={item.to} 
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-secondary/50 text-foreground"
                >
                  <item.icon className="h-5 w-5 text-primary" />
                  <span className="text-base font-medium">{item.label}</span>
                </Link>
              ))}
              
              <div className="mt-6 pt-6 border-t border-border/50">
                {!loading && (
                  user ? (
                    <Link to="/dashboard/home" onClick={closeMobileMenu}>
                      <Button
                        size="lg"
                        className="w-full bg-accent-green hover:bg-green-500 text-white font-semibold flex items-center gap-2"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard
                      </Button>
                    </Link>
                  ) : (
                    <Link to="/account-request" onClick={closeMobileMenu}>
                      <Button
                        size="lg"
                        className="w-full bg-accent-green hover:bg-green-500 text-white font-semibold"
                      >
                        Get Started
                      </Button>
                    </Link>
                  )
                )}
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      )}

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
          position: relative;
        }

        .imperial-tech-font::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(192, 154, 88, 0.3), transparent);
          animation: tech-scan 3s infinite;
          pointer-events: none;
        }

        @keyframes tech-scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        /* Load Orbitron font */
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
      `}</style>
    </header>
  );
};

export default AppBar;
