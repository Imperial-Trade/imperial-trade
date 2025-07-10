
import React, { useState } from "react";
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
  X,
} from "lucide-react";

import TradingJournal from "@/components/tools/TradingJournal";
import EconomicCalendar from "@/components/tools/EconomicCalendar";
import RiskCalculator from "@/components/tools/RiskCalculator";
import TradeAnalyst from "@/components/ai/TradeAnalyst";
import OpportunityScanner from "@/components/ai/OpportunityScanner";
import RiskSimulator from "@/components/ai/RiskSimulator";

const coreTools = [
  {
    name: "Trading Journal",
    icon: BookOpen,
    component: <TradingJournal />,
    description: "Log and analyze your trades with AI-powered feedback.",
  },
  {
    name: "Economic Calendar",
    icon: Calendar,
    component: <EconomicCalendar />,
    description: "Stay ahead of market-moving events and news releases.",
  },
  {
    name: "Risk Calculator",
    icon: Calculator,
    component: <RiskCalculator />,
    description: "Calculate position size, risk, and potential profit.",
  },
];

const aiTools = [
  {
    name: "AI Trade Analyst",
    icon: Brain,
    component: <TradeAnalyst />,
    description:
      "Upload screenshots of your history for deep performance analysis.",
  },
  {
    name: "AI Opportunity Scanner",
    icon: Search,
    component: <OpportunityScanner />,
    description:
      "Scan markets for high-probability trading setups in real-time.",
  },
  {
    name: "AI Risk Simulator",
    icon: Scale,
    component: <RiskSimulator />,
    description: "Simulate trade setups to assess risk before you enter.",
  },
];

export default function AdvancedTools() {
  const [activeTool, setActiveTool] = useState(null);

  const handleToolSelect = (tool) => {
    if (activeTool && activeTool.name === tool.name) {
      setActiveTool(null);
    } else {
      setActiveTool(tool);
    }
  };

  const ToolCard = ({ tool, onSelect, isActive }) => {
    const Icon = tool.icon;
    return (
      <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
        <Card
          className={`glass-effect cursor-pointer h-full transition-all duration-300 ${
            isActive
              ? "border-accent-green glow-effect-green"
              : "hover:border-accent-blue"
          }`}
          onClick={() => onSelect(tool)}
        >
          <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
            <div className={`p-3 rounded-lg bg-surface`}>
              <Icon
                className={`w-6 h-6 ${
                  isActive ? "text-accent-green" : "text-accent-blue"
                }`}
              />
            </div>
            <CardTitle className="text-lg">{tool.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-secondary">{tool.description}</p>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen p-6 bg-background w-full">
      <div className="w-full">
        <div className="mb-12 text-center">
          <h1 className="text-3xl lg:text-4xl font-bold text-primary mb-2">
            Advanced <span className="gold-text-gradient">Trading Arsenal</span>
          </h1>
          <p className="text-secondary text-lg max-w-3xl mx-auto">
            Your centralized hub for professional-grade trading analysis,
            AI-powered insights, and risk management.
          </p>
        </div>

        {/* Tool Selection Grid */}
        <div className="space-y-10 mb-12">
          <div>
            <h2 className="text-2xl font-semibold text-primary mb-6 flex items-center gap-3">
              <span className="w-2 h-2 bg-accent-blue rounded-full"></span>
              Core Trading Tools
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-6">
              {coreTools.map((tool) => (
                <ToolCard
                  key={tool.name}
                  tool={tool}
                  onSelect={handleToolSelect}
                  isActive={activeTool?.name === tool.name}
                />
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-primary mb-6 flex items-center gap-3">
              <span className="w-2 h-2 bg-accent-gold rounded-full"></span>
              AI-Powered Intelligence
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-6">
              {aiTools.map((tool) => (
                <ToolCard
                  key={tool.name}
                  tool={tool}
                  onSelect={handleToolSelect}
                  isActive={activeTool?.name === tool.name}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Active Tool Display */}
        <AnimatePresence>
          {activeTool && (
            <motion.div
              initial={{ opacity: 0, y: 50, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: 50, height: 0 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="relative"
            >
              <Card className="glass-effect p-2 rounded-xl border-accent-green/50">
                <div className="absolute top-4 right-4 z-10">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setActiveTool(null)}
                    className="rounded-full bg-surface/80 hover:bg-surface"
                  >
                    <X className="w-5 h-5 text-secondary" />
                  </Button>
                </div>
                {activeTool.component}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
