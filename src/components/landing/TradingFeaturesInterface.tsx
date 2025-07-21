import React, { useState, useEffect } from "react";
import {
  Calculator,
  BarChart3,
  Search,
  BookOpen,
  Presentation,
  Shield,
  Bell,
  Activity,
  Target,
  TrendingUp,
  Play,
  Users,
  Video,
  Calendar,
  MessageCircle,
  Heart,
  Award,
  Building,
  Handshake,
  DollarSign,
  Globe,
  Zap,
  LineChart,
  Brain,
  BookMarked,
  Compass,
  Star,
  Briefcase,
  ArrowRight,
  CheckCircle,
  BarChart,
  PieChart,
  TrendingDown,
  Timer,
  UserCheck,
  Layers,
  CreditCard,
  Percent,
  Headphones,
  Phone,
  Settings,
  Database,
  Monitor,
  Smartphone,
  TrendingUpDown,
  FileText,
  Lightbulb,
  Clock,
  Map,
  Share2,
  Lock,
  Wifi,
  Network
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const TradingFeaturesInterface: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>("Advanced Tools");
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Listen for navigation events from AppBar
  useEffect(() => {
    const handleNavigateToFeature = (event: CustomEvent) => {
      const { section } = event.detail;
      handleSectionChange(section);
    };

    window.addEventListener('navigateToFeature', handleNavigateToFeature as EventListener);
    
    return () => {
      window.removeEventListener('navigateToFeature', handleNavigateToFeature as EventListener);
    };
  }, []);

  const handleSectionChange = (section: string) => {
    if (section !== activeSection) {
      setIsTransitioning(true);
      setTimeout(() => {
        setActiveSection(section);
        setIsTransitioning(false);
      }, 150);
    }
  };

  const sections = [
    "Advanced Tools",
    "Signals", 
    "Education",
    "Live Sessions",
    "Community Forum",
    "IB Partnership"
  ];

  const getFeatureAccentColor = (index: number) => {
    const colors = [
      "feature-accent-blue",
      "feature-accent-green", 
      "feature-accent-orange",
      "feature-accent-purple",
      "feature-accent-pink",
      "feature-accent-red"
    ];
    return colors[index % colors.length];
  };

  const featuresData = {
    "Advanced Tools": {
      icon: Calculator,
      tagline: "Professional Trading Analytics",
      description: "Institutional-grade tools designed for serious traders who demand precision, speed, and advanced functionality.",
      hero: {
        title: "Advanced Trading Tools",
        subtitle: "Professional-grade analytics and risk management",
        stats: [
          { value: "500k+", label: "Active Traders" },
          { value: "99.9%", label: "Uptime" },
          { value: "50ms", label: "Avg Response" }
        ]
      },
      features: [
        {
          icon: Calculator,
          title: "Risk Calculator",
          description: "Advanced position sizing calculator with real-time portfolio heat mapping and correlation analysis.",
          features: ["Position Sizing", "Risk/Reward Analysis", "Portfolio Heat Maps", "Correlation Matrix"],
          usage: "Calculate optimal position sizes based on your risk tolerance and account balance with real-time updates.",
          benefits: ["Reduce losses by 40%", "Optimize position sizing", "Real-time risk monitoring"]
        },
        {
          icon: FileText,
          title: "Trading Journal",
          description: "AI-powered trading journal with performance analytics and automated tax reporting.",
          features: ["AI Analysis", "Performance Metrics", "Tax Reporting", "Trade Screenshots"],
          usage: "Automatically track every trade with detailed analytics and receive AI-powered insights on your performance.",
          benefits: ["Improve win rate by 25%", "Automated reporting", "Performance insights"]
        },
        {
          icon: Search,
          title: "Market Scanner",
          description: "Real-time market scanning with custom filters for identifying trading opportunities.",
          features: ["Custom Filters", "Real-time Scanning", "Opportunity Alerts", "Backtesting"],
          usage: "Scan thousands of instruments in real-time with customizable criteria to find the best trading opportunities.",
          benefits: ["Find opportunities faster", "Custom alert system", "Backtesting capabilities"]
        },
        {
          icon: BarChart3,
          title: "Portfolio Analytics",
          description: "Institutional-grade portfolio analysis with advanced risk metrics and performance attribution.",
          features: ["Risk Metrics", "Performance Attribution", "Stress Testing", "Benchmark Comparison"],
          usage: "Analyze your portfolio with institutional-grade metrics including VaR, Sharpe ratio, and drawdown analysis.",
          benefits: ["Professional analytics", "Risk optimization", "Benchmark tracking"]
        },
        {
          icon: Presentation,
          title: "Technical Analysis Suite",
          description: "Advanced charting platform with 150+ indicators and pattern recognition.",
          features: ["150+ Indicators", "Pattern Recognition", "Custom Drawings", "Multi-timeframe Analysis"],
          usage: "Professional charting with advanced technical analysis tools and automated pattern recognition.",
          benefits: ["Professional charting", "Pattern alerts", "Custom indicators"]
        },
        {
          icon: Shield,
          title: "Risk Management",
          description: "Comprehensive risk management with real-time monitoring and automated alerts.",
          features: ["Real-time Monitoring", "Risk Alerts", "Stop Loss Management", "Exposure Limits"],
          usage: "Monitor and manage risk across all positions with real-time alerts and automated protection.",
          benefits: ["Automated protection", "Real-time alerts", "Risk optimization"]
        }
      ],
      cta: {
        title: "Trade with Professional Tools",
        description: "Access the same tools used by institutional traders and hedge funds.",
        buttonText: "Start Free Trial"
      }
    },
    "Signals": {
      icon: Bell,
      tagline: "AI-Powered Trading Signals",
      description: "Machine learning algorithms analyze market data 24/7 to deliver high-probability trading opportunities directly to your device.",
      hero: {
        title: "Trading Signals",
        subtitle: "AI-powered signals with proven performance",
        stats: [
          { value: "73%", label: "Win Rate" },
          { value: "2.4:1", label: "Risk/Reward" },
          { value: "24/7", label: "Monitoring" }
        ]
      },
      features: [
        {
          icon: Bell,
          title: "Live Trading Alerts",
          description: "Real-time trading signals with precise entry, exit, and stop-loss levels.",
          features: ["Real-time Alerts", "Entry/Exit Levels", "Risk Management", "Multi-Asset Coverage"],
          usage: "Receive instant notifications for high-probability trading opportunities across forex, stocks, and crypto.",
          benefits: ["73% win rate", "Instant notifications", "Multi-asset coverage"]
        },
        {
          icon: Activity,
          title: "Signal Performance",
          description: "Detailed performance tracking with historical data and analytics.",
          features: ["Win Rate Tracking", "Performance Metrics", "Historical Data", "ROI Analysis"],
          usage: "Track the performance of every signal with detailed analytics and historical backtesting data.",
          benefits: ["Transparent results", "Performance tracking", "Historical analysis"]
        },
        {
          icon: Brain,
          title: "AI Analysis",
          description: "Machine learning algorithms process market data to identify trading opportunities.",
          features: ["Machine Learning", "Pattern Recognition", "Sentiment Analysis", "Big Data Processing"],
          usage: "Advanced AI analyzes millions of data points to identify high-probability trading setups.",
          benefits: ["AI-powered insights", "Pattern recognition", "Market analysis"]
        },
        {
          icon: Target,
          title: "Precision Targeting",
          description: "Highly accurate signals with specific entry and exit points.",
          features: ["Precise Levels", "Risk Parameters", "Probability Scores", "Market Context"],
          usage: "Get exact entry and exit levels with probability scores and risk parameters for each signal.",
          benefits: ["Precise targeting", "Risk management", "High accuracy"]
        },
        {
          icon: LineChart,
          title: "Market Analysis",
          description: "Daily market analysis and commentary from experienced traders.",
          features: ["Daily Analysis", "Market Commentary", "Economic Calendar", "News Integration"],
          usage: "Receive professional market analysis and commentary every trading day with economic calendar integration.",
          benefits: ["Expert analysis", "Market insights", "Economic awareness"]
        },
        {
          icon: Clock,
          title: "Multi-Timeframe",
          description: "Signals for scalping, day trading, and swing trading strategies.",
          features: ["Scalping Signals", "Day Trading", "Swing Trading", "Position Trading"],
          usage: "Choose signals that match your trading style and time frame preferences.",
          benefits: ["Style flexibility", "Time frame options", "Strategy alignment"]
        }
      ],
      cta: {
        title: "Start Receiving Profitable Signals",
        description: "Join thousands of traders using our AI-powered signals to improve their results.",
        buttonText: "Get Signals Now"
      }
    },
    "Education": {
      icon: BookMarked,
      tagline: "Comprehensive Trading Education",
      description: "From complete beginner to advanced professional, our education platform provides structured learning paths with expert instruction.",
      hero: {
        title: "Trading Education",
        subtitle: "Master the markets with educator-led courses",
        stats: [
          { value: "100+", label: "Video Lessons" },
          { value: "10k+", label: "Students" },
          { value: "95%", label: "Success Rate" }
        ]
      },
      features: [
        {
          icon: Play,
          title: "Video Course Library",
          description: "Comprehensive video courses covering all aspects of trading and market analysis.",
          features: ["100+ Video Lessons", "Expert Instructors", "Lifetime Access", "Mobile App"],
          usage: "Learn from experienced traders with over 100 hours of premium video content accessible on any device.",
          benefits: ["Expert instruction", "Lifetime access", "Mobile learning"]
        },
        {
          icon: Video,
          title: "Live Webinars",
          description: "Weekly live educational sessions with Q&A and real-time market analysis.",
          features: ["Weekly Sessions", "Live Q&A", "Market Analysis", "Recording Library"],
          usage: "Join weekly live educational sessions with experienced traders and get your questions answered in real-time.",
          benefits: ["Live interaction", "Expert access", "Q&A sessions"]
        },
        {
          icon: BookOpen,
          title: "Trading Guides",
          description: "Comprehensive written guides and eBooks covering trading strategies and market psychology.",
          features: ["Strategy Guides", "Psychology Training", "Risk Management", "Market Analysis"],
          usage: "Download comprehensive guides covering all aspects of successful trading including psychology and risk management.",
          benefits: ["Comprehensive content", "Strategy focus", "Psychology training"]
        },
        {
          icon: Map,
          title: "Learning Paths",
          description: "Structured learning paths designed to take you from beginner to experienced trader.",
          features: ["Structured Curriculum", "Progress Tracking", "Skill Assessments", "Certificates"],
          usage: "Follow structured learning paths with progress tracking and skill assessments to measure your development.",
          benefits: ["Structured learning", "Progress tracking", "Skill validation"]
        },
        {
          icon: Users,
          title: "Study Groups",
          description: "Join study groups with other traders to discuss strategies and share experiences.",
          features: ["Peer Learning", "Group Discussions", "Strategy Sharing", "Mentorship"],
          usage: "Connect with fellow students in study groups to discuss strategies and learn from each other's experiences.",
          benefits: ["Peer learning", "Community support", "Strategy sharing"]
        },
        {
          icon: Award,
          title: "Certification Program",
          description: "Earn professional trading certifications recognized by the financial industry.",
          features: ["Industry Certification", "Skill Validation", "Career Advancement", "Professional Recognition"],
          usage: "Complete certification programs to validate your trading skills and advance your career in finance.",
          benefits: ["Industry recognition", "Career advancement", "Skill certification"]
        }
      ],
      cta: {
        title: "Master Professional Trading",
        description: "Start your journey from beginner to experienced trader with our comprehensive education platform.",
        buttonText: "Start Learning"
      }
    },
    "Live Sessions": {
      icon: Video,
      tagline: "Interactive Live Trading",
      description: "Join experienced traders in live sessions to see real analysis in action and learn decision-making processes in real-time.",
      hero: {
        title: "Live Trading Sessions",
        subtitle: "Learn by watching professionals trade live",
        stats: [
          { value: "Daily", label: "Live Sessions" },
          { value: "5+", label: "Experienced Traders" },
          { value: "1000+", label: "Recorded Sessions" }
        ]
      },
      features: [
        {
          icon: Video,
          title: "Live Trading Rooms",
          description: "Watch experienced traders execute analysis in real-time with full transparency.",
          features: ["Live Trading", "Real-time Commentary", "Full Transparency", "Strategy Explanation"],
          usage: "Join live trading rooms and watch professionals trade with real money while explaining their decision-making process.",
          benefits: ["Real-time learning", "Professional insight", "Live commentary"]
        },
        {
          icon: Users,
          title: "Interactive Sessions",
          description: "Participate in interactive sessions with Q&A and real-time discussions.",
          features: ["Live Q&A", "Real-time Chat", "Interactive Polls", "Community Engagement"],
          usage: "Engage directly with experienced traders during live sessions through chat and Q&A opportunities.",
          benefits: ["Direct interaction", "Real-time Q&A", "Community engagement"]
        },
        {
          icon: Calendar,
          title: "Market Event Coverage",
          description: "Live coverage of major market events including earnings, economic releases, and news.",
          features: ["Market Events", "Economic Releases", "Earnings Coverage", "News Analysis"],
          usage: "Join special sessions covering major market events and learn how to trade around important announcements.",
          benefits: ["Event coverage", "News analysis", "Market insights"]
        },
        {
          icon: Presentation,
          title: "Educational Workshops",
          description: "Deep-dive educational workshops focusing on specific strategies and techniques.",
          features: ["Strategy Workshops", "Technical Analysis", "Risk Management", "Psychology Training"],
          usage: "Participate in focused workshops that dive deep into specific trading strategies and techniques.",
          benefits: ["Focused learning", "Strategy deep-dives", "Skill development"]
        },
        {
          icon: Compass,
          title: "Market Analysis Sessions",
          description: "Daily market analysis sessions covering technical and fundamental analysis.",
          features: ["Daily Analysis", "Technical Review", "Fundamental Analysis", "Market Outlook"],
          usage: "Join daily market analysis sessions to understand current market conditions and opportunities.",
          benefits: ["Daily insights", "Market understanding", "Analysis training"]
        },
        {
          icon: Database,
          title: "Session Library",
          description: "Access to thousands of recorded sessions for review and continued learning.",
          features: ["Session Archive", "Searchable Content", "Offline Access", "Mobile Streaming"],
          usage: "Access our complete library of recorded sessions for review and continued learning at your own pace.",
          benefits: ["Complete archive", "Flexible learning", "Mobile access"]
        }
      ],
      cta: {
        title: "Join Live Trading Sessions",
        description: "Learn from the best by watching experienced traders in action every day.",
        buttonText: "Join Live Sessions"
      }
    },
    "Community Forum": {
      icon: Users,
      tagline: "Global Trading Community",
      description: "Connect with traders worldwide, share strategies, and learn from a vibrant community of professionals and enthusiasts.",
      hero: {
        title: "Trading Community",
        subtitle: "Connect with traders worldwide",
        stats: [
          { value: "50k+", label: "Active Members" },
          { value: "1k+", label: "Daily Posts" },
          { value: "24/7", label: "Community Support" }
        ]
      },
      features: [
        {
          icon: MessageCircle,
          title: "Discussion Forums",
          description: "Active discussion boards covering all aspects of trading and market analysis.",
          features: ["Topic Categories", "Expert Moderation", "Real-time Discussions", "Search Function"],
          usage: "Participate in discussions across multiple categories including strategies, market analysis, and trading psychology.",
          benefits: ["Active discussions", "Expert moderation", "Knowledge sharing"]
        },
        {
          icon: Share2,
          title: "Strategy Sharing",
          description: "Share and discover trading strategies with detailed performance tracking.",
          features: ["Strategy Library", "Performance Data", "Peer Review", "Implementation Guides"],
          usage: "Share your successful strategies and learn from others with verified performance data and peer reviews.",
          benefits: ["Strategy discovery", "Performance tracking", "Peer validation"]
        },
        {
          icon: Star,
          title: "Expert Network",
          description: "Connect with experienced traders and educational contributors.",
          features: ["Verified Experts", "Professional Insights", "Direct Access", "Mentorship Programs"],
          usage: "Get insights from experienced traders and participate in mentorship programs.",
          benefits: ["Expert access", "Professional insights", "Mentorship opportunities"]
        },
        {
          icon: Heart,
          title: "Support Network",
          description: "Find support and motivation from fellow traders on your trading journey.",
          features: ["Peer Support", "Success Stories", "Challenge Groups", "Accountability Partners"],
          usage: "Connect with fellow traders for support, motivation, and accountability in your trading journey.",
          benefits: ["Peer support", "Motivation", "Accountability"]
        },
        {
          icon: Layers,
          title: "Resource Library",
          description: "Access thousands of trading resources shared by the community.",
          features: ["Resource Sharing", "Tool Reviews", "Book Recommendations", "Educational Content"],
          usage: "Access a vast library of trading resources including tools, books, and educational content shared by members.",
          benefits: ["Resource access", "Community knowledge", "Learning materials"]
        },
        {
          icon: UserCheck,
          title: "Verified Traders",
          description: "Follow verified traders who share their real trading performance.",
          features: ["Performance Verification", "Real Results", "Transparency", "Copy Trading"],
          usage: "Follow verified traders who share their real performance data with complete transparency.",
          benefits: ["Verified performance", "Transparency", "Learning opportunities"]
        }
      ],
      cta: {
        title: "Join Our Trading Community",
        description: "Connect with 50,000+ traders and accelerate your learning through community engagement.",
        buttonText: "Join Community"
      }
    },
    "IB Partnership": {
      icon: Handshake,
      tagline: "Institutional Partnerships",
      description: "Partner with leading institutional brokers to grow your business through our comprehensive introducing broker program.",
      hero: {
        title: "IB Partnership Program",
        subtitle: "Grow your business with institutional partnerships",
        stats: [
          { value: "50+", label: "Partner Brokers" },
          { value: "$2M+", label: "Monthly Commissions" },
          { value: "24/7", label: "Support" }
        ]
      },
      features: [
        {
          icon: Building,
          title: "Tier-1 Broker Network",
          description: "Access to top-tier institutional brokers with competitive spreads and execution.",
          features: ["Prime Brokers", "Institutional Rates", "Direct Market Access", "Low Latency"],
          usage: "Partner with tier-1 institutional brokers offering the best execution and competitive spreads for your clients.",
          benefits: ["Top-tier execution", "Competitive rates", "Institutional access"]
        },
        {
          icon: DollarSign,
          title: "Revenue Sharing",
          description: "Attractive revenue sharing programs with transparent commission structures.",
          features: ["Competitive Rates", "Performance Bonuses", "Transparent Structure", "Monthly Payouts"],
          usage: "Earn attractive commissions with our transparent revenue sharing model and performance-based bonuses.",
          benefits: ["High commissions", "Performance bonuses", "Transparent payments"]
        },
        {
          icon: Globe,
          title: "Global Reach",
          description: "Expand internationally with partners in major financial centers worldwide.",
          features: ["Global Network", "Multi-jurisdiction", "Local Support", "Regulatory Compliance"],
          usage: "Access global markets through our worldwide network of regulated partners in major financial centers.",
          benefits: ["Global expansion", "Local expertise", "Regulatory support"]
        },
        {
          icon: Zap,
          title: "Technology Integration",
          description: "Seamless integration with APIs, white-label solutions, and custom platforms.",
          features: ["API Access", "White Label Solutions", "Custom Integration", "Technical Support"],
          usage: "Integrate our technology seamlessly with comprehensive APIs and white-label solutions.",
          benefits: ["Easy integration", "Custom solutions", "Technical support"]
        },
        {
          icon: Briefcase,
          title: "Business Development",
          description: "Comprehensive business development support with marketing resources and training.",
          features: ["Marketing Materials", "Business Training", "Lead Generation", "Brand Support"],
          usage: "Receive comprehensive business development support including marketing materials and lead generation assistance.",
          benefits: ["Marketing support", "Business training", "Lead generation"]
        },
        {
          icon: Headphones,
          title: "Dedicated Support",
          description: "24/7 dedicated account management and technical support for all partners.",
          features: ["Account Manager", "24/7 Support", "Priority Service", "Technical Assistance"],
          usage: "Get dedicated support from experienced account managers with 24/7 technical assistance.",
          benefits: ["Dedicated support", "24/7 availability", "Priority service"]
        }
      ],
      cta: {
        title: "Become an IB Partner",
        description: "Join our institutional partnership program and grow your business with industry-leading support.",
        buttonText: "Apply for Partnership"
      }
    }
  };

  const currentData = featuresData[activeSection];

  return (
    <div className="bg-background min-h-screen font-sans" id="trading-features">
      {/* Navigation Header */}
      <div className="sticky top-20 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Professional Trading Platform</h1>
              <p className="text-muted-foreground">Enterprise-grade tools for dedicated traders</p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-xs font-medium">6 Feature Categories</Badge>
              <div className="text-sm text-muted-foreground">
                Current: <span className="font-medium text-foreground">{activeSection}</span>
              </div>
            </div>
          </div>
          
          {/* Apple-style tab navigation */}
          <div className="flex items-center gap-2 bg-muted/50 rounded-xl p-1.5 border border-border">
            {sections.map((section, index) => (
              <button
                key={section}
                onClick={() => handleSectionChange(section)}
                className={`px-5 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  activeSection === section
                    ? "bg-background text-foreground shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${getFeatureAccentColor(index)}`} />
                {section}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className={`py-16 px-6 monochrome-gradient transition-all duration-300 ${isTransitioning ? 'opacity-50' : 'opacity-100'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-6">
                <Badge 
                  variant="outline" 
                  className="inline-flex items-center gap-2 border-border text-muted-foreground"
                  key={activeSection} // Force re-render when section changes
                >
                  <currentData.icon className="h-4 w-4" />
                  {currentData.tagline}
                </Badge>
                <h1 className="text-5xl font-bold text-foreground leading-tight tracking-tight" key={`title-${activeSection}`}>
                  {currentData.hero.title}
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed" key={`desc-${activeSection}`}>
                  {currentData.description}
                </p>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-3 gap-6" key={`stats-${activeSection}`}>
                {currentData.hero.stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
              
              <div className="flex items-center gap-4">
                <Button size="lg" className="apple-button">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="outline" size="lg" className="border-border">
                  Learn More
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <div className="apple-card rounded-2xl p-8" key={`hero-card-${activeSection}`}>
                <div className="aspect-video bg-muted/30 rounded-xl flex items-center justify-center border border-border">
                  <currentData.icon className="h-16 w-16 text-muted-foreground" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className={`py-20 px-6 transition-all duration-300 ${isTransitioning ? 'opacity-50' : 'opacity-100'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16" key={`features-header-${activeSection}`}>
            <h2 className="text-3xl font-bold text-foreground mb-4">
              {activeSection} Features
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Discover the comprehensive features that make our platform the choice of dedicated traders worldwide.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8" key={`features-grid-${activeSection}`}>
            {currentData.features.map((feature, index) => (
              <Card key={index} className="apple-card group h-full">
                <CardHeader className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center border border-border group-hover:${getFeatureAccentColor(index)} transition-colors duration-300`}>
                      <feature.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold text-foreground">
                        {feature.title}
                      </CardTitle>
                    </div>
                  </div>
                  <CardDescription className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  {/* Usage */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-foreground">How it works:</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.usage}
                    </p>
                  </div>

                  {/* Features list */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-foreground">Key Features:</h4>
                    <div className="space-y-2">
                      {feature.features.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <CheckCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Benefits */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-foreground">Benefits:</h4>
                    <div className="space-y-2">
                      {feature.benefits.map((benefit, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <div className={`w-1.5 h-1.5 rounded-full ${getFeatureAccentColor(index)}`} />
                          <span className="text-sm text-muted-foreground">{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <Button className="w-full apple-button mt-4">
                    Learn More
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={`py-20 px-6 monochrome-gradient transition-all duration-300 ${isTransitioning ? 'opacity-50' : 'opacity-100'}`}>
        <div className="max-w-4xl mx-auto text-center" key={`cta-${activeSection}`}>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/50 border border-border mb-8">
            <currentData.icon className="h-8 w-8 text-muted-foreground" />
          </div>
          
          <h2 className="text-4xl font-bold text-foreground mb-4">
            {currentData.cta.title}
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {currentData.cta.description}
          </p>
          
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" className="apple-button px-8">
              {currentData.cta.buttonText}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="outline" size="lg" className="px-8 border-border">
              Contact Sales
            </Button>
          </div>
          
          <div className="mt-8 flex items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Free 14-day trial
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              No credit card required
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              24/7 support
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TradingFeaturesInterface;