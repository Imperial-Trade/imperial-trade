
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
  MousePointerClick,
  Home,
  TrendingUp,
  GraduationCap,
  Users,
  Settings,
  BarChart3,
  Bell,
  Video
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

const navButtons = [
  { name: 'Signals', icon: Bell, path: '/dashboard/signals' },
  { name: 'Education', icon: GraduationCap, path: '/dashboard/academy' },
  { name: 'Live Sessions', icon: Video, path: '/dashboard/live-sessions' },
  { name: 'Community', icon: Users, path: '/dashboard/community' },
  { name: 'Tools', icon: BarChart3, path: '/dashboard/advanced-tools', isActive: true },
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
      small: 'col-span-1 h-28',
      medium: 'col-span-2 h-28',
      large: 'col-span-2 h-36'
    };

    const renderWidgetContent = () => {
      switch (tool.name) {
        case 'Trading Journal':
          return (
            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-gray-900 dark:from-slate-100 dark:to-white rounded-lg overflow-hidden">
              <div className="p-2 h-full flex flex-col">
                <div className="flex items-center gap-1 mb-2">
                  <div className="w-2 h-2 bg-green-400 dark:bg-green-600 rounded-full"></div>
                  <div className="w-2 h-2 bg-red-400 dark:bg-red-600 rounded-full"></div>
                  <div className="w-2 h-2 bg-yellow-400 dark:bg-yellow-600 rounded-full"></div>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="h-1.5 bg-blue-300 dark:bg-blue-800 rounded w-3/4"></div>
                  <div className="h-1.5 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
                  <div className="h-1.5 bg-green-300 dark:bg-green-800 rounded w-2/3"></div>
                </div>
              </div>
            </div>
          );
        
        case 'Economic Calendar':
          return (
            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-purple-900 dark:from-purple-100 dark:to-pink-50 rounded-lg overflow-hidden">
              <div className="p-2 h-full">
                <div className="grid grid-cols-7 gap-0.5 h-full">
                  {Array.from({ length: 14 }).map((_, i) => (
                    <div key={i} className={`rounded-sm ${i === 5 ? 'bg-purple-300 dark:bg-purple-700' : i === 9 ? 'bg-red-300 dark:bg-red-700' : 'bg-gray-600 dark:bg-gray-300'}`}></div>
                  ))}
                </div>
              </div>
            </div>
          );
        
        case 'Risk Calculator':
          return (
            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-emerald-900 dark:from-green-100 dark:to-emerald-50 rounded-lg overflow-hidden">
              <div className="p-2 h-full flex flex-col justify-center items-center">
                <div className="w-8 h-8 border-2 border-green-300 dark:border-green-700 rounded-full flex items-center justify-center mb-1">
                  <span className="text-xs font-bold text-green-200 dark:text-green-800">%</span>
                </div>
                <div className="flex gap-1">
                  <div className="w-1 h-3 bg-green-300 dark:bg-green-700 rounded"></div>
                  <div className="w-1 h-4 bg-green-400 dark:bg-green-800 rounded"></div>
                  <div className="w-1 h-2 bg-green-200 dark:bg-green-600 rounded"></div>
                </div>
              </div>
            </div>
          );
        
        case 'Trade Analyst':
          return (
            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-amber-900 dark:from-orange-100 dark:to-amber-50 rounded-lg overflow-hidden">
              <div className="p-2 h-full flex flex-col">
                <div className="flex items-center gap-1 mb-1">
                  <div className="w-3 h-2 bg-orange-300 dark:bg-orange-700 rounded"></div>
                  <div className="w-4 h-1 bg-orange-200 dark:bg-orange-600 rounded"></div>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-dashed border-orange-300 dark:border-orange-700 rounded flex items-center justify-center">
                    <Icon className="w-3 h-3 text-orange-200 dark:text-orange-800" />
                  </div>
                </div>
              </div>
            </div>
          );
        
        case 'Opportunity Scanner':
          return (
            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-blue-900 dark:from-cyan-100 dark:to-blue-50 rounded-lg overflow-hidden">
              <div className="p-2 h-full">
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <div className="w-1 h-1 bg-cyan-300 dark:bg-cyan-700 rounded-full animate-pulse"></div>
                    <div className="h-1 bg-cyan-200 dark:bg-cyan-600 rounded flex-1"></div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-1 h-1 bg-blue-300 dark:bg-blue-700 rounded-full animate-pulse delay-100"></div>
                    <div className="h-1 bg-blue-200 dark:bg-blue-600 rounded flex-1"></div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-1 h-1 bg-indigo-300 dark:bg-indigo-700 rounded-full animate-pulse delay-200"></div>
                    <div className="h-1 bg-indigo-200 dark:bg-indigo-600 rounded flex-1"></div>
                  </div>
                </div>
              </div>
            </div>
          );
        
        case 'Risk Simulator':
          return (
            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-rose-900 dark:from-red-100 dark:to-rose-50 rounded-lg overflow-hidden">
              <div className="p-2 h-full flex items-center justify-center">
                <div className="relative">
                  <div className="w-8 h-8 border-2 border-red-300 dark:border-red-700 rounded-full"></div>
                  <div className="absolute inset-0 border-2 border-red-400 dark:border-red-800 rounded-full animate-ping"></div>
                  <div className="absolute inset-2 bg-red-400 dark:bg-red-800 rounded-full"></div>
                </div>
              </div>
            </div>
          );
        
        default:
          return (
            <div className="w-full h-full bg-gray-800 dark:bg-gray-100 rounded-lg flex items-center justify-center">
              <Icon className="w-6 h-6 text-gray-300 dark:text-gray-600" />
            </div>
          );
      }
    };

    return (
      <motion.button
        onClick={() => handleToolSelect(tool)}
        className={`${sizeClasses[size]} bg-black dark:bg-white backdrop-blur-sm rounded-2xl p-3 shadow-sm border border-gray-200/20 dark:border-gray-700/30 transition-all duration-300 hover:shadow-md hover:scale-[1.02] ${
          isActive ? 'ring-2 ring-primary/50 shadow-lg' : ''
        }`}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex flex-col h-full gap-2">
          <div className="flex items-start justify-between mb-1">
            <h3 className={`font-medium text-xs leading-tight ${isActive ? 'text-primary' : 'text-white dark:text-black'}`}>
              {tool.name}
            </h3>
            {isActive && (
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse flex-shrink-0" />
            )}
          </div>
          <div className="flex-1 min-h-0">
            {renderWidgetContent()}
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
        className="fixed left-0 top-0 h-full z-40 bg-transparent overflow-y-auto"
        initial={false}
        animate={{
          width: 320,
        }}
        transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      >
        <div className="p-4 h-full pt-20">
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

          {/* Navigation Buttons */}
          <div className="mt-8">
            <div className="bg-gray-800 dark:bg-gray-200 rounded-2xl p-2 flex flex-wrap gap-1">
              {navButtons.map((button) => {
                const Icon = button.icon;
                const isActive = button.isActive;
                return (
                  <motion.button
                    key={button.name}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-200 flex-1 min-w-0 ${
                      isActive 
                        ? 'bg-yellow-500 text-black' 
                        : 'text-white dark:text-black hover:bg-gray-700 dark:hover:bg-gray-300'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => window.location.href = button.path}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs font-medium text-center leading-tight">{button.name}</span>
                  </motion.button>
                );
              })}
            </div>
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
