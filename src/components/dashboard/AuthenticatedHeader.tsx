import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Crown, Bell, GraduationCap, Video, Users, TrendingUp, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { getAcademyAppUrl, getOrderFlowAppUrl } from '@/utils/environment';

interface NavigationItem {
  to: string;
  icon: React.ComponentType<any>;
  label: string;
  external?: boolean;
}

export function AuthenticatedHeader() {
  const location = useLocation();
  
  const navigationItems: NavigationItem[] = [
    { 
      to: "/dashboard/signal-stream", 
      icon: Bell, 
      label: "Pattern Stream" 
    },
    { 
      to: getAcademyAppUrl(),
      icon: GraduationCap, 
      label: "Education",
      external: true 
    },
    { 
      to: "/dashboard/live", 
      icon: Video, 
      label: "Live Sessions" 
    },
    { 
      to: getOrderFlowAppUrl(),
      icon: Users, 
      label: "Community",
      external: true 
    },
    { 
      to: "/dashboard/advanced-tools", 
      icon: TrendingUp, 
      label: "Tools" 
    }
  ];

  return (
    <header className="hidden lg:flex fixed top-0 left-0 right-0 z-[9999] h-20 items-center justify-center px-6 nav-glass-effect border-b">
      <div className="w-full max-w-7xl flex items-center justify-between">
        
        {/* Left: Logo */}
        <Link to="/dashboard/home" className="flex items-center gap-2">
          <Crown className="h-6 w-6 text-primary" />
          <span className="text-xl imperial-tech-font">IMPERIAL</span>
        </Link>

        {/* Center: Navigation Pill */}
        <nav className="flex items-center gap-1 nav-glass-effect rounded-2xl p-1">
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.to;
            const ButtonComponent = (
              <Button
                variant="ghost"
                className={`flex items-center gap-2 text-sm font-medium rounded-xl px-3 py-2 transition-all duration-200 ${
                  isActive 
                    ? 'bg-background/80 text-foreground' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/80'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            );

            return item.external ? (
              <a key={item.to} href={item.to} target="_blank" rel="noopener noreferrer">
                {ButtonComponent}
              </a>
            ) : (
              <Link key={item.to} to={item.to}>
                {ButtonComponent}
              </Link>
            );
          })}
        </nav>

        {/* Right: Theme Toggle + Up Arrow */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Imperial Tech Font Styling */}
      <style>{`
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
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
      `}</style>
    </header>
  );
}
