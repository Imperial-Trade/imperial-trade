
import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  BookOpen,
  Radio,
  MessageSquare,
  Info,
  Crown,
  TrendingUp,
  Menu,
  X,
  Briefcase,
  Wrench,
  Award,
  Sun,
  Moon,
  Rss,
  Shield,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface LayoutProps {
  children: React.ReactNode;
  currentPageName: string;
}

interface NavigationItem {
  title: string;
  url: string;
  icon: React.ComponentType<any>;
  accessLevel: string;
  adminOnly?: boolean;
}

const navigationItems: NavigationItem[] = [
  { title: "Home", url: "/", icon: Home, accessLevel: "free" },
  { title: "Education", url: "/Education", icon: BookOpen, accessLevel: "user" },
  { title: "Signal Stream", url: "/SignalStream", icon: Rss, accessLevel: "user" },
  { title: "Live Sessions", url: "/Live", icon: Radio, accessLevel: "user" },
  { title: "Community Forum", url: "/Forum", icon: MessageSquare, accessLevel: "user" },
  { title: "IB Partnership", url: "/IBPartnership", icon: Briefcase, accessLevel: "user" },
  { title: "Advanced Tools", url: "/AdvancedTools", icon: Wrench, accessLevel: "user" },
  { title: "My Progress", url: "/MyProgress", icon: Award, accessLevel: "user" },
  { title: "Settings", url: "/Settings", icon: Settings, accessLevel: "user" },
  { title: "About", url: "/About", icon: Info, accessLevel: "free" },
];

const adminNavigationItems: NavigationItem[] = [
  { title: "Admin Panel", url: "/AdminPanel", icon: Shield, adminOnly: true, accessLevel: "admin" }
];

export default function Layout({ children, currentPageName }: LayoutProps) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [theme, setTheme] = React.useState('dark');

  React.useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const allNavigationItems = [...navigationItems, ...adminNavigationItems];

  if (currentPageName === 'AccessPortal' || currentPageName === 'AccountRequest') {
    return <div>{children}</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Crown className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-amber-300 bg-clip-text text-transparent">
              IMPERIAL
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="rounded-full"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          
          <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Market Open
          </div>
        </div>
      </header>

      <div className="flex pt-16">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 fixed left-0 top-16 h-screen bg-background/95 backdrop-blur-sm border-r border-border/50 overflow-y-auto">
          <nav className="p-4 space-y-2">
            {allNavigationItems.map((item, index) => {
              const isActive = location.pathname === item.url;
              return (
                <Link
                  key={index}
                  to={item.url}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-primary/20 text-primary border border-primary/30 shadow-lg shadow-primary/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.title}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 top-16 z-40 bg-background/95 backdrop-blur-sm">
            <nav className="p-4 space-y-2">
              {allNavigationItems.map((item) => (
                <Link
                  key={item.title}
                  to={item.url}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                    location.pathname === item.url
                      ? 'bg-primary/20 text-primary'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.title}</span>
                </Link>
              ))}
            </nav>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 lg:ml-64">
          {children}
        </main>
      </div>
    </div>
  );
}
