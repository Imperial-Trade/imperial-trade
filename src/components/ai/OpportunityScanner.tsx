import React from 'react';
import { Card } from '@/components/ui/card';
import { Brain, Target, BookOpen, BarChart3, Zap, Clock } from 'lucide-react';

export default function OpportunityScanner() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-2 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-3 sm:space-y-6">

        {/* Coming Soon Content */}
        <div className="text-center py-8 sm:py-12 lg:py-16">
          <div className="max-w-2xl mx-auto px-4">
            <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-full w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 flex items-center justify-center mx-auto mb-6 sm:mb-8">
              <Brain className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-primary" />
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 sm:mb-4">
              Educational Pattern Scanner
            </h2>
            
            <p className="text-base sm:text-lg text-muted-foreground mb-6 sm:mb-8">
              We're developing an advanced AI-powered pattern recognition system that will analyze market data to identify educational trading opportunities and help you learn market analysis.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <Card className="bg-card/50 border-border/50 p-4 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="bg-blue-500/10 rounded-lg p-1.5 sm:p-2 flex-shrink-0">
                    <Target className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm sm:text-base">Pattern Recognition</h3>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  AI will identify educational patterns across multiple asset classes for learning purposes
                </p>
              </Card>
              
              <Card className="bg-card/50 border-border/50 p-4 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="bg-green-500/10 rounded-lg p-1.5 sm:p-2 flex-shrink-0">
                    <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm sm:text-base">Educational Focus</h3>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Learn market analysis through real-world examples and pattern explanations
                </p>
              </Card>
              
              <Card className="bg-card/50 border-border/50 p-4 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="bg-purple-500/10 rounded-lg p-1.5 sm:p-2 flex-shrink-0">
                    <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm sm:text-base">Real-time Analysis</h3>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Live market data integration for current educational opportunities
                </p>
              </Card>
              
              <Card className="bg-card/50 border-border/50 p-4 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="bg-orange-500/10 rounded-lg p-1.5 sm:p-2 flex-shrink-0">
                    <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm sm:text-base">Personalized Learning</h3>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  AI-powered recommendations based on your trading preferences and learning style
                </p>
              </Card>
            </div>
            
            <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20 p-4 sm:p-6">
              <div className="flex items-center justify-center gap-2 text-primary mb-2">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="font-semibold text-sm sm:text-base">Coming Soon</span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                This feature is currently under development. Stay tuned for advanced AI-powered educational pattern analysis!
              </p>
            </Card>
          </div>
        </div>

      </div>
    </div>
  );
}