
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
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
  MousePointerClick
} from 'lucide-react';

import TradingJournal from '@/components/tools/TradingJournal';
import EconomicCalendar from '@/components/tools/EconomicCalendar';
import RiskCalculator from '@/components/tools/RiskCalculator';
import TradeAnalyst from '@/components/ai/TradeAnalyst';
import OpportunityScanner from '@/components/ai/OpportunityScanner';
import RiskSimulator from '@/components/ai/RiskSimulator';

const coreTools = [
  { 
    name: 'Trading Journal', 
    icon: BookOpen, 
    component: <TradingJournal />, 
    description: 'Log and analyze your trades with AI-powered feedback.'
  },
  { 
    name: 'Economic Calendar', 
    icon: Calendar, 
    component: <EconomicCalendar />,
    description: 'Stay ahead of market-moving events and news releases.'
  },
  { 
    name: 'Risk Calculator', 
    icon: Calculator, 
    component: <RiskCalculator />,
    description: 'Calculate position size, risk, and potential profit.'
  },
];

const aiTools = [
  { 
    name: 'Trade Analyst', 
    icon: Brain, 
    component: <TradeAnalyst />,
    description: 'Upload screenshots for deep performance analysis.'
  },
  { 
    name: 'Opportunity Scanner', 
    icon: Search, 
    component: <OpportunityScanner />,
    description: 'Scan markets for high-probability trading setups.'
  },
  { 
    name: 'Risk Simulator', 
    icon: Scale,
    component: <RiskSimulator />,
    description: 'Simulate trade setups to assess risk before you enter.'
  },
];

const ToolSelector = ({ tool, onSelect, isActive }) => {
  const Icon = tool.icon;
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.01 }}
    >
      <button
        onClick={() => onSelect(tool)}
        className={`w-full text-left p-3 rounded-lg transition-all duration-300 flex items-center gap-3 border ${
          isActive
            ? 'bg-surface/80 border-accent-green glow-effect-green shadow-lg'
            : 'bg-surface/30 border-transparent hover:bg-surface/50 hover:border-accent-blue/50'
        }`}
      >
        <div className={`p-2 rounded-lg bg-surface transition-colors duration-300 ${isActive ? 'bg-accent-green/20' : ''}`}>
          <Icon className={`w-4 h-4 transition-colors duration-300 ${isActive ? 'text-accent-green' : 'text-muted-foreground'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground text-sm">{tool.name}</h3>
          <p className="text-xs text-muted-foreground leading-tight">{tool.description}</p>
        </div>
        {isActive && <ChevronRight className="w-4 h-4 text-accent-green ml-auto flex-shrink-0" />}
      </button>
    </motion.div>
  );
};

export default function AdvancedTools() {
  const [activeTool, setActiveTool] = useState(coreTools[0]); // Set Trading Journal as default
  const [isHovered, setIsHovered] = useState(false);

  const handleToolSelect = (tool) => {
    if (activeTool && activeTool.name === tool.name) {
      setActiveTool(null);
    } else {
      setActiveTool(tool);
    }
  };

  const WidgetTool = ({ tool, size = 'small' }) => {
    const Icon = tool.icon;
    const isActive = activeTool?.name === tool.name;
    
    const sizeClasses = {
      small: 'col-span-1 h-24',
      medium: 'col-span-2 h-24',
      large: 'col-span-2 h-32'
    };

    return (
      <motion.button
        onClick={() => handleToolSelect(tool)}
        className={`${sizeClasses[size]} bg-white dark:bg-gray-900/30 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-gray-200/20 dark:border-gray-700/30 transition-all duration-300 hover:shadow-md hover:scale-[1.02] ${
          isActive ? 'ring-2 ring-primary/50 shadow-lg' : ''
        }`}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex flex-col h-full justify-between">
          <div className="flex items-start justify-between">
            <div className={`p-2 rounded-lg ${isActive ? 'bg-primary/15' : 'bg-gray-100 dark:bg-gray-800/50'}`}>
              <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            {isActive && (
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            )}
          </div>
          <div className="text-left">
            <h3 className={`font-medium text-sm ${isActive ? 'text-primary' : 'text-foreground'}`}>
              {tool.name}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {tool.description}
            </p>
          </div>
        </div>
      </motion.button>
    );
  };

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
      <h2 className="text-2xl font-bold text-primary mb-2">Welcome to the Trading Arsenal</h2>
      <p className="text-secondary max-w-md">
        Select a tool from the sidebar to begin your analysis. Harness the power of AI and professional-grade utilities to elevate your trading strategy.
      </p>
       <div className="flex items-center gap-2 mt-6 text-secondary/80">
        <MousePointerClick className="w-5 h-5" />
        <span>Hover over the sidebar and click a tool to get started</span>
       </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Apple Today View Style Sidebar */}
      <motion.aside
        className="fixed left-0 top-0 h-full z-40 bg-gray-50 dark:bg-gray-950 overflow-y-auto"
        initial={false}
        animate={{
          width: 320,
        }}
        transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      >
        <div className="p-4 h-full">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Today</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Trading Arsenal</p>
          </div>

          {/* Widget Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Trading Journal - Large Widget */}
            <WidgetTool tool={coreTools[0]} size="large" />
            
            {/* Economic Calendar */}
            <WidgetTool tool={coreTools[1]} size="small" />
            
            {/* Risk Calculator */}
            <WidgetTool tool={coreTools[2]} size="small" />
            
            {/* Trade Analyst - Medium Widget */}
            <WidgetTool tool={aiTools[0]} size="medium" />
            
            {/* Opportunity Scanner */}
            <WidgetTool tool={aiTools[1]} size="small" />
            
            {/* Risk Simulator */}
            <WidgetTool tool={aiTools[2]} size="small" />
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <motion.div 
        className="flex-1 p-6"
        animate={{ 
          marginLeft: 320 
        }}
        transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      >
        {/* Active Tool Container */}
        {activeTool && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="mb-6"
          >
            <div className="bg-surface/30 backdrop-blur-sm border border-border/20 rounded-2xl p-4 max-w-md">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/10">
                  {React.createElement(activeTool.icon, { className: "w-5 h-5 text-primary" })}
                </div>
                <div>
                  <h2 className="font-semibold text-lg text-foreground tracking-tight">{activeTool.name}</h2>
                  <p className="text-xs text-muted-foreground">{activeTool.description}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tool Display */}
        <div className="min-h-[600px]">
          <AnimatePresence mode="wait">
            {activeTool ? (
              <motion.div
                key={activeTool.name}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="relative h-full"
              >
                <Card className="bg-white dark:bg-gray-900/30 border-transparent backdrop-blur-sm dark:shadow-2xl dark:shadow-gray-900/50 rounded-2xl h-full overflow-y-auto">
                  <div className="p-4">
                    {activeTool.component}
                  </div>
                </Card>
              </motion.div>
            ) : (
              <Placeholder />
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
