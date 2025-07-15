
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
      whileHover={{ scale: 1.02 }}
    >
      <button
        onClick={() => onSelect(tool)}
        className={`w-full text-left p-4 rounded-lg transition-all duration-300 flex items-center gap-4 border ${
          isActive
            ? 'bg-surface/80 border-accent-green glow-effect-green shadow-lg'
            : 'bg-surface/30 border-transparent hover:bg-surface/50 hover:border-accent-blue/50'
        }`}
      >
        <div className={`p-3 rounded-lg bg-surface transition-colors duration-300 ${isActive ? 'bg-accent-green/20' : ''}`}>
          <Icon className={`w-6 h-6 transition-colors duration-300 ${isActive ? 'text-accent-green' : 'text-accent-blue'}`} />
        </div>
        <div>
          <h3 className="font-semibold text-primary">{tool.name}</h3>
          <p className="text-sm text-secondary">{tool.description}</p>
        </div>
        {isActive && <ChevronRight className="w-5 h-5 text-accent-green ml-auto flex-shrink-0" />}
      </button>
    </motion.div>
  );
};

export default function AdvancedTools() {
  const [activeTool, setActiveTool] = useState(null);

  const handleToolSelect = (tool) => {
    if (activeTool && activeTool.name === tool.name) {
      setActiveTool(null);
    } else {
      setActiveTool(tool);
    }
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
        Select a tool from the left to begin your analysis. Harness the power of AI and professional-grade utilities to elevate your trading strategy.
      </p>
       <div className="flex items-center gap-2 mt-6 text-secondary/80">
        <MousePointerClick className="w-5 h-5" />
        <span>Click a tool to get started</span>
       </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-background">
      <div className="max-w-8xl mx-auto">
        {/* Page Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl lg:text-5xl font-bold text-primary mb-3">
            Advanced <span className="gold-text-gradient">Trading Arsenal</span>
          </h1>
          <p className="text-secondary text-lg max-w-3xl mx-auto">
            Your centralized hub for professional-grade trading analysis, AI-powered insights, and risk management.
          </p>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Panel: Tool Selectors */}
          <aside className="lg:col-span-1 space-y-4">
            {/* AI Tools */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <h2 className="text-lg font-semibold tracking-wider uppercase text-accent-gold flex items-center gap-3 mb-3">
                <Sparkles className="w-5 h-5" />
                AI-Powered Intelligence
              </h2>
              <div className="space-y-2">
                {aiTools.map(tool => (
                  <ToolSelector 
                    key={tool.name} 
                    tool={tool} 
                    onSelect={handleToolSelect} 
                    isActive={activeTool?.name === tool.name} 
                  />
                ))}
              </div>
            </motion.section>

            {/* Core Tools */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <h2 className="text-lg font-semibold tracking-wider uppercase text-accent-blue flex items-center gap-3 mb-3">
                <Wrench className="w-5 h-5" />
                Core Trading Tools
              </h2>
              <div className="space-y-2">
                {coreTools.map(tool => (
                  <ToolSelector 
                    key={tool.name} 
                    tool={tool} 
                    onSelect={handleToolSelect} 
                    isActive={activeTool?.name === tool.name} 
                  />
                ))}
              </div>
            </motion.section>
          </aside>

          {/* Right Panel: Active Tool Display */}
          <main className="lg:col-span-2 min-h-[600px]">
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
                    <div className="absolute top-4 right-4 z-20">
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
          </main>

        </div>
      </div>
    </div>
  );
}
