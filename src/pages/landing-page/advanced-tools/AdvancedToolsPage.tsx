import React from "react";
import {
  Calculator,
  BarChart3,
  Search,
  FileText,
  Calendar,
  Shield,
  ArrowRight,
  CheckCircle,
  Target,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const AdvancedToolsPage: React.FC = () => {
  // Clear any potential reference errors
  const tools = [
    {
      icon: FileText,
      title: "Trading Journal",
      subtitle: "Ultimate Performance Optimizer",
      description: "Turn your trade history into actionable data with the ultimate tool for self-reflection and performance optimization.",
      detailedFeatures: [
        "Effortless Logging: Quickly log trades with asset, P&L, and personal notes on trade reasoning",
        "Screenshot Uploads: Attach chart screenshots for visual context and comprehensive later review",
        "AI Coach Feedback: Encouraging comments highlighting good practices and constructive takeaways after each entry",
        "AI Pattern Insight: Analyzes your notes over time, detecting recurring phrases like 'exited too early' or 'FOMO'",
        "Gamification System: Unlock achievements and track your journaling 'streak' to build critical review habits",
        "Subconscious Bias Detection: Makes you aware of hidden trading patterns and psychological triggers",
        "Concrete Improvement Steps: Specific, actionable insights to break negative trading patterns"
      ],
      whatItDoes: "This is the single most powerful tool for long-term improvement. It makes you aware of your subconscious trading biases and gives you concrete steps to fix them.",
      gradient: "from-blue-500/20 to-cyan-500/20",
      accentColor: "blue"
    },
    {
      icon: Calendar,
      title: "Economic Calendar",
      subtitle: "Market Event Mastery",
      description: "Ensure you're always aware of high-impact news events that can create massive market volatility.",
      detailedFeatures: [
        "Full Event Schedule: Complete listing of all major economic events from around the world",
        "Advanced Filtering: Filter by date (Today, This Week), Impact Level (High, Medium, Low), and Currency",
        "Comprehensive Data: Shows Previous, Forecast, and Actual data for instant impact assessment",
        "Event Descriptions: Detailed explanations of what each event means and why it's important",
        "Volatility Intelligence: Turn news events from threats into profitable opportunities",
        "Multi-Currency Coverage: Global economic events affecting all major trading pairs",
        "Real-Time Updates: Live data feeds for immediate market reaction analysis"
      ],
      whatItDoes: "It prevents you from being caught on the wrong side of a sudden, news-driven market move. It turns news from a threat into an opportunity.",
      gradient: "from-emerald-500/20 to-teal-500/20",
      accentColor: "emerald"
    },
    {
      icon: Search,
      title: "AI Trade Analyst",
      subtitle: "The Deconstructor",
      description: "Get brutally honest, objective analysis of your trading performance by having AI review your actual trade history.",
      detailedFeatures: [
        "Screenshot Analysis: Upload screenshots from any trading platform (MT4, TradingView, etc.)",
        "Comprehensive Reporting: Analyzes win rate, risk management consistency, and average risk/reward",
        "Trade Pattern Recognition: Identifies your most profitable setups and optimal timing patterns",
        "Strengths & Weaknesses: Explicit lists of what you're doing well and areas needing improvement",
        "Institutional Performance Coaching: Like hiring an institutional coach to review your work objectively",
        "Bias-Free Analysis: Shows the truth of your trading, free from emotion or personal bias",
        "Clear Improvement Roadmap: Specific, actionable steps to enhance trading consistency"
      ],
      whatItDoes: "It's like hiring a professional performance coach to review your work. It shows you the truth of your trading, free from emotion or bias, and gives you a clear roadmap for improvement.",
      gradient: "from-purple-500/20 to-indigo-500/20",
      accentColor: "purple"
    },
    {
      icon: BarChart3,
      title: "AI Opportunity Scanner",
      subtitle: "The Signal Finder",
      description: "Save hours of screen time with 24/7 automated market scanning for high-probability trading setups.",
      detailedFeatures: [
        "Automated Market Scanning: AI constantly monitors Forex, Commodities, Indices, and Crypto markets",
        "Pattern Recognition: Identifies key technical patterns like breakouts, reversals, and volatility squeezes",
        "High-Probability Alerts: Complete setup details with instrument, type, key levels, and probability scores",
        "24/7 Market Coverage: Never miss A+ trading opportunities, even when away from charts",
        "Multiple Asset Classes: Comprehensive coverage across all tradeable financial instruments",
        "Proven Strategy Filters: Based on institutional and retail-tested trading methodologies",
        "Personal Research Assistant: Acts as your dedicated market opportunity scout around the clock"
      ],
      whatItDoes: "It acts as your personal research assistant, ensuring you never miss a potential A+ trading opportunity, even when you're away from the charts.",
      gradient: "from-amber-500/20 to-orange-500/20",
      accentColor: "amber"
    },
    {
      icon: Shield,
      title: "AI Risk Simulator",
      subtitle: "Trade War-Gaming",
      description: "War-game potential trades before risking real capital, getting AI-powered feedback on trade viability.",
      detailedFeatures: [
        "Setup Analysis Input: Enter parameters of setups you're analyzing - instrument, entry, stop loss, take profit",
        "AI Risk Assessment: Analyzes proposed trades against current volatility, historical data, and key levels",
        "Viability Score: Provides overall risk score and probability of hitting stop loss vs. take profit",
        "Risk-Reward Validation: Comprehensive feedback on your proposed risk-to-reward ratios",
        "Trade Confirmation Layer: Helps kill bad trade ideas before they cost money",
        "Market Context Analysis: Considers current market conditions and their impact on proposed trades",
        "Confidence Building: Validates good trades, increasing your conviction and execution confidence"
      ],
      whatItDoes: "It adds a crucial layer of confirmation to your trade planning. It helps you kill bad trade ideas before they cost you money and validates good ones, increasing your confidence.",
      gradient: "from-red-500/20 to-pink-500/20",
      accentColor: "red"
    },
    {
      icon: Calculator,
      title: "Risk Calculator",
      subtitle: "Position Sizing Mastery",
      description: "Calculate the single most important variable in trading: position size. Fast, accurate, and deadly precise.",
      detailedFeatures: [
        "Multi-Asset Calculation: Accurate formulas for Gold, JPY pairs, standard Forex, and Crypto instruments",
        "Risk-Based Sizing: Input account balance, desired risk percentage, and stop distance for exact lot size",
        "Forward Calculation: Input lot size to see exact risk amount and potential profit instantly",
        "Live Metrics: Shows Risk:Reward ratio and percentage of account at risk in real-time",
        "Capital Protection: Ensures you never lose more than planned on any single trade",
        "Long-Term Profitability: Key to staying in the game and building consistent profits over time",
        "Institutional Standards: Industry-standard position sizing methodology used by institutions"
      ],
      whatItDoes: "This tool is the key to survival and long-term profitability. It ensures you can never lose more than you plan to on a single trade, protecting your capital and allowing you to stay in the game.",
      gradient: "from-violet-500/20 to-purple-500/20",
      accentColor: "violet"
    }
  ];

  const stats = [
    { value: "6", label: "Advanced Tools", subtitle: "Complete Arsenal" },
    { value: "24/7", label: "Market Scanning", subtitle: "Never Miss Opportunities" },
    { value: "99.9%", label: "Accuracy Rate", subtitle: "Institutional Grade" }
  ];

  return (
    <div className="bg-background min-h-screen font-sans">
      {/* Hero Section */}
      <section className="relative py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center space-y-8">
            <div className="space-y-6">
              <Badge variant="outline" className="inline-flex items-center gap-2 border-primary/20 text-primary bg-primary/5">
                <Target className="h-4 w-4" />
                Advanced Trading Arsenal
              </Badge>
              <h1 className="text-6xl font-bold leading-tight tracking-tight">
                <span className="bg-gradient-to-r from-primary via-amber-400 to-primary bg-clip-text text-transparent">
                  Professional-Grade
                </span>
                <br />
                <span className="text-foreground">Trading Tools</span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-4xl mx-auto">
                Your integrated suite of professional-grade utilities designed to give you a decisive edge in every aspect of your trading. 
                Each tool is a weapon in your arsenal, engineered for precision and results.
              </p>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="text-center space-y-2">
                  <div className="text-3xl font-bold text-primary">{stat.value}</div>
                  <div className="text-sm font-medium text-foreground">{stat.label}</div>
                  <div className="text-xs text-muted-foreground">{stat.subtitle}</div>
                </div>
              ))}
            </div>
            
            <div className="flex items-center justify-center gap-4">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8">
                Start Your Arsenal
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" className="border-primary/20 hover:bg-primary/5 px-8">
                Explore Tools
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-amber-400 to-primary bg-clip-text text-transparent">
                The Trading Arsenal
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Six precision-engineered tools that transform how you analyze, execute, and optimize your trading performance.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {tools.map((tool, index) => (
              <Card key={index} className="group border-border/50 hover:border-primary/30 transition-all duration-300 overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${tool.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative">
                  <CardHeader className="space-y-4">
                    <div className="flex items-start gap-6">
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 group-hover:from-primary/20 group-hover:to-primary/10 transition-all duration-300">
                        <tool.icon className="h-8 w-8 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="space-y-1">
                          <CardTitle className="text-2xl text-foreground group-hover:text-primary transition-colors">
                            {tool.title}
                          </CardTitle>
                          <div className="text-sm font-medium text-primary">
                            {tool.subtitle}
                          </div>
                        </div>
                        <CardDescription className="text-muted-foreground mt-3 leading-relaxed">
                          {tool.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    {/* What It Does */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">What It Does For You:</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed italic bg-muted/30 p-4 rounded-lg">
                        "{tool.whatItDoes}"
                      </p>
                    </div>

                    {/* Detailed Features */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">Detailed Features:</h4>
                      <div className="space-y-2">
                        {tool.detailedFeatures.slice(0, 4).map((feature, idx) => (
                          <div key={idx} className="flex items-start gap-3 text-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                            <span className="text-muted-foreground leading-relaxed">{feature}</span>
                          </div>
                        ))}
                        {tool.detailedFeatures.length > 4 && (
                          <div className="text-xs text-primary font-medium pl-4">
                            +{tool.detailedFeatures.length - 4} more advanced features
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Button className="w-full bg-primary/10 hover:bg-primary hover:text-primary-foreground text-primary border border-primary/20 transition-all duration-300">
                      Explore {tool.title}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-amber-400/5" />
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="space-y-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20">
              <Zap className="h-10 w-10 text-primary" />
            </div>
            
            <div className="space-y-4">
              <h2 className="text-4xl font-bold text-foreground">
                Arm Yourself with 
                <span className="bg-gradient-to-r from-primary to-amber-400 bg-clip-text text-transparent"> Professional Tools</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Join the ranks of professional traders who use these institutional-grade tools to gain their edge in the markets.
              </p>
            </div>
            
            <div className="flex items-center justify-center gap-4">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8">
                Access Professional Tools
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" className="border-primary/20 hover:bg-primary/5 px-8">
                Schedule Demo
              </Button>
            </div>
            
            <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                14-day trial included
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                No setup fees
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                Professional support
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdvancedToolsPage;