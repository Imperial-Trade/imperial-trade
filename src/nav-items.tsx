
import { HomeIcon, BookOpenIcon, MessageSquareIcon, UserIcon, BarChart3Icon, SettingsIcon, CalendarIcon, TrendingUpIcon, GraduationCapIcon, BrainCircuitIcon, BellIcon, ShieldIcon, TargetIcon, LineChartIcon, AwardIcon, UsersIcon, HelpCircleIcon, DollarSignIcon, TrophyIcon, FileTextIcon, AnalyticsIcon, BadgeIcon, MapIcon, ClockIcon, StarIcon, CrownIcon, ZapIcon, Gamepad2Icon, PieChartIcon } from "lucide-react";

import Index from "./pages/Index";
import Dashboard from "./pages/dashboard/Dashboard";
import Education from "./pages/dashboard/education/Education";
import Course from "./pages/dashboard/education/Course";
import Watch from "./pages/dashboard/education/Watch";
import Forum from "./pages/dashboard/forum/Forum";
import Profile from "./pages/dashboard/profile/Profile";
import Analytics from "./pages/dashboard/analytics/Analytics";
import Settings from "./pages/dashboard/settings/Settings";
import MyProgress from "./pages/dashboard/my-progress/MyProgress";
import Progress from "./pages/dashboard/progress/Progress";
import LiveSessions from "./pages/dashboard/live-sessions/LiveSessions";
import MarketAnalysis from "./pages/dashboard/market-analysis/MarketAnalysis";
import TradingJournal from "./pages/dashboard/trading-journal/TradingJournal";
import Portfolio from "./pages/dashboard/portfolio/Portfolio";
import Alerts from "./pages/dashboard/alerts/Alerts";
import Community from "./pages/dashboard/community/Community";
import Support from "./pages/dashboard/support/Support";
import Subscriptions from "./pages/dashboard/subscriptions/Subscriptions";
import Leaderboard from "./pages/dashboard/leaderboard/Leaderboard";
import Reports from "./pages/dashboard/reports/Reports";
import Achievements from "./pages/dashboard/achievements/Achievements";
import Roadmap from "./pages/dashboard/roadmap/Roadmap";
import TradingTools from "./pages/dashboard/trading-tools/TradingTools";
import News from "./pages/dashboard/news/News";
import Mentorship from "./pages/dashboard/mentorship/Mentorship";
import Competitions from "./pages/dashboard/competitions/Competitions";
import RiskManagement from "./pages/dashboard/risk-management/RiskManagement";

/**
 * Central place for defining the navigation items. Used for navigation components and routing.
 */
export const navItems = [
  {
    title: "Dashboard",
    to: "/dashboard",
    icon: <HomeIcon className="h-4 w-4" />,
    page: <Dashboard />,
  },
  {
    title: "Imperial Academy",
    to: "/dashboard/education",
    icon: <GraduationCapIcon className="h-4 w-4" />,
    page: <Education />,
  },
  {
    title: "My Progress", 
    to: "/dashboard/my-progress",
    icon: <TrophyIcon className="h-4 w-4" />,
    page: <MyProgress />,
  },
  {
    title: "Live Sessions",
    to: "/dashboard/live-sessions", 
    icon: <CalendarIcon className="h-4 w-4" />,
    page: <LiveSessions />,
  },
  {
    title: "Trading Journal",
    to: "/dashboard/trading-journal",
    icon: <FileTextIcon className="h-4 w-4" />,
    page: <TradingJournal />,
  },
  {
    title: "Portfolio",
    to: "/dashboard/portfolio",
    icon: <PieChartIcon className="h-4 w-4" />,
    page: <Portfolio />,
  },
  {
    title: "Market Analysis", 
    to: "/dashboard/market-analysis",
    icon: <TrendingUpIcon className="h-4 w-4" />,
    page: <MarketAnalysis />,
  },
  {
    title: "Community Forum",
    to: "/dashboard/forum",
    icon: <MessageSquareIcon className="h-4 w-4" />,
    page: <Forum />,
  },
  {
    title: "Alerts",
    to: "/dashboard/alerts",
    icon: <BellIcon className="h-4 w-4" />,
    page: <Alerts />,
  },
  {
    title: "Analytics",
    to: "/dashboard/analytics", 
    icon: <BarChart3Icon className="h-4 w-4" />,
    page: <Analytics />,
  },
  {
    title: "Profile",
    to: "/dashboard/profile",
    icon: <UserIcon className="h-4 w-4" />,
    page: <Profile />,
  },
  {
    title: "Settings",
    to: "/dashboard/settings",
    icon: <SettingsIcon className="h-4 w-4" />,
    page: <Settings />,
  },
];

// Additional routes that don't appear in main navigation
export const additionalRoutes = [
  {
    path: "education/course/:courseId",
    component: <Course />,
  },
  {
    path: "education/watch/:courseId/:lessonIndex", 
    component: <Watch />,
  },
];
