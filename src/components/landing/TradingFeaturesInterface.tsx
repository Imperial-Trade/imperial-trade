import React, { useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const TradingFeaturesInterface: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>("Advanced Tools");

  const sections = [
    "Advanced Tools",
    "Signals", 
    "Education",
    "Live Sessions",
    "Community Forum",
    "IB Partnership"
  ];

  const featuresData = {
    "Advanced Tools": {
      icon: Calculator,
      gradient: "from-blue-500 to-cyan-500",
      tagline: "Professional Trading Analytics",
      description: "Comprehensive suite of advanced trading tools designed for professional traders and institutions.",
      hero: {
        title: "Advanced Trading Tools",
        subtitle: "Professional-grade analytics and risk management tools",
        image: "/api/placeholder/600/400"
      },
      features: [
        {
          icon: Calculator,
          title: "Risk Calculator",
          description: "Advanced position sizing and risk management calculator with real-time portfolio analysis.",
          features: ["Position Sizing", "Risk/Reward Ratios", "Portfolio Heat Maps", "Correlation Analysis"],
          preview: "Calculate optimal position sizes based on your risk tolerance and account balance."
        },
        {
          icon: BookOpen,
          title: "Trading Journal",
          description: "Comprehensive trading journal with AI-powered insights and performance analytics.",
          features: ["Trade Logging", "Performance Metrics", "AI Analysis", "Tax Reporting"],
          preview: "Track every trade with detailed analytics and AI-powered performance insights."
        },
        {
          icon: Search,
          title: "Market Scanner",
          description: "Real-time market scanning with custom filters and alerts for trading opportunities.",
          features: ["Custom Filters", "Real-time Scanning", "Opportunity Alerts", "Backtesting"],
          preview: "Scan thousands of instruments in real-time with customizable criteria."
        },
        {
          icon: BarChart3,
          title: "Portfolio Analytics",
          description: "Institutional-grade portfolio analysis with risk metrics and performance attribution.",
          features: ["Risk Metrics", "Performance Attribution", "Stress Testing", "Benchmark Comparison"],
          preview: "Analyze your portfolio with institutional-grade metrics and risk analysis."
        },
        {
          icon: Presentation,
          title: "Technical Analysis Suite",
          description: "Advanced charting tools with 100+ indicators and custom drawing tools.",
          features: ["100+ Indicators", "Custom Drawings", "Pattern Recognition", "Alert System"],
          preview: "Professional charting with advanced technical analysis capabilities."
        },
        {
          icon: Shield,
          title: "Risk Management",
          description: "Comprehensive risk management tools with real-time monitoring and alerts.",
          features: ["Real-time Monitoring", "Risk Alerts", "Stress Testing", "VaR Calculations"],
          preview: "Monitor and manage risk across all positions with real-time alerts."
        }
      ],
      cta: {
        title: "Start Trading Like a Pro",
        description: "Access professional-grade trading tools used by institutional traders.",
        buttonText: "Try Advanced Tools"
      }
    },
    "Signals": {
      icon: Bell,
      gradient: "from-purple-500 to-pink-500",
      tagline: "AI-Powered Trading Signals",
      description: "Real-time trading signals powered by AI with proven track records and detailed analytics.",
      hero: {
        title: "Trading Signals",
        subtitle: "AI-powered signals with proven performance",
        image: "/api/placeholder/600/400"
      },
      features: [
        {
          icon: Bell,
          title: "Live Trading Alerts",
          description: "Real-time trading signals with entry, exit, and stop-loss levels.",
          features: ["Real-time Alerts", "Entry/Exit Levels", "Risk Management", "Multi-Asset Coverage"],
          preview: "Receive instant notifications for high-probability trading opportunities."
        },
        {
          icon: Activity,
          title: "Signal Performance",
          description: "Detailed performance tracking for all signals with historical data.",
          features: ["Win Rate Tracking", "Performance Metrics", "Historical Data", "Backtesting Results"],
          preview: "Track the performance of every signal with detailed analytics."
        },
        {
          icon: Target,
          title: "Custom Indicators",
          description: "Proprietary indicators developed by our quantitative research team.",
          features: ["Proprietary Algorithms", "Custom Indicators", "Market Edge", "Real-time Updates"],
          preview: "Access exclusive indicators not available on other platforms."
        },
        {
          icon: TrendingUp,
          title: "Market Analysis",
          description: "Daily market analysis and commentary from professional traders.",
          features: ["Daily Analysis", "Market Commentary", "Economic Calendar", "News Integration"],
          preview: "Get professional market analysis and commentary every trading day."
        },
        {
          icon: LineChart,
          title: "Signal Categories",
          description: "Specialized signals for different trading styles and time frames.",
          features: ["Scalping Signals", "Swing Trading", "Position Trading", "News Trading"],
          preview: "Choose signals that match your trading style and time frame."
        },
        {
          icon: Brain,
          title: "AI-Powered Analysis",
          description: "Machine learning algorithms analyze market data to generate signals.",
          features: ["Machine Learning", "Pattern Recognition", "Sentiment Analysis", "Big Data Processing"],
          preview: "Leverage AI to identify trading opportunities before they become obvious."
        }
      ],
      cta: {
        title: "Get High-Probability Signals",
        description: "Join thousands of traders using our AI-powered signals to improve their trading.",
        buttonText: "Start Receiving Signals"
      }
    },
    "Education": {
      icon: BookMarked,
      gradient: "from-green-500 to-emerald-500",
      tagline: "Comprehensive Trading Education",
      description: "From beginner to advanced, master trading with our comprehensive education platform.",
      hero: {
        title: "Trading Education",
        subtitle: "Master the markets with expert-led courses",
        image: "/api/placeholder/600/400"
      },
      features: [
        {
          icon: Play,
          title: "Video Courses",
          description: "Comprehensive video courses covering all aspects of trading and investing.",
          features: ["Beginner to Advanced", "50+ Hours Content", "Expert Instructors", "Lifetime Access"],
          preview: "Learn from professional traders with over 50 hours of premium content."
        },
        {
          icon: Video,
          title: "Live Webinars",
          description: "Weekly live webinars with Q&A sessions and real-time market analysis.",
          features: ["Weekly Sessions", "Live Q&A", "Market Analysis", "Recording Available"],
          preview: "Join live educational sessions with expert traders and analysts."
        },
        {
          icon: BookOpen,
          title: "Trading Guides",
          description: "Comprehensive written guides and eBooks covering trading strategies.",
          features: ["Strategy Guides", "Market Analysis", "Risk Management", "Psychology"],
          preview: "Download comprehensive guides covering all aspects of successful trading."
        },
        {
          icon: Calendar,
          title: "Learning Paths",
          description: "Structured learning paths designed to take you from beginner to expert.",
          features: ["Structured Curriculum", "Progress Tracking", "Certificates", "Personal Mentor"],
          preview: "Follow structured learning paths with progress tracking and certification."
        },
        {
          icon: Users,
          title: "Study Groups",
          description: "Join study groups with other traders to discuss strategies and share ideas.",
          features: ["Peer Learning", "Group Discussions", "Strategy Sharing", "Mentorship"],
          preview: "Learn with peers in dedicated study groups and discussion forums."
        },
        {
          icon: Award,
          title: "Certification Program",
          description: "Earn professional trading certifications recognized by the industry.",
          features: ["Professional Certificates", "Industry Recognition", "Career Advancement", "Skill Validation"],
          preview: "Earn industry-recognized certifications to validate your trading skills."
        }
      ],
      cta: {
        title: "Master the Markets",
        description: "Start your journey from beginner to professional trader with our education platform.",
        buttonText: "Start Learning Today"
      }
    },
    "Live Sessions": {
      icon: Video,
      gradient: "from-orange-500 to-red-500",
      tagline: "Interactive Live Trading",
      description: "Join live trading sessions with professional traders and learn in real-time.",
      hero: {
        title: "Live Trading Sessions",
        subtitle: "Learn by watching professionals trade live",
        image: "/api/placeholder/600/400"
      },
      features: [
        {
          icon: Video,
          title: "Live Trading Rooms",
          description: "Watch professional traders execute trades in real-time with full transparency.",
          features: ["Live Trading", "Real-time Commentary", "Full Transparency", "Strategy Explanation"],
          preview: "Join live trading rooms and watch professionals trade with real money."
        },
        {
          icon: Users,
          title: "Interactive Sessions",
          description: "Participate in interactive sessions with Q&A and real-time discussions.",
          features: ["Live Q&A", "Real-time Chat", "Interactive Polls", "Community Engagement"],
          preview: "Engage directly with professional traders during live sessions."
        },
        {
          icon: Calendar,
          title: "Scheduled Events",
          description: "Regular scheduled events covering market analysis and trading strategies.",
          features: ["Market Opens", "Economic Events", "Earnings Calls", "Special Sessions"],
          preview: "Join scheduled events around major market movements and opportunities."
        },
        {
          icon: Presentation,
          title: "Market Analysis",
          description: "Live market analysis sessions covering technical and fundamental analysis.",
          features: ["Technical Analysis", "Fundamental Analysis", "Market Commentary", "Opportunity Identification"],
          preview: "Learn market analysis techniques from experienced professionals."
        },
        {
          icon: Compass,
          title: "Strategy Sessions",
          description: "Deep-dive sessions focusing on specific trading strategies and methodologies.",
          features: ["Strategy Deep-dives", "Methodology Training", "Risk Management", "Psychology"],
          preview: "Master specific trading strategies with detailed explanations and examples."
        },
        {
          icon: Timer,
          title: "Session Recordings",
          description: "Access recordings of all live sessions for review and continued learning.",
          features: ["Session Library", "Searchable Content", "Offline Access", "Mobile Friendly"],
          preview: "Review any session you missed with our comprehensive recording library."
        }
      ],
      cta: {
        title: "Join Live Trading Sessions",
        description: "Learn from the best by watching professional traders in action.",
        buttonText: "Join Live Sessions"
      }
    },
    "Community Forum": {
      icon: Users,
      gradient: "from-teal-500 to-cyan-500",
      tagline: "Trading Community Hub",
      description: "Connect with traders worldwide, share strategies, and learn from each other.",
      hero: {
        title: "Community Forum",
        subtitle: "Connect with traders worldwide",
        image: "/api/placeholder/600/400"
      },
      features: [
        {
          icon: MessageCircle,
          title: "Discussion Boards",
          description: "Active discussion boards covering all aspects of trading and investing.",
          features: ["Topic Categories", "Expert Moderation", "Real-time Discussions", "Knowledge Base"],
          preview: "Engage in meaningful discussions with traders from around the world."
        },
        {
          icon: TrendingUp,
          title: "Strategy Sharing",
          description: "Share and discover trading strategies with detailed performance data.",
          features: ["Strategy Library", "Performance Tracking", "Peer Review", "Implementation Guides"],
          preview: "Share your strategies and learn from successful traders in the community."
        },
        {
          icon: Star,
          title: "Expert Contributors",
          description: "Learn from verified expert traders and industry professionals.",
          features: ["Verified Experts", "Professional Insights", "Q&A Sessions", "Direct Access"],
          preview: "Get insights from verified expert traders and industry professionals."
        },
        {
          icon: Heart,
          title: "Support Network",
          description: "Find support and motivation from fellow traders on your journey.",
          features: ["Peer Support", "Mentorship Programs", "Success Stories", "Challenge Groups"],
          preview: "Build relationships with fellow traders and find support on your journey."
        },
        {
          icon: Layers,
          title: "Resource Library",
          description: "Access a vast library of trading resources shared by the community.",
          features: ["Shared Resources", "Tool Reviews", "Book Recommendations", "Video Content"],
          preview: "Access thousands of trading resources shared by community members."
        },
        {
          icon: UserCheck,
          title: "Verified Traders",
          description: "Connect with verified traders who share their real performance data.",
          features: ["Performance Verification", "Real Results", "Transparency", "Accountability"],
          preview: "Follow verified traders who share their real trading performance."
        }
      ],
      cta: {
        title: "Join Our Trading Community",
        description: "Connect with thousands of traders and accelerate your learning.",
        buttonText: "Join Community"
      }
    },
    "IB Partnership": {
      icon: Handshake,
      gradient: "from-indigo-500 to-purple-500",
      tagline: "Institutional Partnerships",
      description: "Partner with leading brokers and grow your business with our institutional program.",
      hero: {
        title: "IB Partnership",
        subtitle: "Grow your business with institutional partnerships",
        image: "/api/placeholder/600/400"
      },
      features: [
        {
          icon: Building,
          title: "Broker Network",
          description: "Access to a network of top-tier brokers with competitive conditions.",
          features: ["Top-tier Brokers", "Competitive Spreads", "Direct Access", "Institutional Rates"],
          preview: "Partner with leading brokers offering institutional-grade services."
        },
        {
          icon: DollarSign,
          title: "Revenue Sharing",
          description: "Attractive revenue sharing programs with transparent commission structures.",
          features: ["Revenue Share", "Performance Bonuses", "Transparent Structure", "Monthly Payouts"],
          preview: "Earn competitive commissions with transparent revenue sharing programs."
        },
        {
          icon: Globe,
          title: "Global Reach",
          description: "Expand your reach with partners in major financial centers worldwide.",
          features: ["Global Network", "Multi-jurisdiction", "Local Support", "Cultural Expertise"],
          preview: "Access global markets through our worldwide network of partners."
        },
        {
          icon: Zap,
          title: "Technology Integration",
          description: "Seamless technology integration with APIs and white-label solutions.",
          features: ["API Access", "White Label", "Custom Integration", "Technical Support"],
          preview: "Integrate our technology with APIs and white-label solutions."
        },
        {
          icon: Briefcase,
          title: "Business Development",
          description: "Comprehensive business development support and marketing resources.",
          features: ["Marketing Materials", "Business Support", "Training Programs", "Account Management"],
          preview: "Get comprehensive support to grow your IB business successfully."
        },
        {
          icon: Phone,
          title: "Dedicated Support",
          description: "Dedicated account management and 24/7 technical support.",
          features: ["Account Manager", "24/7 Support", "Priority Service", "Direct Access"],
          preview: "Receive dedicated support from experienced account managers."
        }
      ],
      cta: {
        title: "Become an IB Partner",
        description: "Join our institutional partnership program and grow your business.",
        buttonText: "Apply for Partnership"
      }
    }
  };

  const currentData = featuresData[activeSection];

  return (
    <div className="bg-background min-h-screen">
      {/* Navigation Header */}
      <div className="sticky top-20 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-foreground">Professional Trading Features</h1>
            <Badge variant="secondary" className="text-xs">6 Feature Categories</Badge>
          </div>
          
          {/* Apple/Stripe style tab navigation */}
          <div className="flex items-center gap-2 bg-muted/30 rounded-2xl p-1">
            {sections.map((section) => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                  activeSection === section
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                }`}
              >
                {section}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <Badge 
                  variant="secondary" 
                  className={`inline-flex items-center gap-2 bg-gradient-to-r ${currentData.gradient} text-white`}
                >
                  <currentData.icon className="h-4 w-4" />
                  {currentData.tagline}
                </Badge>
                <h1 className="text-5xl font-bold text-foreground leading-tight">
                  {currentData.hero.title}
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  {currentData.description}
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="outline" size="lg">
                  Learn More
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-3xl p-8 backdrop-blur-sm border border-border/50">
                <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center">
                  <currentData.icon className="h-24 w-24 text-primary" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 bg-muted/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Everything You Need in {activeSection}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Discover the comprehensive features that make our platform the choice of professional traders worldwide.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {currentData.features.map((feature, index) => (
              <Card key={index} className="group hover:shadow-2xl transition-all duration-500 border-border/50 bg-background/50 backdrop-blur-sm">
                <CardHeader className="space-y-4">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-r ${currentData.gradient} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
                      {feature.title}
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      {feature.description}
                    </CardDescription>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    {feature.features.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{item}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="p-4 bg-muted/30 rounded-xl border border-border/30">
                    <p className="text-sm text-muted-foreground italic">
                      "{feature.preview}"
                    </p>
                  </div>
                  
                  <Button className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                    Learn More
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-r ${currentData.gradient} mb-8`}>
            <currentData.icon className="h-10 w-10 text-white" />
          </div>
          
          <h2 className="text-4xl font-bold text-foreground mb-4">
            {currentData.cta.title}
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {currentData.cta.description}
          </p>
          
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8">
              {currentData.cta.buttonText}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="outline" size="lg" className="px-8">
              Contact Sales
            </Button>
          </div>
          
          <div className="mt-8 flex items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Free 14-day trial
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              No credit card required
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              24/7 support
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TradingFeaturesInterface;