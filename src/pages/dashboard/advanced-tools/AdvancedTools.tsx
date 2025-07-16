
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
  X,
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
    name: 'AI Trade Analyst', 
    icon: Brain, 
    component: <TradeAnalyst />,
    description: 'Upload screenshots for deep performance analysis.'
  },
  { 
    name: 'AI Opportunity Scanner', 
    icon: Search, 
    component: <OpportunityScanner />,
    description: 'Scan markets for high-probability trading setups.'
  },
  { 
    name: 'AI Risk Simulator', 
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
  const [activeTool, setActiveTool] = useState(null);
  const [isHovered, setIsHovered] = useState(false);

  const handleToolSelect = (tool) => {
    if (activeTool && activeTool.name === tool.name) {
      setActiveTool(null);
    } else {
      setActiveTool(tool);
    }
  };

  const SidebarToolButton = ({ tool, isActive }) => {
    const Icon = tool.icon;
    return (
      <motion.button
        onClick={() => handleToolSelect(tool)}
        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
          isActive
            ? 'bg-surface/80 border-accent-green glow-effect-green shadow-lg text-accent-green'
            : 'hover:bg-surface/50 hover:border-accent-blue/50 text-muted-foreground hover:text-foreground'
        }`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className={`p-2 rounded-lg bg-surface transition-colors duration-300 ${
          isActive ? 'bg-accent-green/20' : ''
        }`}>
          <Icon className="w-5 h-5" />
        </div>
        <motion.div
          className="flex-1 text-left overflow-hidden"
          initial={false}
          animate={{
            opacity: isHovered ? 1 : 0,
            width: isHovered ? 'auto' : 0,
          }}
          transition={{ duration: 0.3 }}
        >
          <h3 className="font-medium text-sm whitespace-nowrap">{tool.name}</h3>
          <p className="text-xs text-muted-foreground leading-tight whitespace-nowrap">{tool.description}</p>
        </motion.div>
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
      {/* Collapsible Sidebar */}
      <motion.aside
        className="fixed left-0 top-0 h-full z-40 bg-surface/95 backdrop-blur-md border-r border-default shadow-2xl"
        initial={false}
        animate={{
          width: isHovered ? 320 : 80,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="p-4 h-full overflow-hidden">
          {/* Sidebar Header */}
          <motion.div
            className="mb-6"
            initial={false}
            animate={{
              opacity: isHovered ? 1 : 0,
            }}
            transition={{ duration: 0.3 }}
          >
            <h1 className="text-lg font-bold text-primary whitespace-nowrap">Trading Arsenal</h1>
            <p className="text-xs text-muted-foreground whitespace-nowrap">Professional trading tools</p>
          </motion.div>

          {/* AI Tools Section */}
          <div className="mb-6">
            <motion.h2
              className="text-xs font-medium tracking-wide uppercase text-accent-gold flex items-center gap-2 mb-3"
              initial={false}
              animate={{
                opacity: isHovered ? 1 : 0,
              }}
              transition={{ duration: 0.3 }}
            >
              <Sparkles className="w-4 h-4" />
              <span className="whitespace-nowrap">AI-Powered Intelligence</span>
            </motion.h2>
            <div className="space-y-2">
              {aiTools.map(tool => (
                <SidebarToolButton 
                  key={tool.name} 
                  tool={tool} 
                  isActive={activeTool?.name === tool.name} 
                />
              ))}
            </div>
          </div>

          {/* Core Tools Section */}
          <div>
            <motion.h2
              className="text-xs font-medium tracking-wide uppercase text-accent-blue flex items-center gap-2 mb-3"
              initial={false}
              animate={{
                opacity: isHovered ? 1 : 0,
              }}
              transition={{ duration: 0.3 }}
            >
              <Wrench className="w-4 h-4" />
              <span className="whitespace-nowrap">Core Trading Tools</span>
            </motion.h2>
            <div className="space-y-2">
              {coreTools.map(tool => (
                <SidebarToolButton 
                  key={tool.name} 
                  tool={tool} 
                  isActive={activeTool?.name === tool.name} 
                />
              ))}
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 ml-20 p-6">
        {/* Page Header */}
        <div className="mb-8 text-center">
          {activeTool ? (
            <>
              <h1 className="font-apple font-bold text-4xl lg:text-5xl leading-tight mb-4" style={{
                background: 'linear-gradient(to right, hsl(var(--accent-green)), hsl(var(--accent-blue)), hsl(var(--accent-gold)))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                {activeTool.name}
              </h1>
              <p className="text-secondary text-lg max-w-2xl mx-auto leading-relaxed">
                {activeTool.description}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-4xl lg:text-5xl font-bold text-primary mb-3">
                Advanced <span className="gold-text-gradient">Trading Arsenal</span>
              </h1>
              <p className="text-secondary text-lg max-w-3xl mx-auto">
                Your centralized hub for professional-grade trading analysis, AI-powered insights, and risk management.
              </p>
            </>
          )}
        </div>

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
                <Card className="glass-effect p-2 rounded-2xl border-accent-green/30 h-full overflow-y-auto">
                  <div className="absolute top-2 right-2 z-30">
                    <Button variant="ghost" size="icon" onClick={() => setActiveTool(null)} className="rounded-full bg-surface/80 hover:bg-surface">
                      <X className="w-5 h-5 text-secondary" />
                    </Button>
                  </div>
                  <div className="p-1 sm:p-4">
                    {activeTool.component}
                  </div>
                </Card>
              </motion.div>
            ) : (
              <Placeholder />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
