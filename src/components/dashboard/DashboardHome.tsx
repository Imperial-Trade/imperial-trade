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
import { ProfessionalNotificationModal } from "@/components/notifications/ProfessionalNotificationModal";
import { useOneSignalPush } from "@/hooks/useOneSignalPush";
import { getOrderFlowAppUrl, getAcademyAppUrl } from "@/utils/environment";
import { AnimatedLinesBackground } from "@/components/dashboard/AnimatedLinesBackground";

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
  return <div className="relative h-screen overflow-hidden bg-black">
      {/* Animated Background with Video & Glassmorphism */}
      <AnimatedLinesBackground />
      
      {/* Single Page Layout - No Scrolling */}
      <div className="relative z-20 h-screen flex items-center justify-center px-6">
        <div className="container mx-auto max-w-5xl">
          {/* Compact Welcome Header */}
          <div className="text-center space-y-6">
            <h1 className="text-3xl lg:text-5xl xl:text-6xl font-bold">
              <TypewriterText text={welcomeText} speed={80} showCursor={false} cursorBlinkSpeed={500} themeAware={true} />
            </h1>
            <p className="text-base lg:text-lg xl:text-xl max-w-3xl mx-auto leading-relaxed font-light text-zinc-400">
              You've taken the brave step into the world of trading education. Every
              successful trader was once a beginner, and every champion was once a
              student who refused to give up.
            </p>
          </div>
        </div>
      </div>

      {/* Professional Notification Modal */}
      <ProfessionalNotificationModal isOpen={shouldShowNotificationPrompt} onClose={handleNotificationModalClose} userName={getUserFullName()} />
    </div>;
};