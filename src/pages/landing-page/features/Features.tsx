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
    description: "Education is not just information; it's the systematic installation of a professional trading framework into your mind. We don't teach you what to think, we teach you how to think like a seasoned analyst. Our goal is to make you self-sufficient.",
    features: [
      "The Foundation Pathway (Beginner to Intermediate): Market Mechanics, Advanced Candlestick Interpretation, Charting Essentials, Risk Management I, Trading Psychology Fundamentals - transforming you from confusion to confident trade placement and management",
      "The Specialist Pathway (Intermediate to Advanced): Institutional Concepts (Order Blocks, Fair Value Gaps), Liquidity Engineering, Advanced Market Structure, Risk Management II (Portfolio Hedging), High-Performance Mindset - transition to lethal market analyst with smart money perspective",
      "50+ Professional HD Video Lessons: Professionally produced, concise lessons with on-screen graphics, chart annotations, and clear explanations making complex topics digestible - no rambling, no fluff",
      "Interactive Quizzes & Knowledge Gates: Mandatory quizzes that act as 'knowledge gates' ensuring mastery before progression, preventing weak foundations with scenario-based questions testing practical application",
      "Downloadable Arsenal: Trading Plan Templates (professional-grade structured templates), Strategy Checklists (printable checklists for core strategies like 'The Liquidity Sweep Entry Model'), Cheat Sheets (quick-reference guides for candlestick patterns, chart formations, session timings)",
      "Modular Micro-Learning: Courses broken into 5-10 minute focused sessions allowing learning to fit any schedule with maximum retention",
      "Netflix-Style Video Interface: Category-based content organization (Beginner, Intermediate, Advanced) with progress tracking and completion percentages",
      "Learning Pathways with Certificates: Structured progression with completion certificates and achievement tracking",
      "Course Structure with Lessons and Quizzes: Comprehensive curriculum with user progress tracking throughout the entire educational journey"
    ]
  },
  {
    icon: TrendingUp,
    title: "Signal Stream: Your Professional Trade Blueprint",
    description: "The Signal Stream is your 'over-the-shoulder' view of our professional analysts at work. It's designed to be a dual-purpose tool: generate potential profits for you while simultaneously providing a masterclass in professional trade planning.",
    features: [
      "Precision Parameters: More than just 'Buy Gold' - exact Entry Price (e.g., 2342.50), hard Stop Loss (e.g., 2338.00), and up to 5 Take Profit (TP) levels for complete trade plans",
      "Multi-TP Advanced Strategy: Crucial trade management teaching - de-risk by taking partial profits at TP1, move stop loss to breakeven, let rest of position run for maximum winner potential",
      "Analyst's Commentary ('The Why'): Each alert includes brief but potent notes explaining rationale (e.g., 'Bullish divergence on H4, targeting daily liquidity at 2360') - mini-lessons in themselves",
      "Live Price Integration Dashboard: Pulsating dot or live number showing current market price directly on alert card - visual proximity to entry/exit levels without screen switching",
      "Automated Status & TP Tracking: System monitors price feed, visually updates when TP levels hit, greys out completed levels, triggers notifications for real-time trade progression feedback",
      "Risk Calculator Integration: 'Calculate Position Size' button pre-fills entry and stop-loss prices into Risk Calculator - just enter account balance and risk % for perfect lot size",
      "Professional Signal Streaming: WebSocket technology with role-based signal creation (Educators/Admins only), live price integration, signal status management (pending → active → closed)",
      "Take Profit Tracking: Multiple TP levels (TP1-TP5) with advanced filtering by status, type, educator, asset",
      "Signal Sharing & Notifications: Follower notifications system with comprehensive signal management tools",
      "24/5 Market Coverage: Professional analysts monitoring and providing signals across all major trading sessions"
    ]
  },
  {
    icon: Radio,
    title: "Live Sessions: The Virtual Trading Floor",
    description: "To provide direct, unfiltered access to the mind of a professional trader during the most critical hours of the trading day. This is your chance to ask the questions you can't find answers to in books or videos.",
    features: [
      "Pre-Session Briefing (First 15 mins): Host reviews economic calendar for the day, outlines major market themes, identifies key assets and levels being watched",
      "Live Analysis & Execution (Core Session): Heart of the session - host shares charting platform, performs top-down analysis, identifies potential setups real-time, explains reasoning. Live trade execution when valid setups appear",
      "Interactive Q&A Throughout: Not a lecture but a workshop - dedicated moderator feeds chat questions to host for live answers. Ask about unwatched pairs, get opinions on your analysis, clarify concepts",
      "Professional Zoom SDK Integration: Professional Zoom webinar setup for high-quality audio/video and robust interactive features with stream embedding and fallback options",
      "Event Calendar & Notifications: Upcoming sessions listed in event calendar with opt-in email/push notifications 15 minutes before sessions go live",
      "The Archive Vault: Every session recorded, timestamped with key topics, uploaded to searchable archive within 24 hours. Search 'Fed day analysis' or 'Gold breakout' for exact moments",
      "Session Scheduling & Management: Auto-start functionality for scheduled sessions with role-based access (Educators host, Members view)",
      "Daily Scheduled Sessions: Coverage of key market openings like London and New York sessions at optimal trading times",
      "Stream Recording & Replay: Session recording capabilities for those who miss live sessions or want to review key concepts multiple times"
    ]
  },
  {
    icon: MessageCircle,
    title: "Community Forum: The Collective Intelligence",
    description: "Trading is a lonely endeavor, but it doesn't have to be. The forum is a curated, professional ecosystem designed to foster collaboration, eliminate bad habits, and keep you connected to a network of serious, like-minded peers.",
    features: [
      "Market-Specific Channels: #xauusd-gold, #eurusd-majors for focused asset-specific discussion and chart analysis with targeted feedback",
      "Concept Channels: #risk-management, #ict-smc-concepts for deep strategy questions and advanced trading concept discussions",
      "Performance Channels: #trade-review, #psychology-check-in for posting winning/losing trades for community review and discussing psychological trading struggles - judgment-free growth zone",
      "The 'Second Opinion' Advantage: Post charts and analysis before trade execution - second set of experienced eyes helps spot missed elements, validates ideas, or saves from bad trades",
      "Crowdsourced Strategy Refinement: Share new strategy ideas for community backtesting, flaw identification, and rule refinement through collective wisdom",
      "Analyst & Moderator Presence: Professional analysts actively participate providing daily market outlooks, answering questions, weighing in on community trade ideas with professional oversight",
      "Forum System with Categories: Discussion, analysis, news, strategy with user following system for top traders and trading groups with shared journals",
      "Achievement System with Gamification: Trading achievement tracking with verified trader profiles showing performance metrics",
      "Post Engagement System: Likes, saves, and reply system for comprehensive community interaction and knowledge sharing",
      "User Following & Trading Groups: Connect with top performers and join trading groups for shared learning and accountability"
    ]
  },
  {
    icon: Briefcase,
    title: "IB Partnership: Your Trading Business Empire",
    description: "To provide our most ambitious members with a fully-fledged, turnkey business opportunity. We give you the tools, the structure, and the financial incentives to build a significant, recurring income stream by leveraging the power of the Imperial Trade brand and your personal network.",
    features: [
      "6-Tier Progression Path: Hero ($6/lot) → Expert ($9/lot) → Specialist ($12/lot) → Ambassador ($15/lot) → Royal Ambassador ($18/lot) → Imperial ($20/lot) based on total monthly trading volume with clear, transparent metrics",
      "IB Dashboard Mission Control: Dynamic dashboard showing Client List (every linked client), Live Volume Tracking (progress bar to next rank), Earnings Calculator (real-time monthly earnings), Withdrawal Interface (clear payout requests and tracking)",
      "Marketing & Onboarding Arsenal: Personalized Referral Link (automatic sign-up attribution), Marketing Suite (professionally designed banners, social media templates, email copy), Onboarding Support (client understanding and value materials)",
      "Imperial Gold Club Exclusive Rewards: Company-Sponsored Retreats (all-expenses-paid luxury destinations), Luxury Cruises & Events (success celebration rewards), Leaderboard Recognition (public-facing top partner status)",
      "Volume-Based Transparent Metrics: Clear pathway to next tier based on monthly trading volume - know exactly what's needed for advancement",
      "Scalable Business Asset: Diversified income stream independent of personal trading P&L - long-term business asset building",
      "Career Path Integration: Not just referrals but complete business development opportunity providing pathway to financial freedom",
      "Real-time Analytics & Tracking: Live commission tracking, client activity monitoring, and performance analytics dashboard",
      "Professional Marketing Materials: Access to high-quality promotional content and brand assets for effective client acquisition",
      "Dedicated Support System: Comprehensive support for IB partners including training and business development assistance"
    ]
  }
];

const advancedTools = [
  {
    icon: BookOpenCheck,
    title: "Trading Journal: Ultimate Performance Optimizer",
    description: "To be the ultimate tool for self-reflection and performance optimization by turning your trade history into actionable data. This is the single most powerful tool for long-term improvement.",
    features: [
      "Effortless Logging: Quickly log trades with key details - asset, P&L, and personal notes on why you took the trade with intuitive interface design",
      "Screenshot Uploads: Attach chart screenshot to each entry for visual context and later review - essential for pattern recognition and learning",
      "AI Coach Feedback: Upon submitting a trade, AI provides short, encouraging comment highlighting good practice or constructive takeaway, reinforcing positive habits",
      "AI Pattern Insight: System analyzes your notes over time - detects recurring phrases like 'exited too early,' 'FOMO,' or 'revenge trade' and provides specific, actionable insights to break negative patterns",
      "Gamification: Unlock achievements and track journaling 'streak' to build critical habit of consistent review with progress tracking and milestone rewards",
      "Subconscious Bias Detection: Makes you aware of your subconscious trading biases and gives concrete steps to fix them",
      "Trading Psychology Logging: Mood tracking and psychological state documentation for comprehensive performance analysis",
      "Performance Analytics: Advanced metrics tracking including win rate analysis, average holding times, and profit factor calculations with visual charts and graphs"
    ]
  },
  {
    icon: Calendar,
    title: "Economic Calendar: Market Event Mastery",
    description: "To ensure you are always aware of high-impact news events that can create massive market volatility, so you can either avoid them or capitalize on them. It turns news from a threat into an opportunity.",
    features: [
      "Full Event Schedule: Lists all major economic events from around the world with comprehensive coverage of central bank decisions, employment data, inflation reports, and GDP releases",
      "Advanced Filtering: Filter events by date (Today, This Week), Impact Level (High, Medium, Low), and by Currency with customizable view options for personalized market focus",
      "Comprehensive Data: Shows 'Previous,' 'Forecast,' and 'Actual' data for each event, allowing instant assessment if news was better or worse than expected with color-coded impact indicators",
      "Event Descriptions: Explains what each event means and why it's important for the market with detailed context and historical significance",
      "Volatility Preparation: Prevents being caught on wrong side of sudden, news-driven market moves with pre-event alerts and suggested trading actions",
      "Multi-Currency Coverage: Global economic events affecting all major trading pairs with timezone adjustments for local market hours",
      "Real-Time Updates: Live data feeds for immediate market reaction analysis with push notifications for high-impact events",
      "Historical Data Analysis: Access to past event impacts and market reactions for pattern recognition and strategy development"
    ]
  },
  {
    icon: ScanLine,
    title: "AI Trade Analyst: The Deconstructor",
    description: "To provide a deep, brutally honest, and objective analysis of your trading performance by having an AI review your actual trade history. It's like hiring a professional performance coach to review your work.",
    features: [
      "Screenshot Analysis: Upload screenshots from any trading platform (MT4, TradingView, etc.) for comprehensive visual trade analysis",
      "Comprehensive Reporting: AI analyzes all visible trades and generates detailed report covering win rate, risk management consistency, average risk/reward, and identifies most profitable setups",
      "Trade Pattern Recognition: Identifies your most profitable setups and timing patterns with detailed breakdowns of successful vs. unsuccessful trade characteristics",
      "Strengths & Weaknesses: Report explicitly lists what you're doing well (e.g., 'Excellent entry timing on pullbacks') and where you need improvement (e.g., 'Consistently cutting winners short')",
      "Professional Performance Coaching: Shows you the truth of your trading, free from emotion or bias, and gives clear roadmap for improvement",
      "Bias-Free Analysis: Emotion-free, objective assessment of your trading performance eliminating self-deception and confirmation bias",
      "Clear Improvement Roadmap: Specific steps to enhance trading consistency with actionable recommendations and practice exercises",
      "Portfolio Performance Tracking: Advanced P&L calculations and portfolio analytics with real-time tracking and historical performance analysis"
    ]
  },
  {
    icon: TestTube,
    title: "AI Opportunity Scanner: The Signal Finder",
    description: "To save you hours of screen time by proactively scanning all major markets 24/7 for high-probability trading setups that match proven strategies. It acts as your personal research assistant.",
    features: [
      "Automated Market Scanning: AI constantly monitors Forex, Commodities, Indices, and Crypto markets with sophisticated algorithms analyzing price action patterns",
      "Pattern Recognition: Identifies key technical patterns like breakouts from consolidation, major trend reversals, and volatility squeezes using institutional-grade analysis",
      "High-Probability Alerts: When quality setup identified, generates signal with instrument, type of setup, key levels to watch, and probability score with detailed reasoning",
      "24/7 Market Coverage: Ensures you never miss potential A+ trading opportunity, even when away from charts with intelligent alert prioritization",
      "Multiple Asset Classes: Comprehensive coverage across all tradeable instruments including major forex pairs, commodities, indices, and cryptocurrencies",
      "Proven Strategy Filters: Based on institutional and retail-tested trading strategies with backtested performance metrics",
      "Personal Research Assistant: Acts as dedicated market opportunity scout with customizable scanning parameters and user preference learning",
      "Market Alerts System: Custom conditions and real-time notifications for specific market movements and setup completions"
    ]
  },
  {
    icon: Shield,
    title: "AI Risk Simulator: Trade War-Gaming",
    description: "To allow you to 'war-game' a potential trade before risking real capital, getting AI-powered feedback on its viability. It adds crucial layer of confirmation to your trade planning.",
    features: [
      "Trade Setup Input: Enter parameters of trade you're considering - instrument, entry price, stop loss, and take profit with intuitive interface for quick analysis",
      "AI Risk Assessment: AI analyzes proposed trade against current market volatility, historical data, and key technical levels with sophisticated risk modeling",
      "Viability Score: Provides overall risk score, probability of hitting stop loss vs. take profit, and feedback on proposed risk-to-reward ratio with detailed explanation",
      "Risk-Reward Validation: Helps kill bad trade ideas before they cost money and validates good ones, increasing confidence in decision-making process",
      "Trade Confirmation Layer: Additional verification step preventing impulsive trading decisions with objective analysis free from emotional bias",
      "Market Context Analysis: Current market conditions impact assessment on proposed trade with volatility and correlation analysis",
      "Confidence Building: Increases conviction in well-planned trades through systematic validation process and risk quantification",
      "Risk Management Calculators: Advanced position sizing tools and portfolio risk assessment with scenario analysis and stress testing"
    ]
  },
  {
    icon: Calculator,
    title: "Risk Calculator: Position Sizing Mastery",
    description: "To provide a simple, fast, and deadly accurate way to calculate the single most important variable in trading: position size. This tool is the key to survival and long-term profitability.",
    features: [
      "Multi-Asset Calculation: Accurately calculates risk for all instruments, using correct formulas for Gold, JPY pairs, standard Forex, and Crypto with precision to decimal places",
      "Risk-Based Sizing: Input account balance, desired risk percentage (e.g., 1%), and stop loss distance - tells you exact lot size to use for optimal position sizing",
      "Forward Calculation: Alternatively, input lot size and it will show exact amount of money you're risking and potential profit with comprehensive P&L projections",
      "Live Metrics: Shows Risk:Reward ratio and percentage of account at risk instantly with real-time calculations and visual indicators",
      "Capital Protection: Ensures you can never lose more than planned on single trade, protecting capital and allowing you to stay in the game",
      "Long-Term Profitability: Industry-standard position sizing methodology for building consistent profits and managing portfolio risk",
      "Professional Risk Management: Advanced risk metrics including portfolio correlation analysis and maximum drawdown calculations",
      "Multi-Asset Portfolio Risk: Comprehensive portfolio-level risk assessment across different asset classes and trading strategies with correlation adjustments"
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
