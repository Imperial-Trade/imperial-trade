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
import { useSignalTheme } from "@/hooks/useSignalTheme";

const AuthenticatedAppBar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark } = useSignalTheme();

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
        "fixed top-0 left-0 right-0 z-[200] flex flex-col overflow-hidden",
      )}
      style={{
        top: '0',
        minHeight: isCollapsed ? 'calc(64px + env(safe-area-inset-top))' : 'calc(80px + env(safe-area-inset-top))',
      }}
      onTouchStart={(e) => {
        e.stopPropagation();
      }}
      onTouchEnd={(e) => {
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      {/* Glass effect overlay - covers status bar and entire header */}
      <div 
        className="absolute inset-x-0"
        style={{
          top: '0',
          height: isCollapsed ? 'calc(64px + env(safe-area-inset-top))' : 'calc(80px + env(safe-area-inset-top))',
          zIndex: 1,
          backdropFilter: 'blur(30px) saturate(180%)',
          WebkitBackdropFilter: 'blur(30px) saturate(180%)',
          background: isDark ? 'rgba(15, 15, 20, 0.3)' : 'rgba(255, 255, 255, 0.3)',
          border: 'none',
          borderBottom: 'none',
          boxShadow: 'none',
        }}
      />
      
      {/* Header content */}
      <div 
        className="w-full max-w-7xl mx-auto h-full flex items-center justify-between px-6 relative"
        style={{
          zIndex: 2,
          paddingTop: 'env(safe-area-inset-top)',
          minHeight: isCollapsed ? '64px' : '80px',
        }}
      >
        {/* Logo - Left side */}
        <Link to="/dashboard/home" className="flex items-center gap-2 flex-shrink-0">
          <Crown className="h-6 w-6 text-primary" />
          <span className="text-xl imperial-tech-font">IMPERIAL</span>
        </Link>

        {/* Desktop Navigation - Compact pills (centered) */}
        {!isCollapsed && (
          <nav className="hidden lg:flex lg:items-center gap-1 rounded-2xl p-1 lg:absolute lg:left-1/2 lg:transform lg:-translate-x-1/2 nav-glass-effect" style={{
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}>
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.to;
              // Pattern Stream gets yellow highlight, others use primary
              const isPatternStream = item.to === "/dashboard/signal-stream";
              
              return item.external ? (
                <Button
                  key={item.to}
                  variant="ghost"
                  className={cn(
                    "flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-xl px-3 py-2 transition-all duration-200",
                    isActive && !isPatternStream && "bg-primary/15 text-primary"
                  )}
                  style={isActive && isPatternStream ? {
                    background: 'rgba(255, 193, 7, 0.2)', // Yellow with low opacity
                    color: isDark ? '#FFC107' : '#B8860B',
                  } : undefined}
                  onClick={() => window.location.href = item.to}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              ) : (
                  <Button
                  key={item.to}
                    variant="ghost"
                  onClick={() => navigate(item.to)}
                    className={cn(
                      "flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-xl px-3 py-2 transition-all duration-200",
                      isActive && !isPatternStream && "bg-primary/15 text-primary"
                    )}
                    style={isActive && isPatternStream ? {
                      background: 'rgba(255, 193, 7, 0.2)', // Yellow with low opacity
                      color: isDark ? '#FFC107' : '#B8860B',
                    } : undefined}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Button>
              );
            })}
          </nav>
        )}

        {/* Desktop Theme Toggle & Collapse Button - Right side */}
        <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
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
