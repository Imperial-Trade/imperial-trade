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
  Shield,
  UserCheck,
  UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { getAcademyAppUrl, getOrderFlowAppUrl } from "@/utils/environment";
import { cn } from "@/lib/utils";
import { useSignalTheme } from "@/hooks/useSignalTheme";
import { useAuthorizationAware } from "@/hooks/useAuthorizationAware";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

const AuthenticatedAppBar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark } = useSignalTheme();
  
  // Admin access check
  const { isAdmin, isModerator, isEducatorPlus, isEducator, userRoles } = useAuthorizationAware();
  const canAccessAdmin = isAdmin || isEducatorPlus || isEducator || isModerator;
  
  // Define which admin tools each role can access
  const canAccessRequests = userRoles?.some(r => ['admin', 'moderator', 'educator+'].includes(r));
  const canAccessUsers = isAdmin;
  const canAccessSignals = userRoles?.some(r => ['admin', 'educator', 'educator+'].includes(r));
  const canAccessNotifications = isAdmin;

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
        <Link to="/dashboard/signal-stream" className="flex items-center gap-2 flex-shrink-0">
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

        {/* Desktop Theme Toggle, Admin & Collapse Button - Right side */}
        <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
          <ThemeToggle />
          
          {/* Admin Dropdown - Only show on admin-tools page and for admins */}
          {isAdmin && location.pathname.includes('/admin-tools') && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-8 h-8 p-0 text-muted-foreground hover:text-foreground hover:bg-accent"
                  aria-label="Admin Tools"
                >
                  <Shield className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  Admin Tools
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                <DropdownMenuItem 
                  onClick={() => navigate('/dashboard/admin-tools?admin=requests')}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" />
                  Account Requests
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  onClick={() => navigate('/dashboard/admin-tools?admin=users')}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <UserCog className="w-4 h-4" />
                  User Management
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  onClick={() => navigate('/dashboard/admin-tools?admin=signals')}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <TrendingUp className="w-4 h-4" />
                  Trading Signals
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  onClick={() => navigate('/dashboard/admin-tools?admin=notifications')}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Bell className="w-4 h-4" />
                  Notifications
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
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
