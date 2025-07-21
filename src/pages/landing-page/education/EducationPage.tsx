import React from "react";
import {
  BookOpen,
  Play,
  Video,
  Map,
  Users,
  Award,
  ArrowRight,
  CheckCircle,
  Star,
  Zap,
  Brain,
  Target,
  BookMarked,
  GraduationCap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const EducationPage: React.FC = () => {
  const learningPathways = [
    {
      icon: BookOpen,
      title: "The Foundation Pathway",
      subtitle: "Beginner to Intermediate",
      level: "FOUNDATION",
      description: "This isn't just 'what is a pip?' — it's a comprehensive journey covering the bedrock of trading.",
      modules: [
        "Market Mechanics: Understanding how markets really work at an institutional level",
        "Advanced Candlestick Interpretation: Reading price action like a professional",
        "Charting Essentials: Professional-grade technical analysis fundamentals",
        "Risk Management I: Capital preservation and position sizing basics",
        "Trading Psychology Fundamentals: Mental game and emotional control"
      ],
      outcome: "You will understand market structure, read price action fluently, and most importantly, know how to protect your capital from day one. You'll finish with skills to place trades confidently and manage them effectively.",
      gradient: "from-blue-500/20 to-indigo-500/20",
      duration: "8-12 weeks",
      lessons: "25+ lessons"
    },
    {
      icon: GraduationCap,
      title: "The Specialist Pathway",
      subtitle: "Intermediate to Advanced",
      level: "SPECIALIST",
      description: "Where you transition from a competent trader to a lethal market analyst.",
      modules: [
        "Institutional Concepts: Order Blocks, Fair Value Gaps, and smart money concepts",
        "Liquidity Engineering: Understanding how liquidity drives price movement",
        "Advanced Market Structure: Reading institutional footprints in the market",
        "Risk Management II: Portfolio hedging and advanced risk strategies",
        "High-Performance Mindset: Psychological resilience for consistent execution"
      ],
      outcome: "You will learn to see the market through the eyes of 'smart money.' You'll identify high-probability setups that most retail traders miss and develop psychological resilience to execute with unwavering discipline.",
      gradient: "from-purple-500/20 to-violet-500/20",
      duration: "12-16 weeks",
      lessons: "30+ lessons"
    }
  ];

  const educationFeatures = [
    {
      icon: Video,
      title: "High-Definition Video Production",
      description: "Each video is professionally produced with on-screen graphics, chart annotations, and clear explanations.",
      details: [
        "High Production Quality: No rambling, no fluff - concise, focused lessons",
        "On-Screen Graphics: Visual learning with chart annotations and clear explanations",
        "Modular Learning: 5-10 minute videos for focused sessions that fit any schedule",
        "Mobile Accessibility: Learn anywhere, anytime on any device",
        "Progressive Difficulty: Each lesson builds logically on the previous one"
      ]
    },
    {
      icon: Brain,
      title: "Interactive Knowledge Gates",
      description: "Quizzes aren't just for show - they act as mandatory knowledge gates ensuring true comprehension.",
      details: [
        "Mandatory Progression: Must pass quizzes to unlock next modules",
        "Scenario-Based Questions: Test practical application, not rote memorization",
        "Adaptive Learning: Questions adjust to ensure you truly understand concepts",
        "Immediate Feedback: Instant explanations for incorrect answers",
        "Progress Tracking: Visual progress indicators and completion tracking"
      ]
    },
    {
      icon: Target,
      title: "Downloadable Arsenal",
      description: "Comprehensive resources you can use in your daily trading to reinforce learning.",
      details: [
        "Trading Plan Templates: Professional-grade templates to define your rules",
        "Strategy Checklists: Printable checklists for core strategies verification",
        "Quick-Reference Guides: Cheat sheets for candlestick patterns and formations",
        "Risk Management Tools: Calculators and worksheets for position sizing",
        "Psychology Exercises: Mental training tools for emotional control"
      ]
    }
  ];

  const stats = [
    { value: "50+", label: "HD Video Lessons", subtitle: "High-Quality Content" },
    { value: "95%", label: "Student Success Rate", subtitle: "Proven Results" },
    { value: "24/7", label: "Learning Access", subtitle: "Learn At Your Pace" }
  ];

  const testimonials = [
    {
      quote: "The Foundation Pathway completely changed how I view the markets. I went from guessing to actually understanding.",
      author: "Sarah M.",
      role: "Former Beginner, Now Profitable Trader"
    },
    {
      quote: "The Specialist Pathway taught me to see institutional activity. Now I trade with the smart money, not against it.",
      author: "Michael R.",
      role: "Advanced Trader"
    }
  ];

  return (
    <div className="bg-background min-h-screen font-sans">
      {/* Hero Section */}
      <section className="relative py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-blue-500/5" />
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center space-y-8">
            <div className="space-y-6">
              <Badge variant="outline" className="inline-flex items-center gap-2 border-blue-500/20 text-blue-600 bg-blue-500/5">
                <BookMarked className="h-4 w-4" />
                The Master's Curriculum
              </Badge>
              <h1 className="text-6xl font-bold leading-tight tracking-tight">
                <span className="bg-gradient-to-r from-blue-500 via-indigo-400 to-blue-600 bg-clip-text text-transparent">
                  Imperial Academy
                </span>
                <br />
                <span className="text-foreground">Transform Your Mind</span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-4xl mx-auto">
                Education is not just information; it's the systematic installation of a professional trading framework into your mind. 
                We don't teach you what to think, we teach you <strong>how to think</strong> like a seasoned analyst.
              </p>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="text-center space-y-2">
                  <div className="text-3xl font-bold text-blue-600">{stat.value}</div>
                  <div className="text-sm font-medium text-foreground">{stat.label}</div>
                  <div className="text-xs text-muted-foreground">{stat.subtitle}</div>
                </div>
              ))}
            </div>
            
            <div className="flex items-center justify-center gap-4">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8">
                Begin Your Transformation
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" className="border-blue-500/20 hover:bg-blue-500/5 px-8">
                Explore Curriculum
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Learning Pathways */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-indigo-400 to-blue-600 bg-clip-text text-transparent">
                Learning Pathways: The Structured Ascent
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Two carefully designed pathways that take you from wherever you are to where you want to be - systematically and effectively.
            </p>
          </div>

          <div className="space-y-8">
            {learningPathways.map((pathway, index) => (
              <Card key={index} className="group border-border/50 hover:border-blue-500/30 transition-all duration-300 overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${pathway.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative">
                  <CardHeader className="space-y-6">
                    <div className="flex items-start gap-6">
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 group-hover:from-blue-500/20 group-hover:to-blue-500/10 transition-all duration-300">
                        <pathway.icon className="h-8 w-8 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-3">
                          <Badge className="bg-blue-600 text-white text-xs px-3 py-1">
                            {pathway.level}
                          </Badge>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>⏱️ {pathway.duration}</span>
                            <span>📺 {pathway.lessons}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <CardTitle className="text-3xl text-foreground group-hover:text-blue-600 transition-colors">
                            {pathway.title}
                          </CardTitle>
                          <div className="text-sm font-medium text-blue-600">
                            {pathway.subtitle}
                          </div>
                        </div>
                        <CardDescription className="text-muted-foreground mt-4 leading-relaxed text-base">
                          {pathway.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-8">
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">Core Modules:</h4>
                      <div className="space-y-3">
                        {pathway.modules.map((module, idx) => (
                          <div key={idx} className="flex items-start gap-3 text-sm bg-muted/30 p-4 rounded-lg">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 flex-shrink-0" />
                            <span className="text-muted-foreground leading-relaxed">{module}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">Learning Outcome:</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed italic bg-blue-500/5 border border-blue-500/20 p-4 rounded-lg">
                        "{pathway.outcome}"
                      </p>
                    </div>
                    
                    <Button className="w-full bg-blue-600/10 hover:bg-blue-600 hover:text-white text-blue-600 border border-blue-600/20 transition-all duration-300">
                      Start {pathway.title}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Education Features */}
      <section className="py-24 px-6 bg-gradient-to-br from-blue-500/5 to-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              The Knowledge Vault: How We Teach
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Our education methodology is designed around how professionals actually learn and retain complex trading concepts.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {educationFeatures.map((feature, index) => (
              <Card key={index} className="text-center border-border/50 hover:border-blue-500/30 transition-all duration-300">
                <CardHeader className="space-y-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 mx-auto">
                    <feature.icon className="h-8 w-8 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl text-foreground">
                    {feature.title}
                  </CardTitle>
                  <CardDescription className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    {feature.details.slice(0, 3).map((detail, idx) => (
                      <div key={idx} className="flex items-start gap-3 text-sm text-left">
                        <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground leading-relaxed">{detail}</span>
                      </div>
                    ))}
                    {feature.details.length > 3 && (
                      <div className="text-xs text-blue-600 font-medium">
                        +{feature.details.length - 3} more features
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Student Success Stories
            </h2>
            <p className="text-lg text-muted-foreground">
              Real results from real students who completed our pathways.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-border/50 hover:border-blue-500/30 transition-all duration-300">
                <CardContent className="p-8">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-500/10 flex items-center justify-center">
                        <Star className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <blockquote className="text-muted-foreground leading-relaxed italic">
                        "{testimonial.quote}"
                      </blockquote>
                      <div>
                        <div className="font-semibold text-foreground">{testimonial.author}</div>
                        <div className="text-sm text-blue-600">{testimonial.role}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-background to-indigo-400/5" />
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="space-y-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-blue-500/10 border border-blue-500/20">
              <Zap className="h-10 w-10 text-blue-600" />
            </div>
            
            <div className="space-y-4">
              <h2 className="text-4xl font-bold text-foreground">
                Begin Your 
                <span className="bg-gradient-to-r from-blue-500 to-indigo-400 bg-clip-text text-transparent"> Professional Education</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Join thousands of students who have transformed from beginners to confident, profitable traders through our proven curriculum.
              </p>
            </div>
            
            <div className="flex items-center justify-center gap-4">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8">
                Start Foundation Pathway
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" className="border-blue-500/20 hover:bg-blue-500/5 px-8">
                View Full Curriculum
              </Button>
            </div>
            
            <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                Progressive learning system
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                Lifetime access included
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                Professional certification
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default EducationPage;