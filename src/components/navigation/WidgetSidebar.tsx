import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, PanInfo, useMotionValue, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Calendar,
  Calculator,
  Brain,
  Search,
  Scale,
  ChevronRight,
  Sparkles,
  User,
  BarChart3,
  Settings,
  Shield,
  LogOut,
  X,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { TradingSessionIndicator } from "@/components/ui/TradingSessionIndicator";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthorizationAware } from "@/hooks/useAuthorizationAware";
import { DashboardUserRole } from "@/components/dashboard/DashboardUserRole";
import { EdgeIndicator } from "./EdgeIndicator";
import { useDeviceDetection } from "@/hooks/useDeviceDetection";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useSmartProtection } from "@/hooks/useSmartProtection";

// Define the 6 trading arsenal tools with their correct existing routes
const tradingTools = [
  {
    name: "Trading Journal",
    icon: BookOpen,
    description: "Log and analyze your trades with AI-powered feedback.",
    route: "/dashboard/advanced-tools?tool=journal",
  },
  {
    name: "Economic Calendar",
    icon: Calendar,
    description: "Stay ahead of market-moving events and news releases.",
    route: "/dashboard/advanced-tools?tool=calendar",
  },
  {
    name: "Risk Calculator",
    icon: Calculator,
    description: "Calculate position size, risk, and potential profit.",
    route: "/dashboard/advanced-tools?tool=calculator",
  },
  {
    name: "Trade Analyst",
    icon: Brain,
    description: "Upload screenshots for deep performance analysis.",
    route: "/dashboard/advanced-tools?tool=analyst",
  },
  {
    name: "Opportunity Scanner",
    icon: Search,
    description: "Scan markets for high-probability trading setups.",
    route: "/dashboard/advanced-tools?tool=scanner",
  },
  {
    name: "Risk Simulator",
    icon: Scale,
    description: "Simulate trade setups to assess risk before you enter.",
    route: "/dashboard/advanced-tools?tool=simulator",
  },
];

interface WidgetSidebarProps {
  className?: string;
}

export function WidgetSidebar({ className = "" }: WidgetSidebarProps) {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showEdgeIndicator, setShowEdgeIndicator] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  // Authorization checks
  const { isAdmin, isEducator, isEducatorPlus, isModerator } = useAuthorizationAware();
  const canAccessAdminPanel = isAdmin || isEducatorPlus || isEducator || isModerator;

  // Device detection and responsive behavior
  const {
    isMobile,
    isTablet,
    isTouchDevice,
    edgeThreshold,
    dragThreshold,
    orientation
  } = useDeviceDetection();

  // Smart protection system
  const { canTriggerSidebar } = useSmartProtection({
    edgeThreshold,
    allowedSelectors: ['.sidebar-safe-zone', '[data-sidebar-safe]']
  });

  // Motion values for smooth drag animations
  const dragX = useMotionValue(0);
  const opacity = useTransform(dragX, [-280, -140, 0], [0, 0.5, 1]);
  const scale = useTransform(dragX, [-280, -140, 0], [0.8, 0.9, 1]);
  const blur = useTransform(dragX, [0, -140, -280], [0, 2, 8]);

  // Detect if user prefers reduced motion
  const prefersReducedMotion = useMemo(() => 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);

  const handleToggleSidebar = useCallback(() => {
    setIsVisible(prev => !prev);
  }, [isVisible]);

  const handleCloseSidebar = useCallback(() => {
    if (isVisible) {
      setIsVisible(false);
      dragX.set(0);
    }
  }, [isVisible, dragX]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onToggleSidebar: handleToggleSidebar,
    onCloseSidebar: handleCloseSidebar,
    isEnabled: true
  });

  // Enhanced mouse position tracking with smart protection
  useEffect(() => {
    let edgeIndicatorTimeout: NodeJS.Timeout;
    let hideIndicatorTimeout: NodeJS.Timeout;

    const handleMouseMove = (e: MouseEvent) => {
      const isNearLeftEdge = e.clientX <= edgeThreshold;
      const canTrigger = canTriggerSidebar(e);

      // Show edge indicator when near edge but not over protected elements
      if (isNearLeftEdge && canTrigger && !isVisible) {
        clearTimeout(hideIndicatorTimeout);
        if (!showEdgeIndicator) {
          edgeIndicatorTimeout = setTimeout(() => {
            setShowEdgeIndicator(true);
          }, 200); // Small delay to prevent flicker
        }

        // Open sidebar after brief hover in safe area
        if (!isDragging) {
          const openTimeout = setTimeout(() => {
            if (!isVisible && canTriggerSidebar(e)) {
              setIsVisible(true);
              setShowEdgeIndicator(false);
              
              // Haptic feedback on mobile
              if (isTouchDevice && 'vibrate' in navigator) {
                navigator.vibrate(15);
              }
            }
          }, isMobile ? 300 : 500); // Faster on mobile

          return () => clearTimeout(openTimeout);
        }
      } else {
        clearTimeout(edgeIndicatorTimeout);
        if (showEdgeIndicator) {
          hideIndicatorTimeout = setTimeout(() => {
            setShowEdgeIndicator(false);
          }, 100);
        }
      }
    };

    const handleMouseLeave = () => {
      if (!isHovering && !isDragging) {
        setIsVisible(false);
        setShowEdgeIndicator(false);
      }
    };

    // Click outside to close
    const handleClickOutside = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node) && isVisible) {
        handleCloseSidebar();
      }
    };

    // Enhanced touch handling for mobile
    const handleTouchStart = (e: TouchEvent) => {
      if (isTouchDevice && e.touches.length === 1) {
        const touch = e.touches[0];
        if (touch.clientX <= edgeThreshold && canTriggerSidebar({
          target: e.target,
          clientX: touch.clientX
        } as MouseEvent)) {
          setIsVisible(true);
          if ('vibrate' in navigator) {
            navigator.vibrate(10);
          }
        }
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mousedown", handleClickOutside);
    
    if (isTouchDevice) {
      document.addEventListener("touchstart", handleTouchStart, { passive: true });
    }

    return () => {
      clearTimeout(edgeIndicatorTimeout);
      clearTimeout(hideIndicatorTimeout);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mousedown", handleClickOutside);
      
      if (isTouchDevice) {
        document.removeEventListener("touchstart", handleTouchStart);
      }
    };
  }, [
    edgeThreshold,
    canTriggerSidebar,
    isVisible,
    isHovering,
    isDragging,
    showEdgeIndicator,
    isMobile,
    isTouchDevice,
    handleCloseSidebar
  ]);

  const handleToolClick = (tool: (typeof tradingTools)[0]) => {
    setActiveTool(tool.name);
    navigate(tool.route);
  };

  // Enhanced drag handlers with device-specific optimizations
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    // Enhanced haptic feedback
    if (isTouchDevice && 'vibrate' in navigator) {
      navigator.vibrate(isMobile ? 15 : 10);
    }
  }, [isTouchDevice, isMobile]);

  const handleDrag = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Only allow dragging to the left (negative x)
    if (info.offset.x > 0) return false;
    
    // Progressive resistance based on device type
    const resistance = Math.abs(info.offset.x) / (isMobile ? 250 : 280);
    const adjustedOffset = info.offset.x * (1 - resistance * (isMobile ? 0.2 : 0.3));
    dragX.set(adjustedOffset);
  }, [dragX, isMobile]);

  const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    
    const dragDistance = Math.abs(info.offset.x);
    const dragVelocity = Math.abs(info.velocity.x);
    
    // Device-specific thresholds
    const shouldClose = dragDistance > dragThreshold || 
                       dragVelocity > (isMobile ? 300 : 400);
    
    if (shouldClose) {
      handleCloseSidebar();
      
      // Success haptic feedback
      if (isTouchDevice && 'vibrate' in navigator) {
        navigator.vibrate(isMobile ? 30 : 25);
      }
    } else {
      // Snap back animation
      dragX.set(0);
    }
  }, [dragThreshold, isMobile, isTouchDevice, handleCloseSidebar, dragX]);

  const handleClose = () => {
    setIsVisible(false);
    dragX.set(0); // Reset drag position
  };

  const WidgetTool = ({
    tool,
    size = "small",
  }: {
    tool: (typeof tradingTools)[0];
    size?: "small" | "medium" | "large";
  }) => {
    const Icon = tool.icon;
    const isActive = activeTool === tool.name;

    // Responsive size classes
    const sizeClasses = {
      small: "col-span-1 h-20 sm:h-24 md:h-28 lg:h-32",
      medium: "col-span-2 h-20 sm:h-24 md:h-28 lg:h-32",
      large: "col-span-2 h-24 sm:h-28 md:h-32 lg:h-36",
    };

    const renderWidgetContent = () => {
      switch (tool.name) {
        case "Trading Journal":
          return (
            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-gray-900 dark:from-slate-100 dark:to-white rounded-lg overflow-hidden">
              <div className="p-1 sm:p-2 h-full flex flex-col">
                <div className="flex items-center gap-0.5 sm:gap-1 mb-1 sm:mb-2">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 dark:bg-green-600 rounded-full"></div>
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-400 dark:bg-red-600 rounded-full"></div>
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-yellow-400 dark:bg-yellow-600 rounded-full"></div>
                </div>
                <div className="flex-1 space-y-0.5 sm:space-y-1">
                  <div className="h-1 sm:h-1.5 bg-blue-300 dark:bg-blue-800 rounded w-3/4"></div>
                  <div className="h-1 sm:h-1.5 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
                  <div className="h-1 sm:h-1.5 bg-green-300 dark:bg-green-800 rounded w-2/3"></div>
                </div>
              </div>
            </div>
          );

        case "Economic Calendar":
          return (
            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-purple-900 dark:from-purple-100 dark:to-pink-50 rounded-lg overflow-hidden">
              <div className="p-1 sm:p-2 h-full">
                <div className="grid grid-cols-7 gap-0.5 h-full">
                  {Array.from({ length: 14 }).map((_, i) => (
                    <div
                      key={i}
                      className={`rounded-sm ${
                        i === 5
                          ? "bg-purple-300 dark:bg-purple-700"
                          : i === 9
                          ? "bg-red-300 dark:bg-red-700"
                          : "bg-gray-600 dark:bg-gray-300"
                      }`}
                    ></div>
                  ))}
                </div>
              </div>
            </div>
          );

        case "Risk Calculator":
          return (
            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-emerald-900 dark:from-green-100 dark:to-emerald-50 rounded-lg overflow-hidden">
              <div className="p-1 sm:p-2 h-full flex flex-col justify-center items-center">
                <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-green-300 dark:border-green-700 rounded-full flex items-center justify-center mb-0.5 sm:mb-1">
                  <span className="text-xs font-bold text-green-200 dark:text-green-800">
                    %
                  </span>
                </div>
                <div className="flex gap-0.5 sm:gap-1">
                  <div className="w-0.5 sm:w-1 h-2 sm:h-3 bg-green-300 dark:bg-green-700 rounded"></div>
                  <div className="w-0.5 sm:w-1 h-3 sm:h-4 bg-green-400 dark:bg-green-800 rounded"></div>
                  <div className="w-0.5 sm:w-1 h-1.5 sm:h-2 bg-green-200 dark:bg-green-600 rounded"></div>
                </div>
              </div>
            </div>
          );

        case "Trade Analyst":
          return (
            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-amber-900 dark:from-orange-100 dark:to-amber-50 rounded-lg overflow-hidden">
              <div className="p-1 sm:p-2 h-full flex flex-col">
                <div className="flex items-center gap-0.5 sm:gap-1 mb-0.5 sm:mb-1">
                  <div className="w-2 sm:w-3 h-1.5 sm:h-2 bg-orange-300 dark:bg-orange-700 rounded"></div>
                  <div className="w-3 sm:w-4 h-0.5 sm:h-1 bg-orange-200 dark:bg-orange-600 rounded"></div>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-4 sm:w-6 h-4 sm:h-6 border-2 border-dashed border-orange-300 dark:border-orange-700 rounded flex items-center justify-center">
                    <Icon className="w-2 sm:w-3 h-2 sm:h-3 text-orange-200 dark:text-orange-800" />
                  </div>
                </div>
              </div>
            </div>
          );

        case "Opportunity Scanner":
          return (
            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-blue-900 dark:from-cyan-100 dark:to-blue-50 rounded-lg overflow-hidden">
              <div className="p-1 sm:p-2 h-full">
                <div className="space-y-0.5 sm:space-y-1">
                  <div className="flex items-center gap-0.5 sm:gap-1">
                    <div className="w-0.5 sm:w-1 h-0.5 sm:h-1 bg-cyan-300 dark:bg-cyan-700 rounded-full animate-pulse"></div>
                    <div className="h-0.5 sm:h-1 bg-cyan-200 dark:bg-cyan-600 rounded flex-1"></div>
                  </div>
                  <div className="flex items-center gap-0.5 sm:gap-1">
                    <div className="w-0.5 sm:w-1 h-0.5 sm:h-1 bg-blue-300 dark:bg-blue-700 rounded-full animate-pulse delay-100"></div>
                    <div className="h-0.5 sm:h-1 bg-blue-200 dark:bg-blue-600 rounded flex-1"></div>
                  </div>
                  <div className="flex items-center gap-0.5 sm:gap-1">
                    <div className="w-0.5 sm:w-1 h-0.5 sm:h-1 bg-indigo-300 dark:bg-indigo-700 rounded-full animate-pulse delay-200"></div>
                    <div className="h-0.5 sm:h-1 bg-indigo-200 dark:bg-indigo-600 rounded flex-1"></div>
                  </div>
                </div>
              </div>
            </div>
          );

        case "Risk Simulator":
          return (
            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-rose-900 dark:from-red-100 dark:to-rose-50 rounded-lg overflow-hidden">
              <div className="p-1 sm:p-2 h-full flex items-center justify-center">
                <div className="relative">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-red-300 dark:border-red-700 rounded-full"></div>
                  <div className="absolute inset-0 border-2 border-red-400 dark:border-red-800 rounded-full animate-ping"></div>
                  <div className="absolute inset-1 sm:inset-2 bg-red-400 dark:bg-red-800 rounded-full"></div>
                </div>
              </div>
            </div>
          );

        default:
          return (
            <div className="w-full h-full bg-gray-800 dark:bg-gray-100 rounded-lg flex items-center justify-center">
              <Icon className="w-4 h-4 sm:w-6 sm:h-6 text-gray-300 dark:text-gray-600" />
            </div>
          );
      }
    };

    return (
      <motion.button
        onClick={() => handleToolClick(tool)}
        className={`${
          sizeClasses[size]
        } bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-xl sm:rounded-2xl p-2 sm:p-3 shadow-lg border border-white/20 dark:border-white/10 transition-all duration-300 group ${
          isActive
            ? "ring-2 ring-primary/50 shadow-2xl bg-white/20 dark:bg-black/30"
            : ""
        }`}
        whileHover={{
          y: -4,
          scale: 1.03,
          boxShadow:
            "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          backgroundColor: "rgba(255, 255, 255, 0.15)",
        }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        <div className="flex flex-col h-full gap-1 sm:gap-2">
          <div className="flex items-start justify-between mb-0.5 sm:mb-1">
            <h3
              className={`font-medium text-xs leading-tight transition-colors duration-200 group-hover:text-primary ${
                isActive ? "text-primary" : "text-foreground/80"
              }`}
            >
              {tool.name}
            </h3>
            {isActive && (
              <motion.div
                className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary flex-shrink-0"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </div>
          <div className="flex-1 min-h-0">{renderWidgetContent()}</div>
        </div>
      </motion.button>
    );
  };

  const getInitials = (email: string) => {
    return email
      .split("@")[0]
      .split(".")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
      navigate('/signin');
    }
  };

  // Role-based navigation handler for profile click
  const handleProfileClick = useCallback(() => {
    // Admin, Educator+, and Educator → Trading Signals tab
    if (isAdmin || isEducatorPlus || isEducator) {
      navigate("/dashboard/advanced-tools?admin=signals");
      return;
    }
    
    // Moderator → Account Requests tab
    if (isModerator) {
      navigate("/dashboard/advanced-tools?admin=requests");
      return;
    }
    
    // Regular users → No navigation (do nothing)
  }, [isAdmin, isEducatorPlus, isEducator, isModerator, navigate]);

  return (
    <>
      <EdgeIndicator isVisible={isVisible} canTrigger={showEdgeIndicator} />
      
      <motion.aside
        ref={sidebarRef}
        className={`fixed left-2 sm:left-4 top-16 sm:top-20 z-[60] h-[calc(100vh-4.5rem)] sm:h-[calc(100vh-5rem)] w-64 sm:w-72 md:w-80 lg:w-96 bg-background/30 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl ${className}`}
        initial={{ x: "-110%", opacity: 0 }}
        animate={{
          x: isVisible ? 0 : "-110%",
          opacity: isVisible ? 1 : 0,
        }}
        exit={{
          x: "-110%",
          opacity: 0,
          transition: { 
            type: "spring", 
            stiffness: 400, 
            damping: 30,
            duration: 0.3
          }
        }}
        transition={{
          type: "spring",
          stiffness: prefersReducedMotion ? 200 : (isMobile ? 280 : 260),
          damping: prefersReducedMotion ? 40 : (isMobile ? 20 : 25),
          mass: isMobile ? 0.5 : 0.6,
        }}
        drag={isVisible ? "x" : false}
        dragConstraints={{ left: isMobile ? -300 : -320, right: 0 }}
        dragElastic={isMobile ? 0.15 : 0.2}
        dragMomentum={!prefersReducedMotion}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => {
          setIsHovering(false);
          if (!isDragging) {
            setIsVisible(false);
          }
        }}
        whileHover={!isDragging && !isMobile ? {
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          scale: 1.01,
        } : {}}
        style={{
          x: dragX,
          opacity: isDragging ? opacity : undefined,
          scale: isDragging ? scale : undefined,
          filter: isDragging ? `blur(${blur}px)` : undefined,
          touchAction: 'pan-y pinch-zoom',
          pointerEvents: isVisible ? 'auto' : 'none',
        }}
        role="complementary"
        aria-label="Trading Arsenal Sidebar"
        aria-hidden={!isVisible}
      >
        <div className="p-2 sm:p-3 md:p-4 h-full overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border">
          {/* Header with Close Button */}
          <div className="mb-3 sm:mb-4 md:mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-0.5 sm:mb-1">
                Today
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                Trading Arsenal
              </p>
            </div>
            
            {/* Close Button */}
            <motion.button
              onClick={handleClose}
              className="p-1.5 rounded-lg hover:bg-white/10 dark:hover:bg-black/20 transition-all duration-200 text-foreground/60 hover:text-foreground"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Trading Session Indicator */}
          <div className="mb-3 sm:mb-4">
            <TradingSessionIndicator />
          </div>

          {/* Widget Grid */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-6">
            <WidgetTool tool={tradingTools[0]} size="large" />
            <WidgetTool tool={tradingTools[1]} size="small" />
            <WidgetTool tool={tradingTools[2]} size="small" />
            <WidgetTool tool={tradingTools[3]} size="medium" />
            <WidgetTool tool={tradingTools[4]} size="small" />
            <WidgetTool tool={tradingTools[5]} size="small" />
          </div>

          {/* Profile and Controls Section */}
          <div className="relative">
            <motion.div
              className="bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-xl sm:rounded-2xl p-2 sm:p-3 md:p-4 border border-white/20 dark:border-white/10"
              whileHover={{
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
              }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between">
                {/* Profile Section */}
                <motion.button
                  className="flex items-center gap-2 sm:gap-3 hover:bg-white/10 dark:hover:bg-black/20 rounded-lg p-1 sm:p-2 -m-1 sm:-m-2 transition-all duration-200"
                  onClick={handleProfileClick}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-medium">
                      {user?.user_metadata?.first_name &&
                      user?.user_metadata?.last_name
                        ? `${user.user_metadata.first_name.charAt(
                            0
                          )}${user.user_metadata.last_name.charAt(0)}`
                        : user?.email
                        ? getInitials(user.email)
                        : "U"}
                    </span>
                  </div>
                  <div className="text-left min-w-0 flex-1">
                    <div className="text-foreground text-xs sm:text-sm font-medium truncate">
                      {user?.user_metadata?.first_name &&
                      user?.user_metadata?.last_name
                        ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
                        : user?.user_metadata?.full_name ||
                          user?.user_metadata?.display_name ||
                          user?.email?.split("@")[0] ||
                          "User"}
                    </div>
                    <div className="text-foreground/60 text-xs">
                      <DashboardUserRole />
                    </div>
                  </div>
                </motion.button>

                {/* Controls */}
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <motion.button
                    onClick={() => navigate("/dashboard/settings")}
                    className="p-1.5 sm:p-2 rounded-lg hover:bg-white/10 dark:hover:bg-black/20 transition-all duration-200 flex items-center justify-center"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <User className="w-3 h-3 sm:w-4 sm:h-4 text-foreground/60" />
                  </motion.button>
                  <div className="flex items-center justify-center">
                    <ThemeToggle />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Visible Sign Out Button */}
          <div className="mt-3 sm:mt-4">
            <motion.button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/10 dark:border-white/5 text-foreground hover:bg-white/15 dark:hover:bg-black/30 transition-all duration-200"
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-sm sm:text-base font-medium">Sign Out</span>
            </motion.button>
          </div>
        </div>
      </motion.aside>
    </>
  );
}
