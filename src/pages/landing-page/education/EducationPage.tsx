import React from "react";
import {
  BookMarked,
  Play,
  Video,
  BookOpen,
  Map,
  Users,
  Award,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const EducationPage: React.FC = () => {
  const features = [
    {
      icon: Play,
      title: "Video Course Library",
      description: "Comprehensive video courses covering all aspects of trading and market analysis.",
      features: ["100+ Video Lessons", "Expert Instructors", "Lifetime Access", "Mobile App"],
      usage: "Learn from professional traders with over 100 hours of premium video content accessible on any device.",
      benefits: ["Expert instruction", "Lifetime access", "Mobile learning"]
    },
    {
      icon: Video,
      title: "Live Webinars",
      description: "Weekly live educational sessions with Q&A and real-time market analysis.",
      features: ["Weekly Sessions", "Live Q&A", "Market Analysis", "Recording Library"],
      usage: "Join weekly live educational sessions with expert traders and get your questions answered in real-time.",
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
      description: "Structured learning paths designed to take you from beginner to expert trader.",
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
  ];

  const stats = [
    { value: "100+", label: "Video Lessons" },
    { value: "10k+", label: "Students" },
    { value: "95%", label: "Success Rate" }
  ];

  return (
    <div className="bg-background min-h-screen font-sans">
      {/* Hero Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-background to-muted/30 dark:from-background dark:to-accent/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-6">
                <Badge variant="outline" className="inline-flex items-center gap-2 border-border text-muted-foreground">
                  <BookMarked className="h-4 w-4" />
                  Comprehensive Trading Education
                </Badge>
                <h1 className="text-5xl font-bold leading-tight tracking-tight text-foreground">
                  <span className="imperial-gradient-text">Trading Education</span>
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  From complete beginner to advanced professional, our education platform provides structured learning paths with expert instruction.
                </p>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-3 gap-6">
                {stats.map((stat, index) => (
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
              <div className="apple-card rounded-2xl p-8 white-gold-bg">
                <div className="aspect-video bg-muted/30 rounded-xl flex items-center justify-center border white-gold-border">
                  <BookMarked className="h-16 w-16 text-imperial-gold" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 text-foreground">
              <span className="imperial-gradient-text">Education Features</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Master trading with our comprehensive education platform designed by experts.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="apple-card group h-full">
                <CardHeader className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center border border-border group-hover:feature-accent-orange transition-colors duration-300">
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
                          <div className="w-1.5 h-1.5 rounded-full feature-accent-orange" />
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
      <section className="py-20 px-6 bg-gradient-to-b from-muted/30 to-background dark:from-accent/10 dark:to-background">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/50 border border-border mb-8">
            <BookMarked className="h-8 w-8 text-muted-foreground" />
          </div>
          
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Master Professional Trading
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Start your journey from beginner to professional trader with our comprehensive education platform.
          </p>
          
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" className="apple-button px-8">
              Start Learning
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

export default EducationPage;