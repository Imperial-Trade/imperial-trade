import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { BookOpen, Calculator, Brain, ChevronLeft, Wrench, Sparkles, ChevronRight, MousePointerClick, Home, TrendingUp, GraduationCap, Users, Settings, BarChart3, Bell, Video, User, Shield, LogOut, Eye, EyeOff } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import RiskCalculator from "@/components/tools/RiskCalculator";
import MeccaAnalysisHub from "@/components/ai/MeccaAnalysisHub";
import TradingJournal from "@/components/tools/TradingJournal";
import { TradeJournalProvider } from "@/contexts/TradeJournalContext";
import { MobileBottomNav } from "@/components/advanced-tools/MobileBottomNav";
const coreTools = [{
  name: "Trading Journal",
  icon: BookOpen,
  component: TradingJournal,
  description: "Track and analyze your trading performance"
}, {
  name: "Educational Calculator",
  icon: Calculator,
  component: RiskCalculator,
  description: "Learn position sizing and risk calculation fundamentals."
}, {
  name: "MECCA",
  icon: Brain,
  component: MeccaAnalysisHub,
  description: "Premium AI-powered trading analysis hub with advanced visual insights and performance tracking."
}];
const aiTools = [];
const navButtons = [{
  name: "Pattern Learning",
  icon: Bell,
  path: "/dashboard/signals"
}, {
  name: "Education",
  icon: GraduationCap,
  path: "/dashboard/academy"
}, {
  name: "Learning Sessions",
  icon: Video,
  path: "/dashboard/live-sessions"
}, {
  name: "Community",
  icon: Users,
  path: "/dashboard/community"
}, {
  name: "Educational Tools",
  icon: BarChart3,
  path: "/dashboard/advanced-tools",
  isActive: true
}];
export default function AdvancedTools() {
  const location = useLocation();
  const [activeTool, setActiveTool] = useState(coreTools[0]);
  const [showStats, setShowStats] = useState(true);

  // Memoize all tools to prevent recreation on every render
  const allTools = React.useMemo(() => [...coreTools, ...aiTools], []);

  // Function to get tool by query parameter
  const getToolFromQuery = React.useCallback(() => {
    const params = new URLSearchParams(location.search);
    const toolParam = params.get("tool");
    const toolMap = {
      journal: "Educational Journal",
      calculator: "Educational Calculator",
      analyst: "Setup Learning Analyzer"
    };
    const toolName = toolMap[toolParam];
    return allTools.find(tool => tool.name === toolName) || null;
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

  // Listen for journal navigation events from hamburger menu
  useEffect(() => {
    const handleJournalNavChange = (event: CustomEvent) => {
      const {
        tab
      } = event.detail;
      // Switch to Journal tool first
      const journalTool = allTools.find(t => t.name === 'Educational Journal');
      if (journalTool) {
        setActiveTool(journalTool);
        // Then dispatch event for journal tab change
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('journal-tab-change', {
            detail: {
              tab
            }
          }));
        }, 100);
      }
    };
    window.addEventListener('journal-nav-change', handleJournalNavChange as EventListener);
    return () => {
      window.removeEventListener('journal-nav-change', handleJournalNavChange as EventListener);
    };
  }, [allTools]);
  const Placeholder = () => <motion.div initial={{
    opacity: 0,
    scale: 0.95
  }} animate={{
    opacity: 1,
    scale: 1
  }} transition={{
    duration: 0.5
  }} className="flex flex-col items-center justify-center h-full text-center p-8 glass-effect rounded-2xl">
      
      <h2 className="text-2xl font-bold text-primary mb-2">
        Welcome to the Educational Learning Arsenal
      </h2>
      <p className="text-secondary max-w-md">
        Select an educational tool from the auto-hiding sidebar to begin your
        learning journey. Hover near the left edge to reveal the educational
        toolkit.
      </p>
      <div className="flex items-center gap-2 mt-6 text-secondary/80">
        <MousePointerClick className="w-5 h-5" />
        <span>Hover near the left edge to reveal the educational toolkit</span>
      </div>
    </motion.div>;
  return <div className="min-h-screen bg-background">

      {/* Main Content Area - Responsive Width with bottom padding for mobile nav */}
      <div className="w-full min-h-screen p-2 sm:p-4 lg:p-6 pt-2 lg:pt-4 pb-20 md:pb-6 bg-background overflow-y-auto">
        {/* Header with Tool Info and Selection Panel */}
        <motion.div initial={{
        opacity: 0,
        y: -10
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.3
      }} className="mb-1 flex items-start justify-center pt-2">
          {/* Combined Tool Info and Selection Panel */}
          {activeTool && <div className="rounded-lg sm:rounded-xl p-0 w-auto overflow-hidden">
              {/* Desktop Layout */}
              <div className="hidden sm:flex items-center gap-1">
                {/* Active Tool Info - Desktop only */}
                

                {/* Separator - Desktop only */}
                <div className="w-px h-6 bg-border/20"></div>

                {/* Tools Selection Grid - Desktop */}
                <div className="flex items-center gap-1">
                  <div className="grid grid-cols-3 gap-0.5 bg-background/80 backdrop-blur-sm rounded-md p-1 border border-border">
                    {[...coreTools, ...aiTools].map(tool => <button key={tool.name} onClick={() => setActiveTool(tool)} className={`p-1.5 transition-all text-left min-h-[36px] rounded-sm ${activeTool?.name === tool.name ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                        <div className="flex items-center justify-start gap-1">
                          {React.createElement(tool.icon, {
                      className: "w-3 h-3 flex-shrink-0"
                    })}
                          <span className="text-xs font-medium truncate">
                            {tool.name === "Educational Journal" ? "Journal" : tool.name === "Economic Calendar" ? "Calendar" : tool.name === "Educational Calculator" ? "Calculator" : tool.name === "MECCA" ? "MECCA" : tool.name === "Educational Pattern Scanner" ? "Scanner" : tool.name === "Educational Risk Calculator" ? "Risk Calc" : tool.name.split(" ")[0]}
                          </span>
                        </div>
                      </button>)}
                  </div>
                  
                  {/* Stats Toggle Button - Only for Educational Journal */}
                  {activeTool?.name === "Educational Journal"}
                </div>
              </div>

            </div>}
        </motion.div>

        {/* Tool Display - Mobile Optimized */}
        <div className="min-h-[500px] sm:min-h-[600px] pt-1">
          <Card className="bg-transparent border-transparent backdrop-blur-none shadow-none rounded-lg border-0 h-full overflow-y-auto">
            <div className="p-0 bg-transparent">
              {activeTool?.name === "Educational Journal" && <TradeJournalProvider>
                  <TradingJournal showStats={showStats} onToggleStats={() => setShowStats(!showStats)} />
                </TradeJournalProvider>}
              {activeTool?.name === "Educational Calculator" && <RiskCalculator />}
              {activeTool?.name === "MECCA" && <MeccaAnalysisHub />}
            </div>
          </Card>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav activeTool={activeTool} onToolChange={toolName => {
      const tool = [...coreTools, ...aiTools].find(t => t.name === toolName);
      if (tool) setActiveTool(tool);
    }} />
    </div>;
}