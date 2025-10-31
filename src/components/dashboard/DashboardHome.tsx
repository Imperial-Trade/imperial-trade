import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TypewriterText } from "@/components/ui/typewriter-text";
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Users, Bell, Plus, ArrowRight, Activity, Target, Zap, Star, Award } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWelcome } from "@/contexts/WelcomeContext";
import { useNotificationPrompt } from "@/contexts/NotificationPromptContext";
import { AnimatedLinesBackground } from "@/components/dashboard/AnimatedLinesBackground";
import { ProfessionalNotificationModal } from "@/components/notifications/ProfessionalNotificationModal";
import { useOneSignalPush } from "@/hooks/useOneSignalPush";
import { getOrderFlowAppUrl, getAcademyAppUrl } from "@/utils/environment";
export const DashboardHome: React.FC = () => {
  const {
    user
  } = useAuth();
  const {
    hasSeenWelcome
  } = useWelcome();
  const {
    hasSeenNotificationPrompt,
    shouldShowNotificationPrompt,
    setShouldShowNotificationPrompt,
    isSubscribedToPush
  } = useNotificationPrompt();
  const {
    isPushEnabled,
    isInitialized
  } = useOneSignalPush();
  const isAdmin = user?.user_metadata?.access_level === "admin";
  const isEducator = user?.user_metadata?.user_type === "educator";

  // Show notification modal after welcome animation completes or after login
  useEffect(() => {
    if (!user || !isInitialized) return;

    // Don't show if user is already subscribed to push notifications or welcome animation is showing
    if (isSubscribedToPush || isPushEnabled || !hasSeenWelcome) return;
    const timer = setTimeout(() => {
      setShouldShowNotificationPrompt(true);
    }, 1500); // 1.5 seconds delay for immediate visibility

    return () => clearTimeout(timer);
  }, [user, isInitialized, isSubscribedToPush, isPushEnabled, hasSeenWelcome, setShouldShowNotificationPrompt]);
  const handleNotificationModalClose = () => {
    setShouldShowNotificationPrompt(false);
    // Don't mark as seen here - only mark when actually subscribed in the modal
  };

  // Get user's full name for the typewriter effect
  const getUserFullName = () => {
    if (user?.user_metadata?.first_name && user?.user_metadata?.last_name) {
      return `${user.user_metadata.first_name} ${user.user_metadata.last_name}`;
    }
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    if (user?.user_metadata?.display_name) {
      return user.user_metadata.display_name;
    }
    return user?.email?.split("@")[0] || "Trader";
  };
  const welcomeText = `Welcome to Trade Imperial\n${getUserFullName()}`;
  return <div className="relative min-h-screen overflow-y-auto lg:h-screen lg:overflow-hidden">
      {/* Animated Background */}
      <AnimatedLinesBackground />

      {/* Single Page Layout - No Scrolling */}
      <div className="relative z-20 min-h-screen lg:h-screen flex flex-col items-center justify-start lg:justify-center px-6 py-8 lg:py-0">
        <div className="container mx-auto max-w-7xl">
          {/* Compact Welcome Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              <TypewriterText 
                text={welcomeText} 
                speed={80} 
                showCursor={false} 
                cursorBlinkSpeed={500} 
                className="bg-gradient-to-r from-yellow-400 via-white to-primary bg-clip-text text-transparent" 
              />
            </h1>
            <p className="text-base lg:text-lg max-w-3xl mx-auto leading-relaxed font-light text-zinc-400">
              You've taken the brave step into the world of trading education. Every
              successful trader was once a beginner, and every champion was once a
              student who refused to give up.
            </p>
          </div>

          {/* Trading Hub Cards - Centered */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          <Card className="group relative overflow-hidden bg-card border border-border hover:border-primary/50 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-2 cursor-pointer">
            {/* Background Image Layer */}
              <div className="absolute inset-0 z-0">
                <img src="/images/space-background.png" alt="" className="w-full h-full object-cover blur-[12px]" />
            </div>
            
            {/* Glassmorphism Overlay - Blue Tint */}
            <div className="absolute inset-0 z-10" style={{
            background: 'rgba(10, 10, 20, 0.75)',
            backdropFilter: 'blur(8px) saturate(150%)',
            WebkitBackdropFilter: 'blur(8px) saturate(150%)'
          }} />
            
            {/* Hover Enhancement Gradient */}
            <div className="absolute inset-0 z-10 bg-gradient-to-br from-blue-500/10 via-transparent to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            {/* Card Content */}
            <CardHeader className="relative z-20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-white group-hover:text-primary transition-colors">
                    Xeon Alerts
                  </CardTitle>
                  <CardDescription className="text-sm text-zinc-300">
                    Real-time performance tracking
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-20">
              <p className="text-zinc-200 mb-4">
                Monitor your signals with advanced analytics and performance
                metrics.
              </p>
              <Button asChild variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                <Link to="/dashboard/signal-stream">
                  View Analytics
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden bg-card border border-border hover:border-primary/50 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-2 cursor-pointer">
            {/* Background Image Layer */}
              <div className="absolute inset-0 z-0">
                <img src="/images/space-background.png" alt="" className="w-full h-full object-cover blur-[12px]" />
            </div>
            
            {/* Glassmorphism Overlay - Green Tint */}
            <div className="absolute inset-0 z-10" style={{
            background: 'rgba(10, 15, 12, 0.75)',
            backdropFilter: 'blur(8px) saturate(150%)',
            WebkitBackdropFilter: 'blur(8px) saturate(150%)'
          }} />
            
            {/* Hover Enhancement Gradient */}
            <div className="absolute inset-0 z-10 bg-gradient-to-br from-green-500/10 via-transparent to-green-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            {/* Card Content */}
            <CardHeader className="relative z-20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-white group-hover:text-primary transition-colors">
                    Orderflow
                  </CardTitle>
                  <CardDescription className="text-sm text-zinc-300">
                    Connect with top traders
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-20">
              <p className="text-zinc-200 mb-4">
                Join discussions with verified traders and educational contributors.
              </p>
              <Button asChild variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                <a href={getOrderFlowAppUrl()}>
                  Join Community
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden bg-card border border-border hover:border-primary/50 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-2 cursor-pointer">
            {/* Background Image Layer */}
              <div className="absolute inset-0 z-0">
                <img src="/images/space-background.png" alt="" className="w-full h-full object-cover blur-[12px]" />
            </div>
            
            {/* Glassmorphism Overlay - Purple Tint */}
            <div className="absolute inset-0 z-10" style={{
            background: 'rgba(15, 10, 18, 0.75)',
            backdropFilter: 'blur(8px) saturate(150%)',
            WebkitBackdropFilter: 'blur(8px) saturate(150%)'
          }} />
            
            {/* Hover Enhancement Gradient */}
            <div className="absolute inset-0 z-10 bg-gradient-to-br from-purple-500/10 via-transparent to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            {/* Card Content */}
            <CardHeader className="relative z-20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-white group-hover:text-primary transition-colors">
                    Imperial Academy
                  </CardTitle>
                  <CardDescription className="text-sm text-zinc-300">
                    Educational trading sessions
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-20">
              <p className="text-zinc-200 mb-4">
                Participate in live educational sessions with market educators.
              </p>
              <Button asChild variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                <a href={getAcademyAppUrl()}>
                  Join Session
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </a>
              </Button>
            </CardContent>
          </Card>
          </div>
        </div>
      </div>

      {/* Professional Notification Modal */}
      <ProfessionalNotificationModal isOpen={shouldShowNotificationPrompt} onClose={handleNotificationModalClose} userName={getUserFullName()} />
    </div>;
};