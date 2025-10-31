import React, { useEffect } from "react";
import { BarChart3, Users, Zap } from "lucide-react";
import { TypewriterText } from "@/components/ui/typewriter-text";
import { useAuth } from "@/contexts/AuthContext";
import { useWelcome } from "@/contexts/WelcomeContext";
import { useNotificationPrompt } from "@/contexts/NotificationPromptContext";
import { AnimatedLinesBackground } from "@/components/dashboard/AnimatedLinesBackground";
import { TradingHubCard } from "@/components/dashboard/TradingHubCard";
import { ProfessionalNotificationModal } from "@/components/notifications/ProfessionalNotificationModal";
import { useOneSignalPush } from "@/hooks/useOneSignalPush";
import { getOrderFlowAppUrl } from "@/utils/environment";
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
  return <div className="relative h-screen overflow-hidden flex flex-col">
      {/* Video Background */}
      <AnimatedLinesBackground />

      {/* Compact Welcome Section */}
      <div className="relative z-20 flex-shrink-0 pt-12 pb-6">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-3xl lg:text-5xl font-bold mb-4">
            <TypewriterText 
              text={welcomeText} 
              speed={80} 
              showCursor={false} 
              className="bg-gradient-to-r from-yellow-400 via-white to-primary bg-clip-text text-transparent" 
            />
          </h1>
          <p className="text-sm lg:text-base text-muted-foreground max-w-2xl mx-auto">
            Your trading mastery journey starts now.
          </p>
        </div>
      </div>

      {/* Trading Hub Section with Glassmorphism Cards */}
      <div className="relative z-20 flex-1 flex flex-col justify-center container mx-auto px-6 pb-12">
        <div className="mb-6">
          <h2 className="text-xl lg:text-2xl font-bold tracking-tight mb-1 text-white">
            Trading Hub
          </h2>
          <p className="text-sm text-zinc-400">
            Access your essential trading tools
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 max-w-7xl">
          <TradingHubCard
            title="Xeon Alerts"
            description="Real-time performance tracking"
            icon={BarChart3}
            iconColor="linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)"
            to="/dashboard/signal-stream"
          />
          
          <TradingHubCard
            title="Orderflow"
            description="Connect with top traders"
            icon={Users}
            iconColor="linear-gradient(135deg, #10B981 0%, #059669 100%)"
            href={getOrderFlowAppUrl()}
          />
          
          <TradingHubCard
            title="Imperial Academy"
            description="Live educational sessions"
            icon={Zap}
            iconColor="linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)"
            to="/dashboard/live"
          />
        </div>
      </div>

      {/* Professional Notification Modal */}
      <ProfessionalNotificationModal isOpen={shouldShowNotificationPrompt} onClose={handleNotificationModalClose} userName={getUserFullName()} />
    </div>;
};