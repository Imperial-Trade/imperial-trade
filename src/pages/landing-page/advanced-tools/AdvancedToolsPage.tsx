
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
import { ComplianceNotice, EducationalBadge } from "@/components/compliance/ComplianceNotice";

const AdvancedToolsPage: React.FC = () => {
  // Clear any potential reference errors
  const tools = [
    {
      icon: FileText,
      title: "JOURNAL XX",
      subtitle: "Decode Your Data. Evolve Your Edge",
      description: "Transform your learning journey into actionable educational data with the ultimate tool for self-reflection and skill development.",
      detailedFeatures: [
        "Effortless Educational Logging: Quickly log learning progress with asset analysis, outcomes, and personal educational notes",
        "Educational Screenshot Uploads: Attach chart screenshots for visual learning context and comprehensive review",
        "Educational Coach Feedback: Encouraging educational comments highlighting good learning practices and constructive educational takeaways",
        "Educational Pattern Recognition: Analyzes your learning notes over time, detecting educational patterns and learning opportunities",
        "Learning Gamification System: Unlock educational achievements and track your learning 'streak' to build critical review habits",
        "Educational Bias Detection: Makes you aware of learning patterns and educational triggers",
        "Educational Improvement Steps: Specific, actionable learning insights to enhance educational development"
      ],
      whatItDoes: "This is the single most powerful educational tool for long-term learning improvement. It makes you aware of your educational progress patterns and gives you concrete steps to enhance your learning journey.",
      gradient: "from-blue-500/20 to-cyan-500/20",
      accentColor: "blue"
    },
    {
      icon: Calendar,
      title: "Economic Calendar",
      subtitle: "Market Event Learning",
      description: "Ensure you're always informed of high-impact educational events that can create learning opportunities about market volatility.",
      detailedFeatures: [
        "Educational Event Schedule: Complete listing of all major economic events for educational analysis",
        "Educational Filtering: Filter by date (Today, This Week), Impact Level (High, Medium, Low), and Currency for learning",
        "Educational Data: Shows Previous, Forecast, and Actual data for educational impact assessment learning",
        "Educational Event Descriptions: Detailed explanations of what each event means for educational purposes",
        "Educational Volatility Learning: Turn news events into educational learning opportunities",
        "Multi-Currency Educational Coverage: Global economic events for educational analysis of all major currency pairs",
        "Educational Updates: Live data feeds for educational market reaction analysis"
      ],
      whatItDoes: "It provides educational awareness of market-moving events for learning purposes. It turns news from unknown variables into educational learning opportunities.",
      gradient: "from-emerald-500/20 to-teal-500/20",
      accentColor: "emerald"
    },
    {
      icon: Search,
      title: "Setup Learning Analyzer",
      subtitle: "The Educational Deconstructor",
      description: "Get comprehensive, objective educational analysis of your learning performance by having AI review your hypothetical setup examples.",
      detailedFeatures: [
        "Educational Screenshot Analysis: Upload screenshots from any platform for educational review",
        "Educational Reporting: Analyzes educational concepts, learning consistency, and educational pattern recognition",
        "Educational Pattern Recognition: Identifies your most educational setups and optimal learning timing patterns",
        "Educational Strengths & Learning Opportunities: Explicit lists of what you're learning well and educational areas needing development",
        "Educational Performance Coaching: Like having an educational coach to review your learning objectively",
        "Educational Analysis: Shows the educational value of your learning, free from emotion and focused on education",
        "Educational Improvement Roadmap: Specific, actionable educational steps to enhance learning consistency"
      ],
      whatItDoes: "It's like having an educational performance coach to review your learning. It shows you the educational value of your progress, free from emotion and focused on learning, giving you a clear educational roadmap for improvement.",
      gradient: "from-purple-500/20 to-indigo-500/20",
      accentColor: "purple"
    },
    {
      icon: BarChart3,
      title: "Educational Pattern Scanner",
      subtitle: "The Learning Signal Finder",
      description: "Save hours of screen time with 24/7 automated educational market scanning for high-probability learning setups and pattern recognition.",
      detailedFeatures: [
        "Educational Market Scanning: AI constantly monitors Forex, Commodities, Indices, and Crypto markets for educational purposes",
        "Educational Pattern Recognition: Identifies key educational technical patterns like breakouts, reversals, and volatility squeezes for learning",
        "Educational Learning Alerts: Complete educational setup details with instrument, type, key levels, and educational probability scores",
        "24/7 Educational Coverage: Never miss educational learning opportunities, even when away from educational materials",
        "Educational Asset Classes: Comprehensive educational coverage across all tradeable financial instruments for learning",
        "Educational Strategy Filters: Based on educational and learning-tested methodologies",
        "Educational Research Assistant: Acts as your dedicated educational market opportunity scout around the clock for learning"
      ],
      whatItDoes: "It acts as your educational research assistant, ensuring you never miss a potential educational learning opportunity, even when you're away from educational materials.",
      gradient: "from-amber-500/20 to-orange-500/20",
      accentColor: "amber"
    },
    {
      icon: Shield,
      title: "Educational Risk Calculator",
      subtitle: "Setup Learning Analysis",
      description: "Analyze hypothetical potential setups before risking educational capital, getting AI-powered educational feedback on setup learning viability.",
      detailedFeatures: [
        "Educational Setup Analysis Input: Enter parameters of educational setups you're analyzing - instrument, entry, stop loss, take profit for learning",
        "Educational Risk Assessment: Analyzes hypothetical proposed setups against current volatility, historical data, and key levels for educational purposes",
        "Educational Viability Score: Provides overall educational risk score and probability analysis for learning purposes",
        "Educational Risk-Reward Validation: Comprehensive educational feedback on your proposed hypothetical risk-to-reward ratios",
        "Educational Setup Confirmation Layer: Helps identify educational setup ideas for learning analysis",
        "Educational Market Context Analysis: Considers current market conditions and their educational impact on proposed learning setups",
        "Educational Confidence Building: Validates educational setups, increasing your learning conviction and educational execution confidence"
      ],
      whatItDoes: "It adds a crucial educational layer of confirmation to your learning planning. It helps you analyze educational setup ideas for learning purposes and validates educational concepts, increasing your learning confidence.",
      gradient: "from-red-500/20 to-pink-500/20",
      accentColor: "red"
    },
    {
      icon: Calculator,
      title: "Educational Calculator",
      subtitle: "Position Sizing Learning",
      description: "Learn the single most important variable in market analysis: position sizing concepts. Fast, accurate, and educational.",
      detailedFeatures: [
        "Educational Multi-Asset Calculation: Accurate educational formulas for Gold, JPY pairs, standard Forex, and Crypto instruments for learning",
        "Educational Risk-Based Sizing: Input hypothetical account balance, desired educational risk percentage, and stop distance for educational lot size analysis",
        "Educational Forward Calculation: Input educational lot size to see hypothetical risk amount and potential educational examples instantly",
        "Educational Live Metrics: Shows educational Risk:Reward ratio and percentage of hypothetical account at risk for learning purposes",
        "Educational Capital Protection: Learn to never lose more than planned on any educational setup analysis",
        "Educational Long-Term Learning: Key to understanding educational concepts and building consistent learning over time",
        "Educational Standards: Industry-standard educational position sizing methodology for learning purposes"
      ],
      whatItDoes: "This educational tool is the key to learning survival and long-term educational profitability concepts. It ensures you can learn to never lose more than you plan to on educational setup analysis, protecting educational capital concepts and allowing you to stay in the educational game.",
      gradient: "from-violet-500/20 to-purple-500/20",
      accentColor: "violet"
    }
  ];

  const stats = [
    { value: "6", label: "Educational Tools", subtitle: "Complete Learning Arsenal" },
    { value: "24/7", label: "Educational Scanning", subtitle: "Never Miss Learning Opportunities" },
    { value: "99.9%", label: "Educational Accuracy", subtitle: "Learning Grade Quality" }
  ];

  return (
    <div className="bg-background min-h-screen font-sans">
      {/* Compliance Notice */}
      <div className="p-6">
        <ComplianceNotice type="educational" size="md" />
      </div>

      {/* Hero Section */}
      <section className="relative py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center space-y-8">
            <div className="space-y-6">
              <div className="flex justify-center gap-2 mb-4">
                <EducationalBadge />
                <Badge variant="outline" className="inline-flex items-center gap-2 border-primary/20 text-primary bg-primary/5">
                  <Target className="h-4 w-4" />
                  Educational Learning Arsenal
                </Badge>
              </div>
              <h1 className="text-6xl font-bold leading-tight tracking-tight">
                <span className="bg-gradient-to-r from-primary via-amber-400 to-primary bg-clip-text text-transparent">
                  Educational-Grade
                </span>
                <br />
                <span className="text-foreground">Learning Tools</span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-4xl mx-auto">
                Your integrated suite of educational-grade utilities designed to give you a decisive learning edge in every aspect of your educational journey. 
                Each tool is an educational weapon in your learning arsenal, engineered for precision educational results.
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
                Start Your Educational Arsenal
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" className="border-primary/20 hover:bg-primary/5 px-8">
                Explore Educational Tools
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
                The Educational Learning Arsenal
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-4">
              Six precision-engineered educational tools that transform how you analyze, learn, and optimize your educational performance.
            </p>
            <EducationalBadge />
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
                        <div className="mt-3">
                          <EducationalBadge className="text-xs" />
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    {/* What It Does */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">What It Does For Your Learning:</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed italic bg-muted/30 p-4 rounded-lg">
                        "{tool.whatItDoes}"
                      </p>
                    </div>

                    {/* Detailed Features */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">Educational Features:</h4>
                      <div className="space-y-2">
                        {tool.detailedFeatures.slice(0, 4).map((feature, idx) => (
                          <div key={idx} className="flex items-start gap-3 text-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                            <span className="text-muted-foreground leading-relaxed">{feature}</span>
                          </div>
                        ))}
                        {tool.detailedFeatures.length > 4 && (
                          <div className="text-xs text-primary font-medium pl-4">
                            +{tool.detailedFeatures.length - 4} more educational features
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
                <span className="bg-gradient-to-r from-primary to-amber-400 bg-clip-text text-transparent"> Educational Tools</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Join the ranks of educational learners who use these learning-grade tools to gain their educational edge in market understanding.
              </p>
              <div className="flex justify-center">
                <EducationalBadge />
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-4">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8">
                Access Educational Tools
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" className="border-primary/20 hover:bg-primary/5 px-8">
                Schedule Educational Demo
              </Button>
            </div>
            
            <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                14-day educational trial included
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                No setup fees
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                Educational support
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdvancedToolsPage;
