import React from "react";
import { Bell, Activity, Brain, Target, LineChart, Clock, ArrowRight, CheckCircle, TrendingUp, Zap, Eye, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
const SignalsPage: React.FC = () => {
  const signalFeatures = [{
    icon: Target,
    title: "Precision Parameters",
    subtitle: "The Complete Trade Blueprint",
    description: "Every alert is a complete trade plan with exact entry prices, hard stop losses, and up to 5 Take Profit levels.",
    detailedFeatures: ["Exact Entry Price: Precise entry points down to the pip (e.g., 2342.50 for Gold)", "Hard Stop Loss: Clearly defined risk parameters for every single trade", "Multi-TP Strategy: Up to 5 Take Profit levels for educational setup analysis", "Analyst's Commentary: Brief but potent notes explaining the 'why' behind each trade", "Risk-Reward Analysis: Pre-calculated ratios for informed decision making", "Trade Timeframe: Clear indication of expected trade duration and style"],
    whatItDoes: "It provides more than just 'Buy Gold.' You get a complete professional trade plan with every parameter you need to execute like an institutional trader.",
    gradient: "from-green-500/20 to-emerald-500/20"
  }, {
    icon: Activity,
    title: "Live Dashboard Interface",
    subtitle: "Real-Time Trade Management",
    description: "A live, breathing interface that tracks your trades in real-time with automated status updates.",
    detailedFeatures: ["Live Price Integration: Pulsating live price feed directly on alert cards", "Visual Proximity Indicators: See how close price is to entry/exit levels instantly", "Automated Status Updates: System monitors price and updates trade progression automatically", "TP Tracking: Visual updates when Take Profit levels are hit with notifications", "Risk Calculator Integration: One-click position sizing with pre-filled parameters", "Performance Metrics: Live tracking of signal success rates and performance"],
    whatItDoes: "It gives you a professional trading desk experience, monitoring your positions and alerting you to important developments without you having to watch charts constantly.",
    gradient: "from-blue-500/20 to-cyan-500/20"
  }, {
    icon: Brain,
    title: "Market Educator Commentary",
    subtitle: "Learn While You Analyze",
    description: "Each signal includes expert analysis explaining the reasoning, making it a mini masterclass in professional trading.",
    detailedFeatures: ["Market Context: Understanding of current market conditions and themes", "Technical Analysis: Explanation of chart patterns and technical setups", "Risk Assessment: Why this particular risk-reward makes sense", "Entry Timing: Optimal timing considerations for trade execution", "Market Psychology: Understanding sentiment and positioning factors", "Alternative Scenarios: What to watch for if the trade doesn't go as planned"],
    whatItDoes: "It demystifies market analysis by showing you exactly how experienced market educators think and plan their analysis, turning every pattern into a learning opportunity.",
    gradient: "from-purple-500/20 to-indigo-500/20"
  }, {
    icon: Clock,
    title: "24/5 Market Coverage",
    subtitle: "Global Market Monitoring",
    description: "Market educators covering major currency pairs and instruments around the clock during market hours.",
    detailedFeatures: ["London Session Coverage: Key European market hours with GBP and EUR focus", "New York Session Coverage: US market hours with major USD pairs", "Asian Session Monitoring: Coverage of JPY pairs and commodity currencies", "Major Event Coverage: Special analysis during high-impact news releases", "Weekend Preparation: Market outlook and setup identification for the week ahead", "Holiday Adjustments: Modified coverage during market holidays and low liquidity periods"],
    whatItDoes: "It ensures you never miss high-probability opportunities regardless of your timezone, with professional oversight during all major trading sessions.",
    gradient: "from-amber-500/20 to-orange-500/20"
  }];
  const tradingApproach = [{
    icon: Eye,
    title: "The 'Over-the-Shoulder' Experience",
    description: "Watch market educators work in real-time, seeing their complete thought process and decision-making methodology.",
    benefits: ["Real-time learning", "Educational mindset", "Decision transparency"]
  }, {
    icon: BarChart3,
    title: "Advanced Trade Management",
    description: "Learn sophisticated position management through partial profit-taking, stop loss adjustment, and risk optimization.",
    benefits: ["Risk management", "Educational optimization", "Learning techniques"]
  }, {
    icon: TrendingUp,
    title: "Earn While You Learn",
    description: "Develop analytical skills while simultaneously receiving a masterclass in market analysis and educational content.",
    benefits: ["Educational purpose only", "Market analysis learning", "Pattern recognition development"]
  }];
  const stats = [{
    value: "73%",
    label: "Hypothetical Success Rate",
    subtitle: "Educational Backtest"
  }, {
    value: "2.4:1",
    label: "Avg Risk/Reward",
    subtitle: "Educational Reference"
  }, {
    value: "24/5",
    label: "Market Coverage",
    subtitle: "Educational Analysis"
  }];
  return <div className="bg-background min-h-screen font-sans">
      {/* Hero Section */}
      <section className="relative py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-green-500/5" />
        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-6">
                <Badge variant="outline" className="inline-flex items-center gap-2 border-green-500/20 text-green-600 bg-green-500/5">
                  <Bell className="h-4 w-4" />
                  Educational Market Analysis
                </Badge>
                <h1 className="text-6xl font-bold leading-tight tracking-tight">
                  <span className="bg-gradient-to-r from-green-500 via-emerald-400 to-green-600 bg-clip-text text-transparent">Xeon Alerts </span>
                  <br />
                  <span className="text-foreground text-5xl">Your Learning Platform</span>
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Educational tools designed to help you understand market patterns and develop analytical skills. 
                  Learn from experienced market contributors through structured analysis and educational content.
                </p>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-3 gap-6">
                {stats.map((stat, index) => <div key={index} className="text-center space-y-2">
                    <div className="text-3xl font-bold text-green-600">{stat.value}</div>
                    <div className="text-sm font-medium text-foreground">{stat.label}</div>
                    <div className="text-xs text-muted-foreground">{stat.subtitle}</div>
                  </div>)}
              </div>
              
              <div className="flex items-center gap-4">
                <Button size="lg" className="bg-green-600 text-white px-8">
                  Start Learning Patterns
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button variant="outline" size="lg" className="border-green-500/20 px-8">
                  View Educational Results
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-3xl blur-3xl" />
              <div className="relative bg-card border border-green-500/20 rounded-2xl p-8">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-sm font-medium text-foreground">LIVE PATTERN</span>
                    </div>
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20">ACTIVE</Badge>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="text-2xl font-bold text-foreground">XAU/USD (Gold)</div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Entry</div>
                        <div className="font-semibold text-foreground">2,342.50</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Current</div>
                        <div className="font-semibold text-green-600">2,358.20</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Stop Loss</div>
                        <div className="font-semibold text-red-500">2,335.00</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">TP1 Hit</div>
                        <div className="font-semibold text-green-600">✓ 2,350.00</div>
                      </div>
                    </div>
                    
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                      <div className="text-xs text-muted-foreground mb-1">Educational Note:</div>
                      <div className="text-sm text-foreground">"Bullish divergence on H4, targeting daily liquidity zone"</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Signal Features */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-emerald-400 to-green-600 bg-clip-text text-transparent">
                The Anatomy of Educational Analysis
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Every analysis is a complete educational blueprint, designed to teach market understanding.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {signalFeatures.map((feature, index) => <Card key={index} className="border-border/50 transition-all duration-300 overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 transition-opacity duration-500`} />
                <div className="relative">
                  <CardHeader className="space-y-4">
                    <div className="flex items-start gap-6">
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-green-500/10 to-green-500/5 transition-all duration-300">
                        <feature.icon className="h-8 w-8 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="space-y-1">
                          <CardTitle className="text-2xl text-foreground transition-colors">
                            {feature.title}
                          </CardTitle>
                          <div className="text-sm font-medium text-green-600">
                            {feature.subtitle}
                          </div>
                        </div>
                        <CardDescription className="text-muted-foreground mt-3 leading-relaxed">
                          {feature.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">What This Means:</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed italic bg-muted/30 p-4 rounded-lg">
                        "{feature.whatItDoes}"
                      </p>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">Detailed Features:</h4>
                      <div className="space-y-2">
                        {feature.detailedFeatures.slice(0, 4).map((detail, idx) => <div key={idx} className="flex items-start gap-3 text-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-600 mt-2 flex-shrink-0" />
                            <span className="text-muted-foreground leading-relaxed">{detail}</span>
                          </div>)}
                        {feature.detailedFeatures.length > 4 && <div className="text-xs text-green-600 font-medium pl-4">
                            +{feature.detailedFeatures.length - 4} more professional features
                          </div>}
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>)}
          </div>
        </div>
      </section>

      {/* Trading Approach */}
      <section className="py-24 px-6 bg-gradient-to-br from-green-500/5 to-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Our Educational Analysis Approach
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              More than patterns - it's a complete educational experience designed to transform your analytical mindset.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {tradingApproach.map((approach, index) => <Card key={index} className="text-center border-border/50 transition-all duration-300">
                <CardHeader className="space-y-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/10 to-green-500/5 mx-auto">
                    <approach.icon className="h-8 w-8 text-green-600" />
                  </div>
                  <CardTitle className="text-xl text-foreground">
                    {approach.title}
                  </CardTitle>
                  <CardDescription className="text-muted-foreground leading-relaxed">
                    {approach.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-2">
                    {approach.benefits.map((benefit, idx) => <div key={idx} className="flex items-center justify-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <span className="text-muted-foreground">{benefit}</span>
                      </div>)}
                  </div>
                </CardContent>
              </Card>)}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-background to-emerald-400/5" />
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="space-y-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-green-500/10 border border-green-500/20">
              <Zap className="h-10 w-10 text-green-600" />
            </div>
            
            <div className="space-y-4">
              <h2 className="text-4xl font-bold text-foreground">
                Start Your 
                <span className="bg-gradient-to-r from-green-500 to-emerald-400 bg-clip-text text-transparent"> Educational Journey</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Join thousands of traders who use our educational tools to improve their analytical skills while learning from experienced contributors.
              </p>
            </div>
            
            <div className="flex items-center justify-center gap-4">
              <Button size="lg" className="bg-green-600 text-white px-8">
                Get Educational Patterns
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" className="border-green-500/20 px-8">
                View Educational Record
              </Button>
            </div>
            
            <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Hypothetical 73% analysis rate
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Risk management included
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Study while you analyze
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>;
};
export default SignalsPage;