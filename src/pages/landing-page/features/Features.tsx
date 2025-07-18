import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  TrendingUp, 
  Video, 
  MessageCircle, 
  BarChart3, 
  Users, 
  Bot, 
  Shield,
  Zap,
  Target,
  Briefcase,
  Crown,
  Calculator,
  Calendar,
  ScanLine,
  TestTube,
  BookOpenCheck,
  Radio,
  Bell,
  GraduationCap
} from 'lucide-react';
import ContentSection from '@/components/landing/ContentSection';

const coreProducts = [
  {
    icon: BookOpen,
    title: "Education: The Master's Curriculum",
    description: "Education is not just information; it's the systematic installation of a professional trading framework into your mind. We don't teach you what to think, we teach you how to think like a seasoned analyst.",
    features: [
      "The Foundation Pathway: Market Mechanics, Advanced Candlestick Interpretation, Charting Essentials, Risk Management I, Trading Psychology Fundamentals",
      "The Specialist Pathway: Institutional Concepts (Order Blocks, Fair Value Gaps), Liquidity Engineering, Advanced Market Structure, Risk Management II",
      "50+ Professional HD Video Lessons with on-screen graphics and chart annotations",
      "Interactive Quizzes as Knowledge Gates - mandatory progression system",
      "Downloadable Arsenal: Trading Plan Templates, Strategy Checklists, Quick-Reference Guides",
      "Modular Learning: 5-10 minute focused sessions for any schedule",
      "Scenario-Based Testing: Practical application over rote memorization"
    ]
  },
  {
    icon: TrendingUp,
    title: "Signal Stream: Your Professional Trade Blueprint",
    description: "The Signal Stream is your 'over-the-shoulder' view of our professional analysts at work. Designed to generate potential profits while providing a masterclass in professional trade planning.",
    features: [
      "Precision Parameters: Exact Entry Price, Hard Stop Loss, Up to 5 Take Profit levels",
      "Multi-TP Strategy: Advanced trade management with partial profit taking and stop loss adjustment",
      "Analyst's Commentary: Brief but potent notes explaining the 'why' behind each trade",
      "Live Price Integration: Pulsating live price feed on alert cards with visual proximity indicators",
      "Automated Status & TP Tracking: Real-time trade progression with visual updates and notifications",
      "Risk Calculator Integration: One-click position sizing with pre-filled entry and stop loss prices",
      "24/5 Market Monitoring: Professional analysts covering major currency pairs around the clock"
    ]
  },
  {
    icon: Radio,
    title: "Live Sessions: The Virtual Trading Floor",
    description: "Direct, unfiltered access to the mind of a professional trader during the most critical hours of the trading day. Your chance to ask questions you can't find answers to in books or videos.",
    features: [
      "Pre-Session Briefing: Economic calendar review, market themes, and key levels identification",
      "Live Analysis & Execution: Real-time top-down analysis with live trade execution when valid setups appear",
      "Interactive Q&A Throughout: Direct questions to hosts via dedicated moderator for instant feedback",
      "Professional Zoom Integration: High-quality audio/video with robust interactive features",
      "Event Calendar & Notifications: Scheduled sessions with 15-minute email/push notifications",
      "The Archive Vault: Searchable recorded sessions with timestamps for key topics",
      "Daily Coverage: Key market sessions including London and New York openings"
    ]
  },
  {
    icon: MessageCircle,
    title: "Community Forum: The Collective Intelligence",
    description: "A curated, professional ecosystem designed to foster collaboration, eliminate bad habits, and keep you connected to a network of serious, like-minded peers.",
    features: [
      "Market-Specific Channels: #xauusd-gold, #eurusd-majors for focused asset discussion",
      "Concept Channels: #risk-management, #ict-smc-concepts for deep strategy questions",
      "Performance Channels: #trade-review, #psychology-check-in for growth-focused discussions",
      "The 'Second Opinion' Advantage: Community validation before trade execution",
      "Crowdsourced Strategy Refinement: Collaborative backtesting and strategy development",
      "Analyst & Moderator Presence: Professional analysts providing daily market outlooks",
      "Judgment-Free Growth Zone: Safe space for discussing wins, losses, and psychological struggles"
    ]
  },
  {
    icon: Briefcase,
    title: "IB Partnership: Your Trading Business Empire",
    description: "A fully-fledged, turnkey business opportunity. Build a significant, recurring income stream by leveraging the Imperial Trade brand and your personal network.",
    features: [
      "6-Tier Progression: Hero ($6/lot) → Expert ($9/lot) → Specialist ($12/lot) → Ambassador ($15/lot) → Royal Ambassador ($18/lot) → Imperial ($20/lot)",
      "IB Dashboard Mission Control: Real-time client tracking, live volume monitoring, earnings calculator, withdrawal interface",
      "Marketing & Onboarding Arsenal: Personalized referral links, professional marketing suite, client onboarding support",
      "Imperial Gold Club: Company-sponsored luxury retreats, exclusive cruises, leaderboard recognition",
      "Volume-Based Transparent Metrics: Clear pathway to next tier based on monthly trading volume",
      "Scalable Business Asset: Diversified income stream independent of personal trading P&L",
      "Career Path Integration: Not just referrals - a complete business development opportunity"
    ]
  }
];

const advancedTools = [
  {
    icon: BookOpenCheck,
    title: "Trading Journal: Ultimate Performance Optimizer",
    description: "Turn your trade history into actionable data with effortless logging, AI coach feedback, and pattern insights that break negative trading habits.",
    features: [
      "Effortless Logging: Quick trade entry with asset, P&L, and personal notes",
      "Screenshot Uploads: Attach chart screenshots for visual context and later review",
      "AI Coach Feedback: Encouraging comments highlighting good practices and constructive takeaways",
      "AI Pattern Insight: Detects recurring phrases like 'exited too early' or 'FOMO' and provides actionable insights",
      "Gamification: Unlock achievements and track journaling streaks to build consistent review habits",
      "Subconscious Bias Detection: Makes you aware of hidden trading patterns",
      "Concrete Improvement Steps: Specific actions to fix identified negative patterns"
    ]
  },
  {
    icon: Calendar,
    title: "Economic Calendar: Market Event Mastery",
    description: "Stay ahead of high-impact news events that create massive market volatility. Either avoid them or capitalize on them with comprehensive event intelligence.",
    features: [
      "Full Event Schedule: Complete listing of major economic events worldwide",
      "Advanced Filtering: Filter by date (Today, This Week), Impact Level (High, Medium, Low), and Currency",
      "Comprehensive Data: Previous, Forecast, and Actual data for instant impact assessment",
      "Event Descriptions: Detailed explanations of what each event means and market importance",
      "Volatility Preparation: Turn news from threat into opportunity",
      "Multi-Currency Coverage: Global economic events affecting all major trading pairs",
      "Real-Time Updates: Live data feeds for immediate market reaction analysis"
    ]
  },
  {
    icon: ScanLine,
    title: "AI Trade Analyst: The Deconstructor",
    description: "Get brutally honest, objective analysis of your trading performance. Upload screenshots from any platform and receive comprehensive reporting on your strengths and weaknesses.",
    features: [
      "Screenshot Analysis: Upload from any trading platform (MT4, TradingView, etc.)",
      "Comprehensive Reporting: Win rate, risk management consistency, average risk/reward analysis",
      "Trade Pattern Recognition: Identifies your most profitable setups and timing patterns",
      "Strengths & Weaknesses: Explicit lists of what you're doing well and areas for improvement",
      "Professional Performance Coaching: Like hiring a professional coach to review your work",
      "Bias-Free Analysis: Emotion-free, objective assessment of your trading performance",
      "Clear Improvement Roadmap: Specific steps to enhance your trading consistency"
    ]
  },
  {
    icon: TestTube,
    title: "AI Opportunity Scanner: The Signal Finder",
    description: "Save hours of screen time with 24/7 automated market scanning for high-probability trading setups across all major markets using proven strategies.",
    features: [
      "Automated Market Scanning: Constantly monitors Forex, Commodities, Indices, and Crypto",
      "Pattern Recognition: Identifies breakouts, trend reversals, and volatility squeezes",
      "High-Probability Alerts: Complete setup details with instrument, type, key levels, and probability scores",
      "24/7 Market Coverage: Never miss opportunities even when away from charts",
      "Multiple Asset Classes: Comprehensive coverage across all tradeable instruments",
      "Proven Strategy Filters: Based on institutional and retail-tested trading strategies",
      "Personal Research Assistant: Acts as your dedicated market opportunity scout"
    ]
  },
  {
    icon: Shield,
    title: "AI Risk Simulator: Trade War-Gaming",
    description: "War-game potential trades before risking real capital. Get AI-powered feedback on trade viability with risk assessment and probability analysis.",
    features: [
      "Trade Setup Input: Enter instrument, entry price, stop loss, and take profit parameters",
      "AI Risk Assessment: Analysis against current volatility, historical data, and technical levels",
      "Viability Score: Overall risk score with stop loss vs. take profit probability assessment",
      "Risk-Reward Validation: Feedback on proposed risk-to-reward ratios",
      "Trade Confirmation Layer: Kill bad ideas before they cost money, validate good ones",
      "Market Context Analysis: Current market conditions impact on proposed trade",
      "Confidence Building: Increase conviction in well-planned trades"
    ]
  },
  {
    icon: Calculator,
    title: "Risk Calculator: Position Sizing Mastery",
    description: "The single most important variable in trading: position size. Fast, accurate calculations for all instruments using correct formulas for survival and profitability.",
    features: [
      "Multi-Asset Calculation: Accurate formulas for Gold, JPY pairs, standard Forex, and Crypto",
      "Risk-Based Sizing: Input account balance, risk percentage, and stop distance for exact lot size",
      "Forward Calculation: Input lot size to see exact risk amount and potential profit",
      "Live Metrics: Instant Risk:Reward ratio and account percentage at risk display",
      "Capital Protection: Ensures you never lose more than planned on a single trade",
      "Long-Term Profitability: Key to staying in the game and building consistent profits",
      "Professional Risk Management: Industry-standard position sizing methodology"
    ]
  }
];

const navigationTabs = [
  { id: 'tools', name: 'Advanced Tools', icon: BarChart3 },
  { id: 'signals', name: 'Signals', icon: Bell },
  { id: 'education', name: 'Education', icon: GraduationCap },
  { id: 'live', name: 'Live Sessions', icon: Video },
  { id: 'community', name: 'Community Forum', icon: Users },
  { id: 'partnership', name: 'IB Partnership', icon: Briefcase },
];

export default function Features() {
  const [activeTab, setActiveTab] = useState('tools');
  const getActiveContent = () => {
    switch (activeTab) {
      case 'tools':
        return { title: 'Advanced Tools: The Trading Arsenal', subtitle: 'Your integrated suite of professional-grade utilities designed to give you a decisive edge in every aspect of your trading.', products: advancedTools, color: 'amber-300' };
      case 'signals':
        return { title: 'Signal Stream: Professional Trade Blueprint', subtitle: "Your 'over-the-shoulder' view of professional analysts at work, designed to generate profits while providing masterclass trade planning.", products: [coreProducts[1]], color: 'blue-400' };
      case 'education':
        return { title: "Education: The Master's Curriculum", subtitle: "Systematic installation of professional trading framework into your mind. We teach you how to think like a seasoned analyst.", products: [coreProducts[0]], color: 'purple-400' };
      case 'live':
        return { title: 'Live Sessions: Virtual Trading Floor', subtitle: 'Direct, unfiltered access to professional trader minds during critical market hours with interactive learning.', products: [coreProducts[2]], color: 'green-400' };
      case 'community':
        return { title: 'Community Forum: Collective Intelligence', subtitle: 'Curated professional ecosystem connecting 500+ serious traders in a supportive, growth-focused environment.', products: [coreProducts[3]], color: 'orange-400' };
      case 'partnership':
        return { title: 'IB Partnership: Trading Business Empire', subtitle: 'Fully-fledged business opportunity with 6-tier progression system and luxury rewards for top performers.', products: [coreProducts[4]], color: 'pink-400' };
      default:
        return { title: 'Advanced Tools: The Trading Arsenal', subtitle: 'Your integrated suite of professional-grade utilities designed to give you a decisive edge in every aspect of your trading.', products: advancedTools, color: 'amber-300' };
    }
  };

  const activeContent = getActiveContent();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <ContentSection className="py-24 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Crown className="h-10 w-10 text-primary" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-amber-300 bg-clip-text text-transparent">
              IMPERIAL FEATURES
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-4xl mx-auto mb-8 leading-relaxed">
            Join the elite ranks of Imperial Trading Partners. Unlock premium commissions, exclusive resources, 
            and build your trading empire with our industry-leading platform features.
          </p>
          <Badge variant="secondary" className="text-sm px-4 py-2 bg-primary/10 text-primary border-primary/20">
            <Shield className="h-4 w-4 mr-2" />
            Professional Grade • Secure • Reliable
          </Badge>
        </div>
      </ContentSection>

      {/* Interactive Navigation */}
      <ContentSection className="pb-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {navigationTabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "outline"}
                size="lg"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  activeTab === tab.id 
                    ? 'bg-primary text-primary-foreground shadow-lg transform scale-105' 
                    : 'hover:bg-accent hover:scale-105'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                {tab.name}
              </Button>
            ))}
          </div>
        </div>
      </ContentSection>

      {/* Dynamic Content Section */}
      <ContentSection className="pb-24 px-4">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center">
            <h2 className={`text-4xl font-bold text-foreground mb-4 bg-gradient-to-r from-${activeContent.color} to-primary bg-clip-text text-transparent`}>
              {activeContent.title}
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              {activeContent.subtitle}
            </p>
          </div>
          
          <div className={`space-y-12 ${activeTab === 'tools' ? 'grid md:grid-cols-2 gap-8' : ''}`}>
            {activeContent.products.map((product, productIndex) => (
              <Card key={productIndex} className={`bg-card border-border hover:border-${activeContent.color}/50 transition-all duration-300 group overflow-hidden`}>
                <CardHeader className="pb-6">
                  <div className="flex items-start gap-6">
                    <div className={`p-4 rounded-2xl bg-gradient-to-br from-${activeContent.color}/20 to-${activeContent.color}/5 group-hover:from-${activeContent.color}/30 group-hover:to-${activeContent.color}/10 transition-all duration-300`}>
                      <product.icon className={`h-8 w-8 text-${activeContent.color}`} />
                    </div>
                    <div className="flex-1">
                      <CardTitle className={`text-2xl text-card-foreground mb-3 group-hover:text-${activeContent.color} transition-colors`}>
                        {product.title}
                      </CardTitle>
                      <CardDescription className="text-muted-foreground text-base leading-relaxed">
                        {product.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <h4 className="font-semibold text-card-foreground text-sm mb-4 uppercase tracking-wide">
                      {activeTab === 'tools' ? 'Key Features:' : 'Detailed Features:'}
                    </h4>
                    <div className={activeTab === 'tools' ? 'space-y-2' : 'grid gap-3'}>
                      {(activeTab === 'tools' ? product.features.slice(0, 4) : product.features).map((feature, featureIndex) => (
                        <div key={featureIndex} className={`flex items-start gap-3 ${activeTab !== 'tools' ? 'p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors' : ''}`}>
                          <div className={`${activeTab === 'tools' ? 'w-1.5 h-1.5' : 'w-2 h-2'} rounded-full bg-${activeContent.color} mt-2 flex-shrink-0`}></div>
                          <span className="text-sm text-muted-foreground leading-relaxed">{feature}</span>
                        </div>
                      ))}
                      {activeTab === 'tools' && product.features.length > 4 && (
                        <div className={`text-xs text-${activeContent.color} font-medium`}>
                          +{product.features.length - 4} more features
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </ContentSection>

      {/* Call to Action */}
      <ContentSection className="pb-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-primary/10 to-amber-300/10 rounded-2xl p-12 border border-primary/20">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Ready to Start Your Trading Journey?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of traders who have elevated their trading with Imperial's 
              comprehensive platform. Access all features with a single membership.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors">
                Get Started Today
              </button>
              <button className="px-8 py-3 border border-border text-foreground rounded-lg font-semibold hover:bg-accent transition-colors">
                View Pricing
              </button>
            </div>
          </div>
        </div>
      </ContentSection>
    </div>
  );
}
