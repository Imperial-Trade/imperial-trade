import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpen, Calendar, Calculator, Brain, Search, Scale, ChevronRight, Sparkles, User, BarChart3, Settings, Shield, LogOut, X, Bell, GraduationCap, MessageSquare, Target, Trophy } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { TradingSessionIndicator } from "@/components/ui/TradingSessionIndicator";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthorizationAware } from "@/hooks/useAuthorizationAware";
import { DashboardUserRole } from "@/components/dashboard/DashboardUserRole";
import { EdgeTriggerZone } from "./EdgeTriggerZone";
import { useDeviceDetection } from "@/hooks/useDeviceDetection";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useTopSignalProviders, TopProvider } from "@/hooks/useTopSignalProviders";
import { getAcademyAppUrl, getOrderFlowAppUrl } from "@/utils/environment";

// Define the 6 trading arsenal tools with their correct existing routes
const tradingTools = [{
  name: "Trading Journal",
  icon: BookOpen,
  description: "Log and analyze your trades with AI-powered feedback.",
  route: "/dashboard/advanced-tools?tool=journal"
}, {
  name: "Economic Calendar",
  icon: Calendar,
  description: "Stay ahead of market-moving events and news releases.",
  route: "/dashboard/advanced-tools?tool=calendar"
}, {
  name: "Risk Calculator",
  icon: Calculator,
  description: "Calculate position size, risk, and potential profit.",
  route: "/dashboard/advanced-tools?tool=calculator"
}, {
  name: "Trade Analyst",
  icon: Brain,
  description: "Upload screenshots for deep performance analysis.",
  route: "/dashboard/advanced-tools?tool=analyst"
}, {
  name: "Opportunity Scanner",
  icon: Search,
  description: "Scan markets for high-probability trading setups.",
  route: "/dashboard/advanced-tools?tool=scanner"
}, {
  name: "Risk Simulator",
  icon: Scale,
  description: "Simulate trade setups to assess risk before you enter.",
  route: "/dashboard/advanced-tools?tool=simulator"
}, {
  name: "Pattern Stream",
  icon: Bell,
  description: "Live trading signals and market alerts.",
  route: "/dashboard/signal-stream"
}, {
  name: "Education",
  icon: GraduationCap,
  description: "Courses, videos and learning pathways.",
  route: getAcademyAppUrl(),
  external: true
}, {
  name: "Community",
  icon: MessageSquare,
  description: "Forum, discussions and networking.",
  route: getOrderFlowAppUrl(),
  external: true
}, {
  name: "Tools",
  icon: Target,
  description: "Advanced trading calculators and analyzers.",
  route: "/dashboard/advanced-tools"
}];
interface WidgetSidebarProps {
  className?: string;
}
export function WidgetSidebar({
  className = ""
}: WidgetSidebarProps) {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const {
    user,
    signOut
  } = useAuth();
  const navigate = useNavigate();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Authorization checks
  const {
    isAdmin,
    isEducator,
    isEducatorPlus,
    isModerator
  } = useAuthorizationAware();
  const canAccessAdminPanel = isAdmin || isEducatorPlus || isEducator || isModerator;

  // Fetch top signal providers for leaderboard
  const {
    topProviders,
    isLoading: isLoadingProviders
  } = useTopSignalProviders();
  console.log('📊 WidgetSidebar - Top Providers Data:', {
    isLoading: isLoadingProviders,
    providerCount: topProviders?.length || 0,
    providers: topProviders
  });

  // Device detection
  const deviceInfo = useDeviceDetection();
  const {
    isMobile,
    isTouchDevice
  } = deviceInfo;

  // Location detection for dynamic spacing
  const location = useLocation();

  // Dynamic sizing based on device
  const getSidebarDimensions = () => {
    const { viewportWidth, viewportHeight, deviceCategory, isMobile, isTablet, isDesktop } = deviceInfo;
    
    // Width calculation (percentage-based for mobile, fixed for larger)
    let width = 256; // default (w-64)
    if (isMobile) {
      if (deviceCategory === 'xs') {
        width = Math.floor(viewportWidth * 0.70); // 70% for small phones
      } else if (deviceCategory === 'sm') {
        width = Math.floor(viewportWidth * 0.75); // 75% for standard phones
      } else {
        width = Math.floor(viewportWidth * 0.80); // 80% for large phones
      }
      // Clamp between 240px and 320px
      width = Math.max(240, Math.min(320, width));
    } else if (isTablet) {
      width = 288; // w-72
    } else {
      width = 384; // w-96 for desktop
    }
    
    // Height calculation - device-specific and accurate
    let headerHeight = 0;
    let bottomNavHeight = 0;
    let top = 0;
    
    if (isDesktop) {
      // Desktop: Fixed AuthenticatedAppBar at top (80px, or 64px when collapsed)
      // Using 80px as standard since collapsed state is dynamic
      headerHeight = 80;
      top = 80;
      bottomNavHeight = 0; // No bottom nav on desktop
    } else if (isTablet) {
      // Tablet: No fixed header (overlay sidebar instead)
      headerHeight = 0;
      top = 0;
      bottomNavHeight = 0; // No bottom nav on tablet
    } else {
      // Mobile: No fixed header (Sheet-based sidebar)
      headerHeight = 0;
      top = 0;
      
      // Bottom nav detection: All pages with mobile bottom navigation bars
      const PAGES_WITH_BOTTOM_NAV = [
        '/dashboard/signal-stream',    // SignalStreamBottomNav
        '/dashboard/advanced-tools'     // MobileBottomNav
      ];
      
      const hasBottomNav = PAGES_WITH_BOTTOM_NAV.some(
        page => location.pathname === page || location.pathname.startsWith(page + '?')
      );
      bottomNavHeight = hasBottomNav ? 64 : 0; // ~56px button + 16px padding
    }
    
    // Calculate height - container extends to viewport bottom (don't subtract bottomNavHeight)
    const height = viewportHeight - headerHeight;
    
    return { width, height, top, bottomNavHeight };
  };

  const dimensions = getSidebarDimensions();

  // Swipe detection refs
  const touchStartX = useRef(0);
  const touchStartTime = useRef(0);

  // Track previous visibility state to only invalidate on open transition
  const prevVisibleRef = useRef(false);

  // Force refetch when sidebar opens (only on false → true transition)
  useEffect(() => {
    if (isVisible && !prevVisibleRef.current) {
      console.log('🔄 Sidebar opened - invalidating top providers cache');
      queryClient.invalidateQueries({
        queryKey: ['top-signal-providers']
      });
      // Increment animation key to trigger provider animations
      setAnimationKey(prev => prev + 1);
    }
    prevVisibleRef.current = isVisible;
  }, [isVisible, queryClient]);
  const handleToggleSidebar = useCallback(() => {
    setIsVisible(prev => !prev);
  }, []);
  
  const handleCloseSidebar = useCallback(() => {
    setIsVisible(false);
    
    // Haptic feedback
    if (isTouchDevice && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, [isTouchDevice]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onToggleSidebar: handleToggleSidebar,
    onCloseSidebar: handleCloseSidebar,
    isEnabled: true
  });

  // Click outside to close - simplified
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node) && isVisible) {
        handleCloseSidebar();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isVisible, handleCloseSidebar]);
  const handleToolClick = (tool: (typeof tradingTools)[0]) => {
    setActiveTool(tool.name);
    
    if (tool.external) {
      window.location.href = tool.route;
    } else {
      navigate(tool.route);
    }
  };

  // Manual swipe-to-close detection
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isVisible) return;
    
    touchStartX.current = e.touches[0].clientX;
    touchStartTime.current = Date.now();
  }, [isVisible]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isVisible) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndTime = Date.now();
    
    const swipeDistance = touchStartX.current - touchEndX;
    const swipeTime = touchEndTime - touchStartTime.current;
    const swipeVelocity = swipeDistance / swipeTime;

    // Close if:
    // - Swiped left more than 80px
    // - OR velocity > 0.5 px/ms (fast swipe)
    if (swipeDistance > 80 || swipeVelocity > 0.5) {
      handleCloseSidebar();
      
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(25);
      }
    }
  }, [isVisible, handleCloseSidebar]);

  const handleClose = () => {
    handleCloseSidebar();
  };

  // ProviderWidget Component - Memoized for performance
  const ProviderWidget = React.memo(({
    provider,
    rank
  }: {
    provider: TopProvider;
    rank: 1 | 2 | 3;
  }) => {
    const getRankEmoji = (rank: 1 | 2 | 3) => {
      switch (rank) {
        case 1:
          return "🥇";
        case 2:
          return "🥈";
        case 3:
          return "🥉";
      }
    };
    const getRankGradient = (rank: 1 | 2 | 3) => {
      switch (rank) {
        case 1:
          return "from-yellow-400 via-yellow-500 to-amber-600";
        case 2:
          return "from-gray-300 via-gray-400 to-zinc-500";
        case 3:
          return "from-orange-500 via-orange-600 to-amber-700";
      }
    };
    const getRankGlow = (rank: 1 | 2 | 3) => {
      switch (rank) {
        case 1:
          return "shadow-lg shadow-yellow-500/30";
        case 2:
          return "shadow-md shadow-gray-400/20";
        case 3:
          return "shadow-md shadow-orange-500/20";
      }
    };
    const getRankBorder = (rank: 1 | 2 | 3) => {
      switch (rank) {
        case 1:
          return "border-yellow-500/40";
        case 2:
          return "border-gray-400/40";
        case 3:
          return "border-orange-500/40";
      }
    };
    const formatRoleDisplay = (userType: string) => {
      switch (userType) {
        case 'educator+':
          return 'EDUCATOR+';
        case 'educator':
          return 'EDUCATOR';
        case 'admin':
          return 'ADMIN';
        case 'moderator':
          return 'MODERATOR';
        default:
          return userType.toUpperCase();
      }
    };

    // Determine if this is the #1 card (full width) or #2/#3 (compact)
    const isFullWidth = rank === 1;

    // Size classes based on rank
    const avatarSize = isFullWidth ? "w-10 h-10" : "w-8 h-8";
    const nameSize = isFullWidth ? "text-sm" : "text-xs";
    const pipsSize = isFullWidth ? "text-base" : "text-sm";
    const pipsSuffix = isFullWidth ? "text-xs" : "text-[10px]";
    const signalSize = isFullWidth ? "text-xs" : "text-[10px]";
    const emojiSize = isFullWidth ? "text-2xl" : "text-xl";
    const rankNumSize = isFullWidth ? "text-sm" : "text-xs";
    const roleSize = isFullWidth ? "text-[10px]" : "text-[9px]";
    const cardPadding = isFullWidth ? "p-3" : "p-2";
    const spacing = isFullWidth ? "mb-2" : "mb-1.5";
    return <div 
      className={`
          provider-widget-animated
          relative
          bg-black/50 backdrop-blur-md rounded-xl 
          ${cardPadding}
          border ${getRankBorder(rank)}
          ${getRankGlow(rank)} 
          pointer-events-none
          transition-all duration-300
        `}
        style={{
          animationDelay: `${rank * 0.1}s`
        }}
      >
        {/* Medal - Absolute Top Right */}
        <div className={`absolute ${isFullWidth ? 'top-2 right-2' : 'top-1.5 right-1.5'}`}>
          <span className={emojiSize}>{getRankEmoji(rank)}</span>
        </div>

        {/* Centered Avatar */}
        <div className={`flex justify-center ${isFullWidth ? 'mb-2' : 'mb-1.5 mt-4'}`}>
          <div className={`${avatarSize} rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center overflow-hidden flex-shrink-0`}>
            {provider.avatarUrl ? <img src={provider.avatarUrl} alt={provider.displayName} className="w-full h-full object-cover" /> : <User className={`${isFullWidth ? 'w-5 h-5' : 'w-4 h-4'} text-primary`} />}
          </div>
        </div>

        {/* Centered Name */}
        <div className="text-center mb-1">
          <span className={`${nameSize} ${isFullWidth ? 'font-bold' : 'font-semibold'} text-white truncate block px-1`}>
            {provider.displayName}
          </span>
        </div>

        {/* Centered Badge */}
        <div className={`flex justify-center ${isFullWidth ? 'mb-2' : 'mb-1.5'}`}>
          <span className={`${roleSize} text-gray-400 uppercase tracking-wider font-semibold`}>
            {formatRoleDisplay(provider.userType)}
          </span>
        </div>

        {isFullWidth ? (
          /* Rank #1: Stats Row with Border */
          <div className="flex items-center justify-between pt-2 border-t border-border/30">
            <div className={`${pipsSize} font-bold ${provider.totalPips >= 0 ? 'text-green-400' : 'text-red-400'} flex items-center gap-1`}>
              {provider.totalPips >= 0 ? '+' : ''}{provider.totalPips.toFixed(1)}
              <span className={`${pipsSuffix} text-gray-400 font-normal`}>pips</span>
              {provider.totalPips >= 0 && <span className='text-sm'>🟢</span>}
            </div>
            <div className={`${signalSize} text-foreground`}>
              {provider.signalCount} trade{provider.signalCount !== 1 ? 's' : ''}
            </div>
          </div>
        ) : (
          /* Ranks #2 & #3: Centered Stats */
          <>
            <div className="text-center mb-0.5">
              <div className={`${pipsSize} font-bold ${provider.totalPips >= 0 ? 'text-green-400' : 'text-red-400'} flex items-center justify-center gap-1`}>
                {provider.totalPips >= 0 ? '+' : ''}{provider.totalPips.toFixed(1)}
                <span className={`${pipsSuffix} text-gray-400 font-normal`}>pips</span>
                {provider.totalPips >= 0 && <span className='text-xs'>🟢</span>}
              </div>
            </div>
            <div className={`text-center text-foreground ${signalSize}`}>
              {provider.signalCount} trade{provider.signalCount !== 1 ? 's' : ''}
            </div>
          </>
        )}
      </div>;
  });
  const WidgetTool = ({
    tool,
    size = "small"
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
      large: "col-span-2 h-24 sm:h-28 md:h-32 lg:h-36"
    };
    const renderWidgetContent = () => {
      switch (tool.name) {
        case "Trading Journal":
          return <div className="w-full h-full bg-gradient-to-br from-slate-800 to-gray-900 dark:from-slate-100 dark:to-white rounded-lg overflow-hidden">
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
            </div>;
        case "Economic Calendar":
          return <div className="w-full h-full bg-gradient-to-br from-slate-800 to-purple-900 dark:from-purple-100 dark:to-pink-50 rounded-lg overflow-hidden">
              <div className="p-1 sm:p-2 h-full">
                <div className="grid grid-cols-7 gap-0.5 h-full">
                  {Array.from({
                  length: 14
                }).map((_, i) => <div key={i} className={`rounded-sm ${i === 5 ? "bg-purple-300 dark:bg-purple-700" : i === 9 ? "bg-red-300 dark:bg-red-700" : "bg-gray-600 dark:bg-gray-300"}`}></div>)}
                </div>
              </div>
            </div>;
        case "Risk Calculator":
          return <div className="w-full h-full bg-gradient-to-br from-slate-800 to-emerald-900 dark:from-green-100 dark:to-emerald-50 rounded-lg overflow-hidden">
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
            </div>;
        case "Trade Analyst":
          return <div className="w-full h-full bg-gradient-to-br from-slate-800 to-amber-900 dark:from-orange-100 dark:to-amber-50 rounded-lg overflow-hidden">
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
            </div>;
        case "Opportunity Scanner":
          return <div className="w-full h-full bg-gradient-to-br from-slate-800 to-blue-900 dark:from-cyan-100 dark:to-blue-50 rounded-lg overflow-hidden">
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
            </div>;
        case "Risk Simulator":
          return <div className="w-full h-full bg-gradient-to-br from-slate-800 to-rose-900 dark:from-red-100 dark:to-rose-50 rounded-lg overflow-hidden">
              <div className="p-1 sm:p-2 h-full flex items-center justify-center">
                <div className="relative">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-red-300 dark:border-red-700 rounded-full"></div>
                  <div className="absolute inset-0 border-2 border-red-400 dark:border-red-800 rounded-full animate-ping"></div>
                  <div className="absolute inset-1 sm:inset-2 bg-red-400 dark:bg-red-800 rounded-full"></div>
                </div>
              </div>
            </div>;
        case "Pattern Stream":
          return <div className="w-full h-full bg-gradient-to-br from-slate-800 to-blue-900 dark:from-blue-100 dark:to-cyan-50 rounded-lg overflow-hidden">
              <div className="p-1 sm:p-2 h-full flex items-center justify-center">
                <motion.div animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }} transition={{
                  duration: 2,
                  repeat: Infinity
                }} className="relative">
                  <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-300 dark:text-blue-700" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 dark:bg-green-600 rounded-full animate-pulse" />
                </motion.div>
              </div>
            </div>;
        case "Education":
          return <div className="w-full h-full bg-gradient-to-br from-slate-800 to-purple-900 dark:from-purple-100 dark:to-pink-50 rounded-lg overflow-hidden">
              <div className="p-1 sm:p-2 h-full flex items-center justify-center">
                <motion.div animate={{
                  y: [-2, 2, -2]
                }} transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}>
                  <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-purple-300 dark:text-purple-700" />
                </motion.div>
              </div>
            </div>;
        case "Community":
          return <div className="w-full h-full bg-gradient-to-br from-slate-800 to-green-900 dark:from-green-100 dark:to-emerald-50 rounded-lg overflow-hidden">
              <div className="p-1 sm:p-2 h-full flex items-center justify-center">
                <motion.div animate={{
                  scale: [1, 1.05, 1]
                }} transition={{
                  duration: 2.5,
                  repeat: Infinity
                }}>
                  <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-green-300 dark:text-green-700" />
                </motion.div>
              </div>
            </div>;
        case "Tools":
          return <div className="w-full h-full bg-gradient-to-br from-slate-800 to-orange-900 dark:from-orange-100 dark:to-amber-50 rounded-lg overflow-hidden">
              <div className="p-1 sm:p-2 h-full flex items-center justify-center">
                <motion.div animate={{
                  rotate: [0, 180, 360]
                }} transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "linear"
                }}>
                  <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-orange-300 dark:text-orange-700" />
                </motion.div>
              </div>
            </div>;
        default:
          return <div className="w-full h-full bg-gray-800 dark:bg-gray-100 rounded-lg flex items-center justify-center">
              <Icon className="w-4 h-4 sm:w-6 sm:h-6 text-gray-300 dark:text-gray-600" />
            </div>;
      }
    };
    return <motion.button onClick={() => handleToolClick(tool)} className={`${sizeClasses[size]} bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-xl sm:rounded-2xl p-2 sm:p-3 shadow-lg border border-white/20 dark:border-white/10 transition-all duration-300 group ${isActive ? "ring-2 ring-primary/50 shadow-2xl bg-white/20 dark:bg-black/30" : ""}`} whileHover={{
      y: -4,
      scale: 1.03,
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
      backgroundColor: "rgba(255, 255, 255, 0.15)"
    }} whileTap={{
      scale: 0.97
    }} transition={{
      type: "spring",
      stiffness: 400,
      damping: 17
    }}>
        <div className="flex flex-col h-full gap-1 sm:gap-2">
          <div className="flex items-start justify-between mb-0.5 sm:mb-1">
            <h3 className={`font-medium text-xs leading-tight transition-colors duration-200 group-hover:text-primary ${isActive ? "text-primary" : "text-foreground/80"}`}>
              {tool.name}
            </h3>
            {isActive && <motion.div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary flex-shrink-0" animate={{
            scale: [1, 1.2, 1]
          }} transition={{
            duration: 2,
            repeat: Infinity
          }} />}
          </div>
          <div className="flex-1 min-h-0">{renderWidgetContent()}</div>
        </div>
      </motion.button>;
  };
  const getInitials = (email: string) => {
    return email.split("@")[0].split(".").map(part => part[0]).join("").toUpperCase().slice(0, 2);
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
      navigate("/dashboard/admin-tools?admin=signals");
      handleClose();
      return;
    }

    // Moderator → Account Requests tab
    if (isModerator) {
      navigate("/dashboard/admin-tools?admin=requests");
      handleClose();
      return;
    }

    // Regular users → No navigation (do nothing)
  }, [isAdmin, isEducatorPlus, isEducator, isModerator, navigate]);
  return <>
      <EdgeTriggerZone 
        onTrigger={() => {
          console.log('🚀 Opening sidebar from edge trigger');
          setIsVisible(true);
        }} 
        isVisible={isVisible}
        edgeWidth={isMobile ? 50 : 35}
        showIndicator={true}
      />
      
      {/* Backdrop overlay */}
      {isVisible && (
        <motion.div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[80]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={handleCloseSidebar}
        />
      )}
      
      <motion.aside 
        ref={sidebarRef} 
        className={`fixed left-2 sm:left-4 z-[90] bg-background/30 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl ${className}`}
        style={{
          top: `${dimensions.top}px`,
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          touchAction: 'none',
          pointerEvents: 'auto'
        }}
        initial={{
          x: "-110%",
          opacity: 0
        }} 
        animate={{
          x: isVisible ? 0 : "-110%",
          opacity: isVisible ? 1 : 0
        }} 
        exit={{
          x: "-110%",
          opacity: 0
        }} 
        transition={{
          type: "tween",
          duration: isVisible ? 0.12 : 0.1,
          ease: isVisible ? "easeOut" : "easeIn"
        }} 
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        role="complementary" 
        aria-label="Trading Arsenal Sidebar" 
        aria-hidden={!isVisible}
      >
        <div 
          className="pt-2 px-2 sm:pt-3 sm:px-3 md:pt-4 md:px-4 h-full overflow-y-auto scrollbar-hide"
          style={{ 
            paddingBottom: dimensions.bottomNavHeight > 0 ? `${dimensions.bottomNavHeight + 16}px` : '16px',
            touchAction: 'pan-y',
            overscrollBehavior: 'contain'
          }}
          onTouchStart={(e) => e.stopPropagation()}
        >
          {/* Header with Close Button */}
          <div className="mb-3 sm:mb-4 md:mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-0.5 sm:mb-1">Today's</h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                Trading Arsenal
              </p>
            </div>
            
            {/* Close Button */}
            <motion.button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-white/10 dark:hover:bg-black/20 transition-all duration-200 text-foreground/60 hover:text-foreground" whileHover={{
            scale: 1.1
          }} whileTap={{
            scale: 0.9
          }} aria-label="Close sidebar">
              <X className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Trading Session Indicator */}
          <div className="mb-3 sm:mb-4">
            <TradingSessionIndicator />
          </div>

          {/* Widget Grid */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-6">
          {isLoadingProviders ?
          // Show skeleton loaders for first 3 spots while loading
          <>
                <div className="col-span-2 h-24 bg-muted/50 rounded-xl animate-pulse" />
                <div className="col-span-1 h-20 bg-muted/50 rounded-xl animate-pulse" />
                <div className="col-span-1 h-20 bg-muted/50 rounded-xl animate-pulse" />
                {/* NEW: Navigation cards while loading */}
                <WidgetTool tool={tradingTools[6]} size="small" />
                <WidgetTool tool={tradingTools[7]} size="small" />
                <WidgetTool tool={tradingTools[8]} size="small" />
                <WidgetTool tool={tradingTools[9]} size="small" />
              </> : topProviders.length > 0 ?
          // Smart layout: Providers adapt based on count
          <>
                {/* Provider #1 - Always full width when exists */}
                {topProviders[0] && (
                  <div className="col-span-2" key={`provider-1-${animationKey}`}>
                    <ProviderWidget provider={topProviders[0]} rank={1} />
                  </div>
                )}
                
                {/* Provider #2 - Full width if no #3, half width if #3 exists */}
                {topProviders[1] && (
                  <div className={topProviders[2] ? "col-span-1" : "col-span-2"} key={`provider-2-${animationKey}`}>
                    <ProviderWidget provider={topProviders[1]} rank={2} />
                  </div>
                )}
                
                {/* Provider #3 - Only render if exists */}
                {topProviders[2] && (
                  <div className="col-span-1" key={`provider-3-${animationKey}`}>
                    <ProviderWidget provider={topProviders[2]} rank={3} />
                  </div>
                )}
                
                {/* 4 Navigation Quick-Access Cards - Always 2x2 grid */}
                <WidgetTool tool={tradingTools[6]} size="small" />
                <WidgetTool tool={tradingTools[7]} size="small" />
                <WidgetTool tool={tradingTools[8]} size="small" />
                <WidgetTool tool={tradingTools[9]} size="small" />
              </> :
          // No providers - show empty placeholders + 4 navigation cards
          <>
                {/* Empty placeholder for Provider #1 - Full width */}
                <div className="col-span-2 h-24 bg-muted/20 dark:bg-muted/10 rounded-xl border-2 border-dashed border-muted/30 flex items-center justify-center">
                  <div className="text-center text-muted-foreground/50 text-xs">
                    <Trophy className="w-6 h-6 mx-auto mb-1 opacity-30" />
                    <p>Top Provider #1</p>
                  </div>
                </div>
                
                {/* Empty placeholder for Provider #2 - Half width */}
                <div className="col-span-1 h-20 bg-muted/20 dark:bg-muted/10 rounded-xl border-2 border-dashed border-muted/30 flex items-center justify-center">
                  <div className="text-center text-muted-foreground/50 text-xs">
                    <Trophy className="w-5 h-5 mx-auto mb-1 opacity-30" />
                    <p className="text-[10px]">Top #2</p>
                  </div>
                </div>
                
                {/* Empty placeholder for Provider #3 - Half width */}
                <div className="col-span-1 h-20 bg-muted/20 dark:bg-muted/10 rounded-xl border-2 border-dashed border-muted/30 flex items-center justify-center">
                  <div className="text-center text-muted-foreground/50 text-xs">
                    <Trophy className="w-5 h-5 mx-auto mb-1 opacity-30" />
                    <p className="text-[10px]">Top #3</p>
                  </div>
                </div>
                
                {/* 4 Navigation Quick-Access Cards */}
                <WidgetTool tool={tradingTools[6]} size="small" />
                <WidgetTool tool={tradingTools[7]} size="small" />
                <WidgetTool tool={tradingTools[8]} size="small" />
                <WidgetTool tool={tradingTools[9]} size="small" />
              </>}
          </div>

          {/* Profile and Controls Section */}
          <div className="relative">
            <motion.div className="bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-xl sm:rounded-2xl p-2 sm:p-3 md:p-4 border border-white/20 dark:border-white/10" whileHover={{
            backgroundColor: "rgba(255, 255, 255, 0.15)",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
          }} transition={{
            duration: 0.2
          }}>
              <div className="flex items-center justify-between">
                {/* Profile Section */}
                <motion.button className="flex items-center gap-2 sm:gap-3 hover:bg-white/10 dark:hover:bg-black/20 rounded-lg p-1 sm:p-2 -m-1 sm:-m-2 transition-all duration-200" onClick={handleProfileClick} whileHover={{
                scale: 1.02
              }} whileTap={{
                scale: 0.98
              }}>
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-medium">
                      {user?.user_metadata?.first_name && user?.user_metadata?.last_name ? `${user.user_metadata.first_name.charAt(0)}${user.user_metadata.last_name.charAt(0)}` : user?.email ? getInitials(user.email) : "U"}
                    </span>
                  </div>
                  <div className="text-left min-w-0 flex-1">
                    <div className="text-foreground text-xs sm:text-sm font-medium truncate">
                      {user?.user_metadata?.first_name && user?.user_metadata?.last_name ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}` : user?.user_metadata?.full_name || user?.user_metadata?.display_name || user?.email?.split("@")[0] || "User"}
                    </div>
                    <div className="text-foreground/60 text-xs">
                      <DashboardUserRole />
                    </div>
                  </div>
                </motion.button>

                {/* Controls */}
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <motion.button onClick={() => navigate("/dashboard/settings")} className="p-1.5 sm:p-2 rounded-lg hover:bg-white/10 dark:hover:bg-black/20 transition-all duration-200 flex items-center justify-center" whileHover={{
                  scale: 1.1
                }} whileTap={{
                  scale: 0.9
                }}>
                    <User className="w-3 h-3 sm:w-4 sm:h-4 text-foreground/60" />
                  </motion.button>
                  <div className="flex items-center justify-center">
                    <ThemeToggle />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Admin Tools Access - Only for privileged users */}
          {canAccessAdminPanel && <div className="mt-3 sm:mt-4">
              <motion.button onClick={() => {
            if (isAdmin || isEducatorPlus || isEducator) {
              navigate('/dashboard/admin-tools?admin=signals');
            } else if (isModerator) {
              navigate('/dashboard/admin-tools?admin=requests');
            }
            handleClose();
          }} className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 hover:border-amber-500/50 transition-all duration-200 group backdrop-blur-md" whileHover={{
            scale: 1.02,
            y: -2
          }} whileTap={{
            scale: 0.98
          }}>
                <Shield className="h-4 h-4 sm:h-5 sm:w-5 text-amber-400 group-hover:text-amber-300 transition-colors" />
                <div className="flex-1 text-left">
                  <p className="text-xs sm:text-sm font-semibold text-amber-300">Admin Tools</p>
                  <p className="text-[10px] sm:text-xs text-amber-400/70">Manage signals, users & more</p>
                </div>
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-amber-400/50 group-hover:text-amber-300 transition-colors" />
              </motion.button>
            </div>}

          {/* Visible Sign Out Button */}
          <div className="mt-3 sm:mt-4">
            <motion.button onClick={handleSignOut} className="w-full flex items-center justify-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/10 dark:border-white/5 text-foreground hover:bg-white/15 dark:hover:bg-black/30 transition-all duration-200" whileHover={{
            scale: 1.02,
            y: -2
          }} whileTap={{
            scale: 0.98
          }}>
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-sm sm:text-base font-medium">Sign Out</span>
            </motion.button>
          </div>
        </div>
      </motion.aside>
    </>;
}