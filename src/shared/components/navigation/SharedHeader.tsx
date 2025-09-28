import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "../ui/button";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";
import { ThemeToggle } from "../theme/ThemeToggle";
import { 
  Menu, 
  Crown, 
  GraduationCap, 
  TrendingUp, 
  Users,
  ExternalLink 
} from "lucide-react";
import { CrossAppLink } from "./CrossAppLink";

interface SharedHeaderProps {
  baseUrl?: string;
  user?: any;
  onLogout?: () => void;
}

export function SharedHeader({ baseUrl = "", user, onLogout }: SharedHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);

  const getUserAccessLevel = () => {
    if (!user?.user_metadata) return "free";
    return user.user_metadata.access_level || "free";
  };

  const getAccessLevelDisplay = (level: string) => {
    const displays = {
      free: { label: "Free", color: "text-muted-foreground" },
      member: { label: "Member", color: "text-blue-600" },
      educator: { label: "Educator", color: "text-purple-600" },
      admin: { label: "Admin", color: "text-red-600" }
    };
    return displays[level as keyof typeof displays] || displays.free;
  };

  const navigationItems = [
    {
      to: `${baseUrl}/`,
      icon: Crown,
      label: "Main Platform",
      description: "Trading signals and community",
      isExternal: baseUrl !== ""
    },
    {
      to: `${baseUrl}/academy`,
      icon: GraduationCap,
      label: "Education",
      description: "Courses and learning materials",
      isExternal: true
    },
    {
      to: `${baseUrl}/orderflow`,
      icon: TrendingUp,
      label: "Community",
      description: "Advanced trading tools",
      isExternal: true
    }
  ];

  const primaryNavItems = navigationItems.filter(item => 
    baseUrl === "" ? item.to !== "/" : true
  );

  const secondaryNavItems = [
    {
      to: `${baseUrl}/contact`,
      icon: Users,
      label: "Contact",
      description: "Get in touch with our team",
      isExternal: false
    }
  ];

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 20;
      setIsHeaderCollapsed(scrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap');
        .imperial-tech-font {
          font-family: 'Orbitron', 'Inter', system-ui, -apple-system, sans-serif;
          font-weight: 700;
          letter-spacing: 0.02em;
        }
      `}</style>

      <header 
        className={`sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md transition-all duration-300 ${
          isHeaderCollapsed ? 'py-2 shadow-lg' : 'py-4'
        }`}
      >
        <div className="container mx-auto px-4">
          <div className="flex h-14 items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/70">
                <Crown className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="imperial-tech-font text-xl font-bold text-foreground">
                  IMPERIAL
                </span>
                <span className="text-xs text-muted-foreground font-medium -mt-1">
                  Trading Platform
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {primaryNavItems.map((item) => (
                <CrossAppLink
                  key={item.to}
                  to={item.to}
                  variant="ghost"
                  isExternal={item.isExternal}
                  targetApp={item.to.includes('/academy') ? 'academy' : item.to.includes('/orderflow') ? 'orderflow' : undefined}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-105"
                >
                  <span className="flex items-center gap-1">
                    {item.label}
                    {item.isExternal && <ExternalLink className="h-3 w-3" />}
                  </span>
                </CrossAppLink>
              ))}
            </nav>

            {/* Right side actions */}
            <div className="flex items-center space-x-3">
              <ThemeToggle />
              
              {user && (
                <div className="hidden sm:flex items-center space-x-2 px-3 py-1 rounded-full bg-muted/50">
                  <span className="text-xs text-muted-foreground">Access:</span>
                  <span className={`text-xs font-medium ${getAccessLevelDisplay(getUserAccessLevel()).color}`}>
                    {getAccessLevelDisplay(getUserAccessLevel()).label}
                  </span>
                </div>
              )}

              {/* Mobile menu trigger */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-0">
                  <div className="flex flex-col h-full">
                    {/* Mobile Header */}
                    <div className="flex items-center justify-between p-6 border-b">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70">
                          <Crown className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <div className="flex flex-col">
                          <span className="imperial-tech-font text-lg font-bold text-foreground">
                            IMPERIAL
                          </span>
                          <span className="text-xs text-muted-foreground -mt-1">
                            Trading Platform
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex-1 overflow-y-auto py-6">
                      <div className="space-y-1 px-3">
                        <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                          Navigation
                        </h3>
                        {primaryNavItems.map((item) => (
                          <CrossAppLink
                            key={item.to}
                            to={item.to}
                            variant="ghost"
                            isExternal={item.isExternal}
                            targetApp={item.to.includes('/academy') ? 'academy' : item.to.includes('/orderflow') ? 'orderflow' : undefined}
                            className="w-full justify-start text-left"
                          >
                            <span 
                              className="flex items-center gap-3 w-full"
                              onClick={() => setMobileMenuOpen(false)}
                            >
                              <item.icon className="h-5 w-5" />
                              <div className="flex flex-col">
                                <span className="font-medium">{item.label}</span>
                                <span className="text-xs text-muted-foreground">
                                  {item.description}
                                </span>
                              </div>
                              {item.isExternal && <ExternalLink className="h-4 w-4 ml-auto" />}
                            </span>
                          </CrossAppLink>
                        ))}

                        <div className="my-4 px-3">
                          <div className="h-px bg-border" />
                        </div>

                        <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                          Support
                        </h3>
                        {secondaryNavItems.map((item) => (
                          <Button
                            key={item.to}
                            variant="ghost"
                            asChild
                            className="w-full justify-start text-left"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <Link to={item.to} className="flex items-center gap-3">
                              <item.icon className="h-5 w-5" />
                              <div className="flex flex-col">
                                <span className="font-medium">{item.label}</span>
                                <span className="text-xs text-muted-foreground">
                                  {item.description}
                                </span>
                              </div>
                            </Link>
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* User info in mobile */}
                    {user && (
                      <div className="p-6 border-t bg-muted/20">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-foreground">
                              {user.email}
                            </span>
                            <span className={`text-xs ${getAccessLevelDisplay(getUserAccessLevel()).color}`}>
                              {getAccessLevelDisplay(getUserAccessLevel()).label} Access
                            </span>
                          </div>
                          {onLogout && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                onLogout();
                                setMobileMenuOpen(false);
                              }}
                            >
                              Logout
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}