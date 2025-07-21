
import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Calendar,
  Calculator,
  Brain,
  Search,
  Scale,
  ChevronLeft,
  Wrench,
  Sparkles,
  ChevronRight,
  MousePointerClick,
  Home,
  TrendingUp,
  GraduationCap,
  Users,
  Settings,
  BarChart3,
  Bell,
  Video,
  User,
  Shield,
  LogOut,
} from "lucide-react";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { ComplianceNotice } from "@/components/compliance/ComplianceNotice";

import EconomicCalendar from "@/components/tools/EconomicCalendar";
import RiskCalculator from "@/components/tools/RiskCalculator";
import TradeAnalyst from "@/components/ai/TradeAnalyst";
import OpportunityScanner from "@/components/ai/OpportunityScanner";
import RiskSimulator from "@/components/ai/RiskSimulator";
import TradingJournal from "@/components/tools/TradingJournal";

const coreTools = [
  {
    name: "Educational Journal",
    icon: BookOpen,
    component: TradingJournal,
    description: "Log and analyze your learning progress with AI-powered educational feedback.",
  },
  {
    name: "Economic Calendar",
    icon: Calendar,
    component: EconomicCalendar,
    description: "Stay informed about market-moving events for educational analysis.",
  },
  {
    name: "Educational Calculator",
    icon: Calculator,
    component: RiskCalculator,
    description: "Learn position sizing and risk calculation fundamentals.",
  },
];

const aiTools = [
  {
    name: "Setup Learning Analyzer",
    icon: Brain,
    component: TradeAnalyst,
    description: "Upload screenshots for educational performance analysis and learning.",
  },
  {
    name: "Educational Pattern Scanner",
    icon: Search,
    component: OpportunityScanner,
    description: "Scan markets for educational pattern recognition and learning opportunities.",
  },
  {
    name: "Educational Risk Calculator",
    icon: Scale,
    component: RiskSimulator,
    description: "Analyze hypothetical setups to learn risk assessment principles.",
  },
];

const navButtons = [
  { name: "Pattern Learning", icon: Bell, path: "/dashboard/signals" },
  { name: "Education", icon: GraduationCap, path: "/dashboard/academy" },
  { name: "Learning Sessions", icon: Video, path: "/dashboard/live-sessions" },
  { name: "Community", icon: Users, path: "/dashboard/community" },
  {
    name: "Educational Tools",
    icon: BarChart3,
    path: "/dashboard/advanced-tools",
    isActive: true,
  },
];

export default function AdvancedTools() {
  const location = useLocation();
  const [activeTool, setActiveTool] = useState(null);

  // Memoize all tools to prevent recreation on every render
  const allTools = React.useMemo(() => [...coreTools, ...aiTools], []);

  // Function to get tool by query parameter
  const getToolFromQuery = React.useCallback(() => {
    const params = new URLSearchParams(location.search);
    const toolParam = params.get("tool");

    const toolMap = {
      journal: "Educational Journal",
      calendar: "Economic Calendar",
      calculator: "Educational Calculator",
      analyst: "Setup Learning Analyzer",
      scanner: "Educational Pattern Scanner",
      simulator: "Educational Risk Calculator",
    };

    const toolName = toolMap[toolParam];
    return allTools.find((tool) => tool.name === toolName) || null;
  }, [location.search, allTools]);

  // Set active tool based on URL parameter on component mount and URL changes
  useEffect(() => {
    const toolFromQuery = getToolFromQuery();
    if (toolFromQuery) {
      setActiveTool(toolFromQuery);
    } else {
      // Default to Educational Journal if no query parameter
      setActiveTool(coreTools[0]);
    }
  }, [getToolFromQuery]);

  const Placeholder = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center h-full text-center p-8 glass-effect rounded-2xl"
    >
      <div className="relative mb-6">
        <div className="absolute -inset-2 bg-accent-gold/10 rounded-full animate-ping"></div>
        <div className="relative p-5 bg-surface rounded-full border border-default glow-effect-gold">
          <Sparkles className="w-12 h-12 text-accent-gold" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-primary mb-2">
        Welcome to the Educational Learning Arsenal
      </h2>
      <p className="text-secondary max-w-md">
        Select an educational tool from the auto-hiding sidebar to begin your learning journey. Hover
        near the left edge to reveal the educational toolkit.
      </p>
      <div className="flex items-center gap-2 mt-6 text-secondary/80">
        <MousePointerClick className="w-5 h-5" />
        <span>Hover near the left edge to reveal the educational toolkit</span>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Compliance Notice */}
      <div className="p-4">
        <ComplianceNotice type="educational" size="sm" />
      </div>

      {/* Main Content Area - Full Width */}
      <div className="w-full min-h-screen p-6 bg-background">
        {/* Header with Tool Info and Selection Panel */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-4 flex items-center justify-center"
        >
          {/* Combined Tool Info and Selection Panel */}
          {activeTool && (
            <div className="bg-surface/20 backdrop-blur-md border border-border/10 rounded-xl p-2 shadow-lg shadow-primary/5 w-fit">
              <div className="flex items-center gap-4">
                {/* Active Tool Info */}
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                    {React.createElement(activeTool.icon, {
                      className: "w-4 h-4 text-primary",
                    })}
                  </div>
                  <h2 className="font-semibold text-base text-foreground tracking-tight">
                    {activeTool.name}
                  </h2>
                  <span className="text-sm text-muted-foreground">•</span>
                  <p className="text-sm text-muted-foreground">
                    {activeTool.description}
                  </p>
                </div>

                {/* Separator */}
                <div className="w-px h-6 bg-border/20"></div>

                {/* Tools Selection Grid */}
                <div className="grid grid-cols-6 gap-1.5">
                  {[...coreTools, ...aiTools].map((tool) => (
                    <button
                      key={tool.name}
                      onClick={() => setActiveTool(tool)}
                      className={`p-2 rounded-lg border transition-all text-left ${
                        activeTool?.name === tool.name
                          ? "bg-primary/10 border-primary/20 text-primary"
                          : "bg-surface/50 border-border/20 hover:bg-surface/80 hover:border-border/40"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {React.createElement(tool.icon, {
                          className: "w-3 h-3 flex-shrink-0",
                        })}
                        <span className="text-xs font-medium truncate">
                          {tool.name === "Educational Journal" ? "Journal" : tool.name === "Economic Calendar" ? "Calendar" : tool.name === "Educational Calculator" ? "Calculator" : tool.name === "Setup Learning Analyzer" ? "Analyzer" : tool.name === "Educational Pattern Scanner" ? "Scanner" : tool.name === "Educational Risk Calculator" ? "Risk Calc" : tool.name.split(" ")[0]}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Tool Display */}
        <div className="min-h-[600px]">
          <div className="relative h-full">
            <Card className="bg-transparent border-transparent backdrop-blur-none shadow-none rounded-2xl h-full overflow-y-auto">
              <div className="p-4 bg-transparent">
                <div style={{ display: activeTool?.name === "Educational Journal" ? 'block' : 'none' }}>
                  <TradingJournal />
                </div>
                <div style={{ display: activeTool?.name === "Economic Calendar" ? 'block' : 'none' }}>
                  <EconomicCalendar />
                </div>
                <div style={{ display: activeTool?.name === "Educational Calculator" ? 'block' : 'none' }}>
                  <RiskCalculator />
                </div>
                <div style={{ display: activeTool?.name === "Setup Learning Analyzer" ? 'block' : 'none' }}>
                  <TradeAnalyst />
                </div>
                <div style={{ display: activeTool?.name === "Educational Pattern Scanner" ? 'block' : 'none' }}>
                  <OpportunityScanner />
                </div>
                <div style={{ display: activeTool?.name === "Educational Risk Calculator" ? 'block' : 'none' }}>
                  <RiskSimulator />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
