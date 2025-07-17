
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TradingJournalApp } from '@/components/tools/TradingJournalApp';
import { 
  Sparkles, 
  Search, 
  Scale, 
  BookOpen, 
  Calendar, 
  Calculator,
  Upload,
  TrendingUp,
  BarChart3,
  Star
} from 'lucide-react';

interface Tool {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  category: 'ai' | 'core';
  badge?: string;
  comingSoon?: boolean;
}

const tools: Tool[] = [
  {
    id: 'trade-analyst',
    title: 'Trade Analyst',
    description: 'Upload screenshots for deep performance analysis and AI-powered insights.',
    icon: Upload,
    category: 'ai',
    badge: 'AI-POWERED',
    comingSoon: true
  },
  {
    id: 'opportunity-scanner',
    title: 'Opportunity Scanner',
    description: 'Scan markets for high-probability trading opportunities using advanced algorithms.',
    icon: Search,
    category: 'ai',
    badge: 'AI-POWERED',
    comingSoon: true
  },
  {
    id: 'risk-simulator',
    title: 'Risk Simulator',
    description: 'Simulate trade setups to assess risk before committing capital.',
    icon: Scale,
    category: 'ai',
    badge: 'AI-POWERED',
    comingSoon: true
  },
  {
    id: 'trading-journal',
    title: 'Trading Journal',
    description: 'Log and analyze your trades with AI-powered feedback and insights.',
    icon: BookOpen,
    category: 'core'
  },
  {
    id: 'economic-calendar',
    title: 'Economic Calendar',
    description: 'Stay ahead of market-moving events and economic announcements.',
    icon: Calendar,
    category: 'core',
    comingSoon: true
  },
  {
    id: 'risk-calculator',
    title: 'Risk Calculator',
    description: 'Calculate position size, risk, and potential returns for optimal trade management.',
    icon: Calculator,
    category: 'core',
    comingSoon: true
  }
];

const journalTools = [
  {
    id: 'advanced-journal',
    title: 'Advanced Journal',
    description: 'Comprehensive trade logging with AI analytics, equity curves, and performance insights.',
    icon: TrendingUp,
    active: true
  },
  {
    id: 'performance-analytics',
    title: 'Performance Analytics',
    description: 'Deep dive into your trading statistics and identify improvement areas.',
    icon: BarChart3,
    comingSoon: true
  }
];

const AdvancedTools: React.FC = () => {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [selectedJournalTool, setSelectedJournalTool] = useState<string>('advanced-journal');

  if (selectedTool === 'trading-journal') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => setSelectedTool(null)}
              className="mb-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to Tools
            </button>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Trading Journal
            </h1>
            <p className="text-muted-foreground mt-2">
              Professional trade logging and analysis suite
            </p>
          </div>

          {/* Journal Tool Selection */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
            <div className="lg:col-span-1">
              <h3 className="text-lg font-semibold mb-4">Journal Tools</h3>
              <div className="space-y-3">
                {journalTools.map((tool) => (
                  <Card
                    key={tool.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-lg border ${
                      selectedJournalTool === tool.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    } ${tool.comingSoon ? 'opacity-60' : ''}`}
                    onClick={() => !tool.comingSoon && setSelectedJournalTool(tool.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          selectedJournalTool === tool.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}>
                          <tool.icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm">{tool.title}</h4>
                            {tool.comingSoon && (
                              <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {tool.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="lg:col-span-3">
              {selectedJournalTool === 'advanced-journal' && <TradingJournalApp />}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="max-w-7xl mx-auto p-6">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="p-4 bg-gradient-to-br from-primary/20 to-primary-glow/20 rounded-2xl border border-primary/20">
              <Star className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-4">
            Advanced <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">Trading Arsenal</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-6 max-w-3xl mx-auto">
            Your centralized hub for professional-grade trading analysis, AI-powered insights, and risk management.
          </p>
          <div className="text-center">
            <p className="text-lg text-muted-foreground mb-2">
              Select a tool from the sidebar to begin your analysis. Harness the power of AI and professional-grade utilities to elevate your trading strategy.
            </p>
            <p className="text-muted-foreground">
              Hover over the sidebar and click a tool to get started
            </p>
          </div>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* AI-Powered Intelligence Section */}
          <div className="lg:col-span-4">
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">AI-POWERED INTELLIGENCE</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {tools.filter(tool => tool.category === 'ai').map((tool) => (
                <Card
                  key={tool.id}
                  className={`group cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-primary/20 border-border hover:border-primary/50 hover:-translate-y-1 ${
                    tool.comingSoon ? 'opacity-60' : ''
                  }`}
                  onClick={() => !tool.comingSoon && setSelectedTool(tool.id)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-gradient-to-br from-primary/10 to-primary-glow/10 rounded-xl border border-primary/20 group-hover:scale-110 transition-transform duration-200">
                        <tool.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {tool.title}
                          </h3>
                          {tool.badge && (
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                              {tool.badge}
                            </Badge>
                          )}
                          {tool.comingSoon && (
                            <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors leading-relaxed">
                          {tool.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Core Trading Tools Section */}
          <div className="lg:col-span-4">
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">CORE TRADING TOOLS</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tools.filter(tool => tool.category === 'core').map((tool) => (
                <Card
                  key={tool.id}
                  className={`group cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-primary/20 border-border hover:border-primary/50 hover:-translate-y-1 ${
                    tool.comingSoon ? 'opacity-60' : ''
                  }`}
                  onClick={() => !tool.comingSoon && setSelectedTool(tool.id)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-gradient-to-br from-primary/10 to-primary-glow/10 rounded-xl border border-primary/20 group-hover:scale-110 transition-transform duration-200">
                        <tool.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {tool.title}
                          </h3>
                          {tool.comingSoon && (
                            <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors leading-relaxed">
                          {tool.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedTools;
