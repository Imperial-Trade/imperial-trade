import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Crown,
  TrendingUp,
  Bell,
  GraduationCap,
  Video,
  Users,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { getAcademyAppUrl, getOrderFlowAppUrl } from "@/utils/environment";
import { cn } from "@/lib/utils";

const AuthenticatedAppBar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

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
      to: "/dashboard/journal-xx",
      icon: TrendingUp,
      label: "Tools",
    },
  ];


  return (
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 z-[200] flex items-end lg:items-center lg:justify-center px-6 nav-glass-effect border-b transition-all duration-300",
      )}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        minHeight: isCollapsed ? 'calc(64px + env(safe-area-inset-top))' : 'calc(80px + env(safe-area-inset-top))',
      }}
    >
      <div className="w-full max-w-7xl h-full lg:h-auto flex items-center justify-between">
        {/* Logo */}
        <Link to="/dashboard/home" className="flex items-center gap-2">
          <Crown className="h-6 w-6 text-primary" />
          <span className="text-xl imperial-tech-font">IMPERIAL</span>
        </Link>

        {/* Desktop Navigation - Compact pills */}
        {!isCollapsed && (
          <nav className="hidden lg:flex lg:items-center gap-1 nav-glass-effect rounded-2xl p-1 lg:absolute lg:left-1/2 lg:top-1/2 lg:transform lg:-translate-x-1/2 lg:-translate-y-1/2">
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
