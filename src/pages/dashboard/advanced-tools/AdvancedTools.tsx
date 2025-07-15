
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  BookOpen,
  Calendar,
  Calculator,
  Brain,
  Search,
  Scale,
} from "lucide-react";

import TradingJournal from "@/components/tools/TradingJournal";
import EconomicCalendar from "@/components/tools/EconomicCalendar";
import RiskCalculator from "@/components/tools/RiskCalculator";
import TradeAnalyst from "@/components/ai/TradeAnalyst";
import OpportunityScanner from "@/components/ai/OpportunityScanner";
import RiskSimulator from "@/components/ai/RiskSimulator";

const coreTools = [
  {
    id: "trading-journal",
    name: "Trading Journal",
    icon: BookOpen,
    component: <TradingJournal />,
    description: "Log and analyze your trades with AI-powered feedback.",
  },
  {
    id: "economic-calendar",
    name: "Economic Calendar",
    icon: Calendar,
    component: <EconomicCalendar />,
    description: "Stay ahead of market-moving events and news releases.",
  },
  {
    id: "risk-calculator",
    name: "Risk Calculator",
    icon: Calculator,
    component: <RiskCalculator />,
    description: "Calculate position size, risk, and potential profit.",
  },
];

const aiTools = [
  {
    id: "ai-trade-analyst",
    name: "AI Trade Analyst",
    icon: Brain,
    component: <TradeAnalyst />,
    description: "Upload screenshots of your history for deep performance analysis.",
  },
  {
    id: "ai-opportunity-scanner",
    name: "AI Opportunity Scanner",
    icon: Search,
    component: <OpportunityScanner />,
    description: "Scan markets for high-probability trading setups in real-time.",
  },
  {
    id: "ai-risk-simulator",
    name: "AI Risk Simulator",
    icon: Scale,
    component: <RiskSimulator />,
    description: "Simulate trade setups to assess risk before you enter.",
  },
];

export default function AdvancedTools() {
  const [activeTool, setActiveTool] = useState<string | null>(null);

  const handleToolSelect = (toolId: string) => {
    setActiveTool(activeTool === toolId ? null : toolId);
  };

  const getActiveToolComponent = () => {
    const allTools = [...coreTools, ...aiTools];
    const tool = allTools.find(t => t.id === activeTool);
    return tool?.component || null;
  };

  const ToolCard = ({ tool, onSelect, isActive }: any) => {
    const Icon = tool.icon;
    return (
      <motion.div 
        whileHover={{ scale: 1.02 }} 
        whileTap={{ scale: 0.98 }}
        className="h-full"
      >
        <Card
          className={`cursor-pointer h-full transition-all duration-200 border-2 ${
            isActive
              ? "border-primary bg-primary/5 shadow-lg"
              : "border-border hover:border-primary/50 hover:shadow-md"
          }`}
          onClick={() => onSelect(tool.id)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                isActive ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <CardTitle className="text-lg font-semibold">{tool.name}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {tool.description}
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="h-full grid grid-rows-[auto_1fr] gap-8 p-6 bg-background">
      {/* Header Section */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">
          Advanced <span className="text-primary">Trading Arsenal</span>
        </h1>
        <p className="text-muted-foreground text-base max-w-2xl mx-auto">
          Your centralized hub for professional-grade trading analysis, AI-powered insights, and risk management.
        </p>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-rows-[auto_1fr] gap-8 min-h-0">
        {/* Tools Grid */}
        <div className="space-y-8">
          {/* Core Tools Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 bg-primary rounded-full"></div>
              <h2 className="text-xl font-semibold text-foreground">Core Trading Tools</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {coreTools.map((tool) => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  onSelect={handleToolSelect}
                  isActive={activeTool === tool.id}
                />
              ))}
            </div>
          </div>

          {/* AI Tools Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 bg-amber-500 rounded-full"></div>
              <h2 className="text-xl font-semibold text-foreground">AI-Powered Intelligence</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {aiTools.map((tool) => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  onSelect={handleToolSelect}
                  isActive={activeTool === tool.id}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Active Tool Display */}
        {activeTool && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="min-h-0 bg-card border rounded-lg p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                {[...coreTools, ...aiTools].find(t => t.id === activeTool)?.name}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTool(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                Close
              </Button>
            </div>
            <div className="h-full overflow-auto">
              {getActiveToolComponent()}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
