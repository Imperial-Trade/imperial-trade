
import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TypewriterText } from "@/components/ui/typewriter-text";
import { ImperialWelcomeAnimation } from "@/components/ui/imperial-welcome-animation";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Users,
  Bell,
  Plus,
  ArrowRight,
  Activity,
  Target,
  Zap,
  Star,
  Award,
  Crown,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWelcome } from "@/contexts/WelcomeContext";
import { VideoBackground } from "@/components/account-request/VideoBackground";

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  trend?: "up" | "down";
  icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  trend,
  icon,
}) => (
  <Card className="group relative overflow-hidden bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1">
    {/* Gradient overlay */}
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

    <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
      <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
        {title}
      </CardTitle>
      <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
        {icon}
      </div>
    </CardHeader>
    <CardContent className="relative">
      <div className="text-3xl font-bold tracking-tight mb-1 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
        {value}
      </div>
      {change && (
        <div
          className={`flex items-center text-sm font-medium ${
            trend === "up"
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {trend === "up" ? (
            <div className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              <span>{change}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <TrendingDown className="w-4 h-4" />
              <span>{change}</span>
            </div>
          )}
        </div>
      )}
    </CardContent>
  </Card>
);

export const DashboardHome: React.FC = () => {
  const { user } = useAuth();
  const { hasSeenWelcome, markWelcomeAsSeen } = useWelcome();
  const isAdmin = user?.user_metadata?.access_level === "admin";
  const isEducator = user?.user_metadata?.user_type === "educator";
  const [showWelcomeAnimation, setShowWelcomeAnimation] = useState(false);

  // Show animation only if user hasn't seen it
  useEffect(() => {
    if (!hasSeenWelcome) {
      setShowWelcomeAnimation(true);
    }
  }, [hasSeenWelcome]);

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

  const welcomeText = `Welcome to Imperial\n${getUserFullName()}`;

  return (
    <div className="relative min-h-screen">
      {/* Welcome Animation (only on first login) */}
      {showWelcomeAnimation && !hasSeenWelcome && (
        <ImperialWelcomeAnimation
          onComplete={() => {
            setShowWelcomeAnimation(false);
            markWelcomeAsSeen();
          }}
        />
      )}

      {/* Video Background */}
      <VideoBackground />

      {/* Hero Section with Typewriter Welcome */}
      <div className="relative z-20 min-h-screen flex items-center justify-center">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Welcome Message with Typewriter Effect */}
            <div className="space-y-8">
              <div className="flex items-center justify-center gap-4 mb-6">
                <Crown className="h-16 w-16 lg:h-20 lg:w-20 text-yellow-400" />
              </div>

              <h1 className="text-5xl lg:text-7xl font-bold text-white mb-8 min-h-[120px] lg:min-h-[160px] flex items-center justify-center">
                <TypewriterText
                  text={welcomeText}
                  speed={80}
                  showCursor={false}
                  cursorBlinkSpeed={500}
                  className="bg-gradient-to-r from-yellow-400 via-white to-primary bg-clip-text text-transparent"
                />
              </h1>

              <p className="text-xl lg:text-2xl text-white/90 max-w-4xl mx-auto leading-relaxed mb-16">
                You've taken the brave step into the world of trading education. Every
                successful trader was once a beginner, and every champion was once a
                student who refused to give up.
              </p>
            </div>

            {/* Large spacer to push content below viewport */}
            <div className="pt-32"></div>
          </div>
        </div>
      </div>

      {/* Premium Stats Grid */}
      <div className="relative z-20 container mx-auto px-6 mb-12">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Active Signals"
            value="127"
            change="+15% from yesterday"
            trend="up"
            icon={<Target className="h-5 w-5" />}
          />
          <StatCard
            title="Win Rate"
            value="84.2%"
            change="+7.3% this week"
            trend="up"
            icon={<Award className="h-5 w-5" />}
          />
          <StatCard
            title="Total PnL"
            value="$47,892"
            change="+23.8% this month"
            trend="up"
            icon={<DollarSign className="h-5 w-5" />}
          />
          <StatCard
            title="Portfolio Value"
            value="$2.4M"
            change="+$127K today"
            trend="up"
            icon={<TrendingUp className="h-5 w-5" />}
          />
        </div>
      </div>

      {/* Advanced Trading Hub */}
      <div className="relative z-20 container mx-auto px-6 mb-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight mb-2">
            Trading Hub
          </h2>
          <p className="text-muted-foreground">
            Access your most important trading tools and insights
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="group relative overflow-hidden bg-card border border-border hover:border-primary/50 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-2 cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardHeader className="relative">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
                    Signal Analytics
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Real-time performance tracking
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <p className="text-muted-foreground mb-4">
                Monitor your signals with advanced analytics and performance
                metrics.
              </p>
              <Button
                asChild
                variant="outline"
                className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300"
              >
                <Link to="/dashboard/signal-stream">
                  View Analytics
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden bg-card border border-border hover:border-primary/50 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-2 cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-green-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardHeader className="relative">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
                    Elite Community
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Connect with top traders
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <p className="text-muted-foreground mb-4">
                Join discussions with verified traders and educational contributors.
              </p>
              <Button
                asChild
                variant="outline"
                className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300"
              >
                <Link to="/dashboard/forum">
                  Join Community
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden bg-card border border-border hover:border-primary/50 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-2 cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardHeader className="relative">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
                    Live Market
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Educational trading sessions
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <p className="text-muted-foreground mb-4">
                Participate in live educational sessions with market educators.
              </p>
              <Button
                asChild
                variant="outline"
                className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300"
              >
                <Link to="/dashboard/live">
                  Join Session
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
