import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
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
  Brain,
  Rss,
  ChevronLeft,
  ChevronRight,
  Shield,
  LogOut,
  Settings,
  CheckCircle2,
  Bell, // Add Bell icon for notifications
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import Athena from "@/components/ai/Athena";
import { User } from '@/api/entities';
import NotificationSystem from "@/components/notifications/NotificationSystem";

const navigationItems: NavigationItem[] = [
  {
    title: "Home",
    url: createPageUrl("Home"),
    icon: Home,
    accessLevel: "free"
  },
  {
    title: "Education",
    url: createPageUrl("Education"),
    icon: BookOpen,
    accessLevel: "user"
  },
  {
    title: "Signal Stream",
    url: createPageUrl("SignalStream"),
    icon: Rss,
    accessLevel: "user"
  },
  {
    title: "Live Sessions",
    url: createPageUrl("Live"),
    icon: Radio,
    accessLevel: "user"
  },
  {
    title: "Community Forum",
    url: createPageUrl("Forum"),
    icon: MessageSquare,
    accessLevel: "user"
  },
  {
    title: "IB Partnership",
    url: createPageUrl("IBPartnership"),
    icon: Briefcase,
    accessLevel: "user"
  },
  {
    title: "Advanced Tools",
    url: createPageUrl("AdvancedTools"),
    icon: Wrench,
    accessLevel: "user"
  },
  {
    title: "My Progress",
    url: createPageUrl("MyProgress"),
    icon: Award,
    accessLevel: "user"
  },
  {
    title: "Settings",
    url: createPageUrl("Settings"),
    icon: Settings,
    accessLevel: "user"
  },
  {
    title: "About",
    url: createPageUrl("About"),
    icon: Info,
    accessLevel: "free"
  },
];

const adminNavigationItems: NavigationItem[] = [
  {
    title: "Admin Panel",
    url: createPageUrl("AdminPanel"),
    icon: Shield,
    adminOnly: true,
    accessLevel: "admin"
  }
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [isAthenaOpen, setIsAthenaOpen] = useState(false);
  const [athenaListening, setAthenaListening] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  // Add an event listener to handle seamless user data updates from other pages
  useEffect(() => {
    const handleUserUpdate = (event) => {
      // Check if the event detail contains the updated user object
      if (event.detail && event.detail.email) {
        // Update the layout's user state directly from the event payload
        setUser(event.detail);
      } else {
        // Fallback to re-fetching if the data is missing from the event
        (async () => {
          try {
            const refreshedUser = await User.me();
            setUser(refreshedUser);
          } catch (error) {
            console.error("Layout failed to refetch user data after update:", error);
          }
        })();
      }
    };

    window.addEventListener('user-updated', handleUserUpdate);

    // Cleanup the event listener when the component unmounts
    return () => {
      window.removeEventListener('user-updated', handleUserUpdate);
    };
  }, []); // Empty dependency array ensures this sets up only once

  // Load user data, handle authentication flow, and redirect
  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await User.me();
        if (currentUser) {
          // Auto-upgrade any authenticated user from 'free' to 'user' access level
          if (!currentUser.access_level || currentUser.access_level === 'free') {
            try {
              await User.updateMyUserData({ access_level: 'user' });
              
              // Determine login method - if no password field exists, it's likely Google login
              const isGoogleLogin = !currentUser.password_hash; // Assuming password_hash exists for email/password users
              
              if (isGoogleLogin) {
                // Set flag for Google users to redirect to name verification
                sessionStorage.setItem('isFirstLoginRedirect', 'true');
                sessionStorage.setItem('loginMethod', 'google');
              } else {
                // Set flag for email/password users to show welcome message only
                sessionStorage.setItem('isFirstLoginWelcome', 'true');
                sessionStorage.setItem('loginMethod', 'email');
              }
              
              // Reload user data to get updated access level
              const updatedUser = await User.me();
              setUser(updatedUser);
              
              // Send welcome email for first-time login
              const { sendWelcomeEmail } = await import('@/components/auth/AuthNotifications');
              await sendWelcomeEmail(updatedUser.email, updatedUser.full_name);
              
            } catch (error) {
              console.error('Error updating user access level:', error);
              // If update fails, still set the original user data
              setUser(currentUser);
            }
          } else {
            setUser(currentUser);
          }

          // Redirect authenticated users away from AccessPortal or AccountRequest to Home
          if (currentPageName === 'AccessPortal' || currentPageName === 'AccountRequest') {
            window.location.href = createPageUrl('Home');
            return;
          }
        } else {
          setUser(null);
          // Redirect unauthenticated users to AccessPortal if they try to access protected pages
          const protectedPages = ['Education', 'Live', 'Forum', 'IBPartnership', 'AdvancedTools', 'MyProgress', 'SignalStream', 'AdminPanel', 'Settings'];
          if (protectedPages.includes(currentPageName)) {
            window.location.href = createPageUrl('AccessPortal');
            return;
          }
        }
      } catch (error) {
        console.log("User not authenticated", error);
        setUser(null);
        // Redirect unauthenticated users to AccessPortal if they try to access protected pages
        const protectedPages = ['Education', 'Live', 'Forum', 'IBPartnership', 'AdvancedTools', 'MyProgress', 'SignalStream', 'AdminPanel', 'Settings'];
        if (protectedPages.includes(currentPageName)) {
            window.location.href = createPageUrl('AccessPortal');
            return;
          }
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, [currentPageName]);

  // First-login handling, post-verification welcome
  useEffect(() => {
    if (currentPageName === 'Home' && user) {
      const loginMethod = sessionStorage.getItem('loginMethod');

      // The browser-level notification permission request has been removed
      // as it is unreliable in the preview environment and the in-app
      // notification system provides a better experience.

      // Handle Google login - redirect to name verification
      if (sessionStorage.getItem('isFirstLoginRedirect') === 'true' && loginMethod === 'google') {
        if (window.addNotification) {
          window.addNotification({
            type: 'info',
            title: 'Welcome to Imperial!',
            message: 'Please verify your name. Redirecting to settings in 5 seconds...',
          });
        }

        const timer = setTimeout(() => {
          window.location.href = createPageUrl('Settings?action=verify_name');
        }, 5000);

        // Clean up sessionStorage and the timer
        sessionStorage.removeItem('isFirstLoginRedirect');
        sessionStorage.removeItem('loginMethod');
        return () => clearTimeout(timer);
      }
      
      // Handle email/password login - show welcome message only
      if (sessionStorage.getItem('isFirstLoginWelcome') === 'true' && loginMethod === 'email') {
        if (window.addNotification) {
          window.addNotification({
            type: 'info',
            title: `Welcome ${user.full_name || 'there'}! 🎉`,
            message: 'Your Imperial Trading account is ready. Explore our premium features and start your trading journey!',
          });
        }

        // Clean up sessionStorage after showing welcome
        setTimeout(() => {
          sessionStorage.removeItem('isFirstLoginWelcome');
          sessionStorage.removeItem('loginMethod');
        }, 3000);
      }

      // Handle welcome message after Google name verification
      if (sessionStorage.getItem('nameVerifiedWelcome') === 'true') {
        const verifiedName = sessionStorage.getItem('verifiedName') || user.full_name;
        if (window.addNotification) {
          window.addNotification({
            type: 'info',
            title: `Welcome ${verifiedName}! 🎉`,
            message: 'Your Imperial Trading account is ready. Explore our premium features and start your trading journey!',
          });
        }
        // Clean up session storage after displaying
        sessionStorage.removeItem('nameVerifiedWelcome');
        sessionStorage.removeItem('verifiedName');
      }
    }
  }, [user, currentPageName]);

  // Wake word detection for global Athena activation
  useEffect(() => {
    // Only set up wake word detection if Athena is not already open and not currently loading.
    // Also, only run on client-side (browser).
    if (typeof window !== 'undefined' && !isAthenaOpen && !isLoading) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const wakeWordRecognition = new SpeechRecognition();
        wakeWordRecognition.continuous = true;
        wakeWordRecognition.interimResults = true;
        wakeWordRecognition.lang = 'en-US';

        wakeWordRecognition.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map(result => result[0])
            .map(result => result.transcript)
            .join('')
            .toLowerCase();

          if (transcript.includes('hey athena') || transcript.includes('hi athena')) {
            setIsAthenaOpen(true);
            setAthenaListening(true);
            wakeWordRecognition.stop();
          }
        };

        wakeWordRecognition.onerror = (event) => {
          console.log('Wake word detection error:', event.error);
        };

        try {
          wakeWordRecognition.start();
        } catch (e) {
          console.log("Speech recognition already started or error:", e);
        }
        

        return () => {
          wakeWordRecognition.stop();
        };
      }
    }
  }, [isAthenaOpen, isLoading]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  }

  const handleLogout = async () => {
    try {
      await User.logout();
      window.location.href = createPageUrl('AccessPortal');
    } catch (error) {
      console.error("Logout failed:", error);
      window.location.href = createPageUrl('AccessPortal');
    }
  };

  // Filter navigation items based on user access level
  const getFilteredNavigationItems = () => {
    if (!user) return navigationItems.filter(item => item.accessLevel === "free");
    
    const userAccessLevel = user.access_level || "user"; 
    
    let filteredItems = navigationItems.filter(item => {
      if (item.accessLevel === "free") return true;
      if (item.accessLevel === "user" && (userAccessLevel === "user" || userAccessLevel === "verified" || userAccessLevel === "admin")) return true;
      return false;
    });

    if (userAccessLevel === "admin") {
      filteredItems = [...filteredItems, ...adminNavigationItems];
    }

    return filteredItems;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-accent-green mx-auto mb-4"></div>
          <p className="text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  if (currentPageName === 'AccessPortal' || currentPageName === 'AccountRequest') {
    return <div>{children}</div>;
  }

  const allNavigationItems = getFilteredNavigationItems();

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-primary">
        <style>{`
          :root.dark {
            --background: #111827;
            --surface: #1f293b;
            --border: #374151;
            --text-primary: #f9fafb;
            --text-secondary: #9ca3af;
            --accent-green: #10b981;
            --accent-red: #ef4444;
            --accent-gold: #c09a58;
            --accent-blue: #3b82f6;
            --card-background: rgba(31, 41, 59, 0.5);
            --card-border: #374151;
            --signal-buy: #10b981;
            --signal-sell: #ef4444;
            --signal-pending: #f59e0b;
            --signal-closed: #6b7280;
          }
          :root.light {
              --background: #f8fafc;
              --surface: #ffffff;
              --border: #e2e8f0;
              --text-primary: #1e293b;
              --text-secondary: #64748b;
              --accent-green: #059669;
              --accent-red: #dc2626;
              --accent-gold: #d97706;
              --accent-blue: #2563eb;
              --card-background: rgba(255, 255, 255, 0.9);
              --card-border: #e2e8f0;
              --signal-buy: #059669;
              --signal-sell: #dc2626;
              --signal-pending: #d97706;
              --signal-closed: #64748b;
          }

          .bg-background { background-color: var(--background); transition: background-color 0.3s ease; }
          .bg-surface { background-color: var(--surface); transition: background-color 0.3s ease; }
          .border-default { border-color: var(--border); transition: border-color 0.3s ease; }
          .text-primary { color: var(--text-primary); transition: color 0.3s ease; }
          .text-secondary { color: var(--text-secondary); transition: color 0.3s ease; }
          .text-accent-green { color: var(--accent-green); }
          .bg-accent-green { background-color: var(--accent-green); }
          .hover\\:bg-accent-green:hover { background-color: var(--accent-green); }
          .text-accent-red { color: var(--accent-red); }
          .bg-accent-red { background-color: var(--accent-red); }
          .text-accent-gold { color: var(--accent-gold); }
          .text-accent-blue { color: var(--accent-blue); }

          /* Imperial Trading Signal Colors */
          .signal-buy { color: var(--signal-buy); }
          .signal-sell { color: var(--signal-sell); }
          .signal-pending { color: var(--signal-pending); }
          .signal-closed { color: var(--signal-closed); }
          .bg-signal-buy { background-color: var(--signal-buy); }
          .bg-signal-sell { background-color: var(--signal-sell); }
          .bg-signal-pending { background-color: var(--signal-pending); }
          .bg-signal-closed { background-color: var(--signal-closed); }
          
          /* Signal Badge Styles */
          .signal-buy-badge { 
            background-color: color-mix(in srgb, var(--signal-buy) 15%, transparent); 
            color: var(--signal-buy); 
            border-color: color-mix(in srgb, var(--signal-buy) 30%, transparent);
          }
          .signal-sell-badge { 
            background-color: color-mix(in srgb, var(--signal-sell) 15%, transparent); 
            color: var(--signal-sell); 
            border-color: color-mix(in srgb, var(--signal-sell) 30%, transparent);
          }
          .signal-pending-badge { 
            background-color: color-mix(in srgb, var(--signal-pending) 15%, transparent); 
            color: var(--signal-pending); 
            border-color: color-mix(in srgb, var(--signal-pending) 30%, transparent);
          }

          .glass-effect {
            background: var(--card-background);
            backdrop-filter: blur(12px);
            border: 1px solid var(--card-border);
            transition: background-color 0.3s ease, border-color 0.3s ease;
          }
          
          :root.light .glass-effect {
              background: rgba(255, 255, 255, 0.95);
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          }

          :root.dark .glass-effect {
              background: rgba(31, 41, 59, 0.7);
          }

          .gold-text-gradient {
            background: linear-gradient(135deg, var(--accent-gold), #e6d3b3);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }

          /* Enhanced Light Theme Card Styles */
          :root.light .trade-card {
            background: rgba(255, 255, 255, 0.95);
            border: 1px solid #e2e8f0;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          }
          
          :root.light .trade-card:hover {
            border-color: var(--accent-green);
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          }

          :root.light .trade-card-surface {
            background: rgba(248, 250, 252, 0.8);
          }

          :root.dark .trade-card-surface {
            background: rgba(17, 24, 39, 0.5);
          }

          /* Light Theme Price Rows */
          :root.light .price-row {
            border-color: #e2e8f0;
          }
          
          :root.light .price-row.hit {
            background-color: rgba(5, 150, 105, 0.1);
          }

          :root.dark .price-row {
            border-color: rgba(55, 65, 81, 0.5);
          }
          
          :root.dark .price-row.hit {
            background-color: rgba(16, 185, 129, 0.2);
          }

          /* Status Indicators Light Theme */
          :root.light .status-indicator-success {
            background: linear-gradient(to right, rgba(5, 150, 105, 0.5), rgba(5, 150, 105, 0.7), rgba(5, 150, 105, 0.5));
            box-shadow: 0 0 10px rgba(5, 150, 105, 0.3);
          }
          
          :root.light .status-indicator-danger {
            background: linear-gradient(to right, rgba(220, 38, 38, 0.5), rgba(220, 38, 38, 0.7), rgba(220, 38, 38, 0.5));
            box-shadow: 0 0 10px rgba(220, 38, 38, 0.3);
          }
          
          :root.light .status-indicator-warning {
            background: linear-gradient(to right, rgba(217, 119, 6, 0.5), rgba(217, 119, 6, 0.7), rgba(217, 119, 6, 0.5));
            box-shadow: 0 0 10px rgba(217, 119, 6, 0.3);
          }

          .glow-effect-green {
            box-shadow: 0 0 20px color-mix(in srgb, var(--accent-green) 30%, transparent);
          }
          .glow-effect-gold {
            box-shadow: 0 0 20px color-mix(in srgb, var(--accent-gold) 30%, transparent);
          }
          .glow-effect-blue {
            box-shadow: 0 0 20px color-mix(in srgb, var(--accent-blue) 30%, transparent);
          }

          /* Keyframe animation for the eligibility check glow */
          @keyframes eligibility-glow {
            0% {
              box-shadow: 0 0 0px color-mix(in srgb, var(--accent-gold) 0%, transparent);
            }
            50% {
              box-shadow: 0 0 40px 15px color-mix(in srgb, var(--accent-gold) 40%, transparent);
            }
            100% {
              box-shadow: 0 0 0px color-mix(in srgb, var(--accent-gold) 0%, transparent);
            }
          }

          .glow-animation {
            animation: eligibility-glow 2s ease-in-out;
          }

          .athena-pulse {
            animation: athena-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }

          @keyframes athena-pulse {
            0%, 100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: .8;
              transform: scale(1.05);
            }
          }

          /* Content transition */
          .content-transition {
            transition: margin-left 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          }

          /* Light theme button enhancements */
          :root.light .btn-signal-buy {
            background: var(--signal-buy);
            color: white;
            border: none;
            box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2);
          }
          
          :root.light .btn-signal-sell {
            background: var(--signal-sell);
            color: white;
            border: none;
            box-shadow: 0 2px 4px rgba(220, 38, 38, 0.2);
          }
          
          :root.light .btn-signal-pending {
            background: var(--signal-pending);
            color: white;
            border: none;
            box-shadow: 0 2px 4px rgba(217, 119, 6, 0.2);
          }

          /* Scroll Animation Styles */
          .scroll-reveal {
            opacity: 0;
            transform: translateY(40px);
            transition: opacity 1s ease-out, transform 1s ease-out;
            will-change: opacity, transform;
          }
          .scroll-reveal.visible {
            opacity: 1;
            transform: translateY(0);
          }

          /* Parallax Container */
          .parallax-container {
            height: 100vh;
            overflow: hidden;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          /* Parallax Background */
          .parallax-bg {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 150%;
            background-size: cover;
            background-position: center;
            z-index: -1;
            will-change: transform;
          }

          .content-overlay {
            position: relative;
            z-index: 1;
            width: 100%;
            padding: 2rem;
            background: rgba(17, 24, 39, 0.5);
            backdrop-filter: blur(5px);
          }

          :root.light .content-overlay {
            background: rgba(248, 250, 252, 0.6);
          }

          /* AI Tech Font Styles */
          .imperial-tech-font {
            font-family: 'Orbitron', 'Courier New', monospace;
            font-weight: 700;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            background: linear-gradient(135deg, #e6d3b3, var(--accent-gold));
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

        {/* Floating Sidebar Toggle Button (when collapsed) */}
        {isCollapsed && (
          <div className="fixed left-4 top-4 z-50 hidden lg:block">
            <Button
              onClick={toggleSidebar}
              size="sm"
              className="w-10 h-10 rounded-full bg-surface/90 backdrop-blur-md border border-default hover:bg-surface shadow-lg glow-effect-gold"
            >
              <ChevronRight className="w-5 h-5 text-primary" />
            </Button>
          </div>
        )}

        {/* Desktop Sidebar */}
        <aside className={`fixed left-0 top-0 z-40 h-screen bg-surface/90 backdrop-blur-md border-r border-default transition-all duration-300 hidden lg:block ${
          isCollapsed ? '-translate-x-full opacity-0 pointer-events-none' : 'translate-x-0 opacity-100 w-64'
        }`}>
          {/* Sidebar Header */}
          <div className="p-4 border-b border-default">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-surface rounded-lg flex items-center justify-center glow-effect-gold">
                  <Crown className="w-6 h-6 text-accent-gold" />
                </div>
                <div className="text-left">
                  <h2 className="font-bold text-xl imperial-tech-font drop-shadow-lg">IMPERIAL</h2>
                  <p className="text-xs text-secondary">Trading Community</p>
                </div>
              </div>
              <Button
                onClick={toggleSidebar}
                size="sm"
                variant="ghost"
                className="p-2 rounded-full hover:bg-surface"
              >
                <ChevronLeft className="w-4 h-4 text-secondary" />
              </Button>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 px-3 py-4 space-y-2">
            {allNavigationItems.map((item, index) => {
              const isActive = location.pathname === item.url ||
                              (item.url.includes(currentPageName) && currentPageName);

              return (
                <Link
                  key={index}
                  to={item.url}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                    isActive
                      ? 'bg-accent-green text-white shadow-lg'
                      : 'text-secondary hover:text-primary hover:bg-surface/60'
                  }`}
                >
                  <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-secondary group-hover:text-primary'}`} />
                  <span className="font-medium truncate">{item.title}</span>
                  {item.adminOnly && (
                    <Crown className="w-4 h-4 text-accent-gold ml-auto" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Bottom Section */}
          <div className="p-3 border-t border-default">
            {user ? (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-surface/60">
                <div className="w-8 h-8 bg-accent-green rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">
                    {user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-primary truncate">
                      {user.full_name || 'User'}
                    </p>
                    {user.access_level === 'verified' && user.verification_status === 'approved' && (
                      <CheckCircle2 className="w-4 h-4 text-accent-blue flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-secondary truncate">{user.email}</p>
                  <div className="flex gap-1 mt-1">
                    {user.access_level === 'admin' && (
                      <Badge className="bg-accent-gold/20 text-accent-gold text-xs">
                        Educator
                      </Badge>
                    )}
                    {user.access_level === 'verified' && (
                      <Badge className="bg-accent-blue/20 text-accent-blue text-xs">
                        Verified
                      </Badge>
                    )}
                    {user.access_level === 'user' && (
                      <Badge className="bg-accent-green/20 text-accent-green text-xs">
                        Member
                      </Badge>
                    )}
                    {user.access_level === 'free' && (
                      <Badge className="bg-accent-blue/20 text-accent-blue text-xs">
                        Free Tier
                      </Badge>
                    )}
                  </div>
                </div>
                 <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleLogout}
                            className="text-secondary hover:text-accent-red"
                        >
                            <LogOut className="w-4 h-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Sign Out</p>
                    </TooltipContent>
                </Tooltip>
              </div>
            ) : (
              <div className="space-y-2">
                 <Link to={createPageUrl('AccessPortal')}>
                    <Button
                      className="w-full bg-accent-green hover:bg-green-500 text-white"
                      size="sm"
                    >
                      Sign In / Join
                    </Button>
                 </Link>
              </div>
            )}

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="mt-2 w-full text-secondary hover:text-primary hover:bg-surface/60"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span className="ml-2">Toggle Theme</span>
            </Button>
          </div>
        </aside>

        {/* Mobile Navigation */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-50 glass-effect">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-surface rounded-lg flex items-center justify-center glow-effect-gold">
                  <Crown className="w-5 h-5 text-accent-gold" />
                </div>
                <h2 className="font-bold text-lg imperial-tech-font drop-shadow-lg">IMPERIAL</h2>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-surface">
                  {theme === 'dark' ? <Sun className="w-5 h-5 text-secondary" /> : <Moon className="w-5 h-5 text-secondary" />}
                </button>
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="p-2 rounded-lg hover:bg-surface transition-colors"
                >
                  {isMobileMenuOpen ? (
                    <X className="w-6 h-6 text-primary" />
                  ) : (
                    <Menu className="w-6 h-6 text-primary" />
                  )}
                </button>
              </div>
            </div>

          {/* Mobile Menu Overlay */}
          {isMobileMenuOpen && (
            <div className="absolute top-full left-0 right-0 glass-effect border-t border-default">
              <div className="p-4 space-y-2">
                {allNavigationItems.map((item) => (
                  <Link
                    key={item.title}
                    to={item.url}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                      location.pathname === item.url
                        ? 'bg-green-500/10 text-accent-green'
                        : 'text-secondary hover:bg-surface hover:text-primary'
                    } ${item.adminOnly ? 'border border-accent-gold/20' : ''}`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.title}</span>
                    {item.adminOnly && (
                      <Badge className="bg-accent-gold/20 text-accent-gold text-xs ml-auto">
                        ADMIN
                      </Badge>
                    )}
                  </Link>
                ))}
                {/* Mobile Theme Toggle */}
                <Button
                  variant="ghost"
                  onClick={toggleTheme}
                  className="w-full text-secondary hover:text-primary hover:bg-surface/60"
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  <span className="ml-2">Toggle Theme</span>
                </Button>
                
                {/* Mobile User Section */}
                <div className="border-t border-default pt-4 mt-2">
                {user ? (
                    <div className="space-y-2">
                        <div className="flex items-center gap-3 px-4 py-2">
                            <div className="w-8 h-8 bg-accent-green rounded-full flex items-center justify-center">
                                <span className="text-white text-sm font-bold">
                                {user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-primary truncate">{user.full_name || 'User'}</p>
                                  {user.access_level === 'verified' && user.verification_status === 'approved' && (
                                    <CheckCircle2 className="w-4 h-4 text-accent-blue flex-shrink-0" />
                                  )}
                                </div>
                                <p className="text-xs text-secondary truncate">{user.email}</p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            onClick={handleLogout}
                            className="w-full justify-start text-secondary hover:text-accent-red hover:bg-surface/60 gap-3 px-4 py-3"
                        >
                            <LogOut className="w-5 h-5" />
                            <span>Sign Out</span>
                        </Button>
                    </div>
                ) : (
                  <Link to={createPageUrl('AccessPortal')}>
                    <Button
                      className="w-full bg-accent-green hover:bg-green-500 text-white"
                      size="sm"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Sign In / Join
                    </Button>
                  </Link>
                )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content with adjusted margins for floating arrow */}
        <main className={`flex-1 overflow-auto bg-background transition-all duration-300 ${
          isCollapsed ? (currentPageName === 'Home' ? 'lg:ml-0' : 'lg:ml-0 lg:px-14') : 'lg:ml-64 lg:pl-0'
        }`}>
          {/* Mobile spacing remains the same */}
          <div className="lg:hidden h-20"></div>
          
          {/* Desktop spacing adjusted for floating arrow when collapsed */}
          <div className={`lg:block hidden transition-all duration-300 ${
            isCollapsed ? 'h-16' : 'h-0'
          }`}></div>
          
          {/* Content wrapper */}
          <div className={`transition-all duration-300`}>
            {children}
          </div>
        </main>

        {/* Enhanced Athena AI Integration - adjusted position when sidebar is collapsed */}
        <div className={`fixed bottom-8 z-[100] transition-all duration-300 ${
          isCollapsed ? 'right-8' : 'right-8'
        }`}>
          <button
            onClick={() => setIsAthenaOpen(true)}
            className="w-16 h-16 bg-accent-gold rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all duration-300 glow-effect-gold athena-pulse"
          >
            <Brain className="w-8 h-8 text-white" />
          </button>

          {/* Voice Status Indicator */}
          {athenaListening && (
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
              <div className="w-3 h-3 bg-white rounded-full"></div>
            </div>
          )}

          {/* Wake Word Hint */}
          <div className="absolute bottom-full right-0 mb-2 bg-surface/90 backdrop-blur-sm text-primary text-xs px-3 py-1 rounded-lg border border-default opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            Say "Hey Athena"
          </div>
        </div>

        <Athena
          isOpen={isAthenaOpen}
          onClose={() => {
            setIsAthenaOpen(false);
            setAthenaListening(false);
          }}
          autoListen={athenaListening}
        />
        <NotificationSystem />
      </div>
    </TooltipProvider>
  );
}
