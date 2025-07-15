import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Crown, Bell, Search, Settings, TrendingUp, BarChart3, User, Menu, LayoutDashboard, GraduationCap, Radio, Users, Briefcase, Target, PieChart, BookOpen, MessageSquare, ChevronDown, Grid3X3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const DashboardNav: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();
  const { user, signOut } = useAuth();

  // Navigation items for dashboard
  const primaryNavItems = [
    { to: "/dashboard/home", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/dashboard/signal-stream", icon: Radio, label: "Signals" },
    { to: "/dashboard/education", icon: GraduationCap, label: "Education" },
  ];

  const secondaryNavItems = [
    { to: "/dashboard/live", icon: Users, label: "Live Sessions" },
    { to: "/dashboard/forum", icon: MessageSquare, label: "Community" },
    { to: "/dashboard/advanced-tools", icon: Target, label: "Tools" },
    { to: "/dashboard/my-progress", icon: BookOpen, label: "Progress" },
  ];

  const allNavigationItems = [...primaryNavItems, ...secondaryNavItems];

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-center px-6 transition-all duration-300 ${
        scrolled 
          ? 'backdrop-blur-xl border-b border-border/50 bg-background/60 shadow-lg' 
          : 'backdrop-blur-md bg-background/40'
      }`}
    >
      {/* Gradient overlay that becomes more visible on scroll */}
      <div className={`absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 transition-opacity duration-300 ${
        scrolled ? 'opacity-100' : 'opacity-40'
      }`}></div>
      
      <div className="w-full max-w-7xl flex items-center justify-between relative">
        {/* Logo */}
        <Link to="/dashboard/home" className="flex items-center gap-2">
          <Crown className="h-6 w-6 text-primary" />
          <span className="text-xl imperial-tech-font">IMPERIAL</span>
        </Link>

        {/* Desktop Navigation - Collapsed Primary Items */}
        <nav className={`hidden lg:flex items-center gap-2 rounded-2xl p-2 transition-all duration-300 ${
          scrolled 
            ? 'bg-muted/50 backdrop-blur-sm border border-border/50' 
            : 'bg-muted/30 backdrop-blur-sm border border-border/30'
        }`}>
          {/* Primary navigation items */}
          {primaryNavItems.map(item => {
            const isActive = location.pathname === item.to;
            return (
              <Link key={item.to} to={item.to}>
                <Button 
                  variant="ghost" 
                  className={`flex items-center gap-2 text-sm font-medium rounded-xl px-4 py-2 transition-all duration-200 ${
                    isActive 
                      ? 'bg-primary/15 text-primary border border-primary/30 shadow-lg shadow-primary/10' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/80 hover:shadow-md'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}

          {/* More menu dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex items-center gap-2 text-sm font-medium rounded-xl px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-background/80 hover:shadow-md transition-all duration-200"
              >
                <Grid3X3 className="h-4 w-4" />
                More
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="center">
              {secondaryNavItems.map(item => {
                const isActive = location.pathname === item.to;
                return (
                  <DropdownMenuItem key={item.to} asChild>
                    <Link 
                      to={item.to} 
                      className={`flex items-center gap-3 w-full ${
                        isActive ? 'bg-primary/10 text-primary' : ''
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        {/* Desktop Actions */}
        <div className="hidden lg:flex items-center gap-3">
          {/* Live Market Indicator */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-300 ${
            scrolled 
              ? 'bg-green-500/10 border-green-500/30' 
              : 'bg-green-500/5 border-green-500/20'
          }`}>
            <BarChart3 className="h-3 w-3 text-green-500" />
            <span className="text-xs font-medium text-green-700 dark:text-green-400">S&P +0.75%</span>
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            className={`relative hover:bg-primary/10 group transition-all duration-200 ${
              scrolled ? 'bg-background/60' : 'bg-background/30'
            }`}
          >
            <Search className="h-4 w-4 transition-colors group-hover:text-primary" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className={`relative hover:bg-primary/10 group transition-all duration-200 ${
              scrolled ? 'bg-background/60' : 'bg-background/30'
            }`}
          >
            <Bell className="h-4 w-4 transition-colors group-hover:text-primary" />
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs animate-bounce bg-red-500 border-2 border-background"
            >
              3
            </Badge>
          </Button>

          <ThemeToggle />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className={`relative h-8 w-8 rounded-full transition-all duration-200 ${
                scrolled ? 'bg-background/60' : 'bg-background/30'
              }`}>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.email} />
                  <AvatarFallback>
                    {user?.email ? getInitials(user.email) : 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex flex-col space-y-1 p-2">
                <p className="text-sm font-medium leading-none">{user?.email}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.user_metadata?.access_level === 'admin' ? 'Administrator' : 'Member'}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/dashboard/settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
              {allNavigationItems.map(item => {
                const isActive = location.pathname === item.to;
                return (
                  <Link 
                    key={item.to} 
                    to={item.to} 
                    onClick={closeMobileMenu} 
                    className={`flex items-center gap-3 p-4 rounded-xl transition-all duration-200 border ${
                      isActive 
                        ? 'bg-primary/10 border-primary/20 text-primary' 
                        : 'hover:bg-primary/10 text-foreground border-border/50'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-base font-medium">{item.label}</span>
                  </Link>
                );
              })}

              <div className="mt-6 pt-6 border-t border-border/50 space-y-4">
                <div className="flex justify-center">
                  <ThemeToggle />
                </div>
                <Button 
                  onClick={handleSignOut} 
                  size="lg" 
                  variant="outline" 
                  className="w-full"
                >
                  Sign Out
                </Button>
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
      `}</style>
    </header>
  );
};

export default DashboardNav;