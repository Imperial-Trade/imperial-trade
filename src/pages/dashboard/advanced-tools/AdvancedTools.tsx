
import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, MousePointerClick } from 'lucide-react';

import TradingJournal from '@/components/tools/TradingJournal';
import EconomicCalendar from '@/components/tools/EconomicCalendar';
import RiskCalculator from '@/components/tools/RiskCalculator';
import TradeAnalyst from '@/components/ai/TradeAnalyst';
import OpportunityScanner from '@/components/ai/OpportunityScanner';
import RiskSimulator from '@/components/ai/RiskSimulator';

export default function AdvancedTools() {
  return (
    <div className="p-6">
      {/* Welcome Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center justify-center min-h-[80vh] text-center"
      >
        <div className="relative mb-6">
          <div className="absolute -inset-2 bg-primary/10 rounded-full animate-ping"></div>
          <div className="relative p-5 bg-background rounded-full border border-border">
            <Sparkles className="w-12 h-12 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Advanced Trading Tools</h2>
        <p className="text-muted-foreground max-w-md mb-8">
          Access professional-grade trading tools including risk calculators, market analysis, and AI-powered insights to enhance your trading strategy.
        </p>
        
        {/* Tool Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
          {/* Trading Journal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-lg border p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-semibold mb-2">Trading Journal</h3>
            <p className="text-sm text-muted-foreground mb-4">Log and analyze your trades with AI-powered feedback.</p>
            <TradingJournal />
          </motion.div>

          {/* Economic Calendar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-lg border p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-semibold mb-2">Economic Calendar</h3>
            <p className="text-sm text-muted-foreground mb-4">Stay ahead of market-moving events and news releases.</p>
            <EconomicCalendar />
          </motion.div>

          {/* Risk Calculator */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card rounded-lg border p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-semibold mb-2">Risk Calculator</h3>
            <p className="text-sm text-muted-foreground mb-4">Calculate position size, risk, and potential profit.</p>
            <RiskCalculator />
          </motion.div>

          {/* Trade Analyst */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card rounded-lg border p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-semibold mb-2">Trade Analyst</h3>
            <p className="text-sm text-muted-foreground mb-4">Upload screenshots for deep performance analysis.</p>
            <TradeAnalyst />
          </motion.div>

          {/* Opportunity Scanner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-card rounded-lg border p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-semibold mb-2">Opportunity Scanner</h3>
            <p className="text-sm text-muted-foreground mb-4">Scan markets for high-probability trading setups.</p>
            <OpportunityScanner />
          </motion.div>

          {/* Risk Simulator */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-card rounded-lg border p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-semibold mb-2">Risk Simulator</h3>
            <p className="text-sm text-muted-foreground mb-4">Simulate trade setups to assess risk before you enter.</p>
            <RiskSimulator />
          </motion.div>
        </div>

        <div className="flex items-center gap-2 mt-8 text-muted-foreground">
          <MousePointerClick className="w-5 h-5" />
          <span>Select any tool to get started with your analysis</span>
        </div>
      </motion.div>
    </div>
  );
}
