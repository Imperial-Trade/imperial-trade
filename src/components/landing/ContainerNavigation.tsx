import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  Signal,
  GraduationCap,
  Video,
  Users,
  Handshake,
  ArrowRight,
  Sparkles,
  Zap,
  Target,
  Brain,
  MessageSquare,
  Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const tradingFeatures = [
  {
    id: "advanced-tools",
    title: "Advanced Tools",
    icon: TrendingUp,
    color: "hsl(var(--feature-blue))",
    gradient: "from-blue-500/20 to-blue-600/30",
    description: "Professional trading analytics & risk management",
    features: [
      "Real-time Market Analytics",
      "AI-Powered Risk Calculator", 
      "Advanced Portfolio Tracker",
      "Economic Calendar Integration"
    ],
    stats: { value: "99.9%", label: "Uptime" }
  },
  {
    id: "signals",
    title: "Trading Signals",
    icon: Signal,
    color: "hsl(var(--feature-green))",
    gradient: "from-green-500/20 to-green-600/30",
    description: "Expert-curated trading opportunities",
    features: [
      "Live Signal Stream",
      "Expert Analysis",
      "Risk-Reward Ratios",
      "Entry & Exit Points"
    ],
    stats: { value: "87%", label: "Win Rate" }
  },
  {
    id: "education",
    title: "Trading Education",
    icon: GraduationCap,
    color: "hsl(var(--feature-purple))",
    gradient: "from-purple-500/20 to-purple-600/30",
    description: "Comprehensive learning pathways",
    features: [
      "Interactive Courses",
      "Video Tutorials",
      "Trading Simulations",
      "Certification Programs"
    ],
    stats: { value: "50+", label: "Courses" }
  },
  {
    id: "live-sessions",
    title: "Live Sessions",
    icon: Video,
    color: "hsl(var(--feature-orange))",
    gradient: "from-orange-500/20 to-orange-600/30",
    description: "Live market analysis & trading sessions",
    features: [
      "Daily Market Reviews",
      "Live Trading Sessions",
      "Q&A with Experts",
      "Interactive Workshops"
    ],
    stats: { value: "5x", label: "Weekly" }
  },
  {
    id: "community",
    title: "Community Forum",
    icon: Users,
    color: "hsl(var(--feature-pink))",
    gradient: "from-pink-500/20 to-pink-600/30",
    description: "Connect with fellow traders",
    features: [
      "Trading Discussions",
      "Strategy Sharing",
      "Market Insights",
      "Peer Learning"
    ],
    stats: { value: "10K+", label: "Members" }
  },
  {
    id: "ib-partnership",
    title: "IB Partnership",
    icon: Handshake,
    color: "hsl(var(--feature-yellow))",
    gradient: "from-yellow-500/20 to-yellow-600/30",
    description: "Institutional broker partnerships",
    features: [
      "Competitive Spreads",
      "Fast Execution",
      "Global Markets",
      "24/7 Support"
    ],
    stats: { value: "0.1ms", label: "Latency" }
  }
];

const ContainerNavigation: React.FC = () => {
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);

  const handleFeatureClick = (featureId: string) => {
    setActiveFeature(activeFeature === featureId ? null : featureId);
  };

  const getFeatureLayout = (feature: typeof tradingFeatures[0]) => {
    switch (feature.id) {
      case "advanced-tools":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <Brain className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">AI Analytics</h4>
                  <p className="text-sm text-muted-foreground">Smart market predictions</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <Target className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Risk Management</h4>
                  <p className="text-sm text-muted-foreground">Advanced position sizing</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-500/5 to-blue-600/10 rounded-xl p-6 border border-blue-500/20">
              <div className="text-3xl font-bold text-blue-500">{feature.stats.value}</div>
              <div className="text-sm text-muted-foreground">{feature.stats.label}</div>
              <div className="mt-4 space-y-2">
                {feature.features.slice(0, 2).map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    {feat}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "signals":
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {feature.features.map((feat, idx) => (
              <div key={idx} className="bg-gradient-to-br from-green-500/5 to-green-600/10 rounded-xl p-4 border border-green-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-green-500" />
                  <h4 className="font-medium text-foreground">{feat}</h4>
                </div>
                <div className="text-xs text-muted-foreground">
                  {idx === 0 && "Real-time notifications"}
                  {idx === 1 && "Professional insights"}
                  {idx === 2 && "Calculated precision"}
                  {idx === 3 && "Optimal timing"}
                </div>
              </div>
            ))}
          </div>
        );

      case "education":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {feature.features.map((feat, idx) => (
                <div key={idx} className="text-center">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-purple-500/10 to-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                    <GraduationCap className="h-6 w-6 text-purple-500" />
                  </div>
                  <h4 className="font-medium text-sm text-foreground">{feat}</h4>
                </div>
              ))}
            </div>
            <div className="text-center bg-gradient-to-r from-purple-500/5 to-purple-600/10 rounded-xl p-6 border border-purple-500/20">
              <div className="text-2xl font-bold text-purple-500">{feature.stats.value}</div>
              <div className="text-sm text-muted-foreground">{feature.stats.label} Available</div>
            </div>
          </div>
        );

      case "live-sessions":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {feature.features.map((feat, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
                  <Video className="h-5 w-5 text-orange-500" />
                  <span className="text-sm font-medium">{feat}</span>
                </div>
              ))}
            </div>
            <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/20 rounded-xl p-6 border border-orange-500/30">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-500">{feature.stats.value}</div>
                <div className="text-sm text-muted-foreground">{feature.stats.label}</div>
                <div className="mt-4 text-xs text-muted-foreground">Next session in 2 hours</div>
              </div>
            </div>
          </div>
        );

      case "community":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-8 w-8 text-pink-500" />
                <div>
                  <h4 className="font-semibold">Active Discussions</h4>
                  <p className="text-sm text-muted-foreground">Join the conversation</p>
                </div>
              </div>
              <div className="space-y-2">
                {feature.features.map((feat, idx) => (
                  <div key={idx} className="text-sm text-muted-foreground">• {feat}</div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-pink-500/5 to-pink-600/10 rounded-xl p-6 border border-pink-500/20">
              <div className="text-3xl font-bold text-pink-500">{feature.stats.value}</div>
              <div className="text-sm text-muted-foreground">{feature.stats.label}</div>
              <div className="mt-4 text-xs text-muted-foreground">Active traders worldwide</div>
            </div>
          </div>
        );

      case "ib-partnership":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Building className="h-8 w-8 text-yellow-500" />
                <div>
                  <h4 className="font-semibold">Tier 1 Brokers</h4>
                  <p className="text-sm text-muted-foreground">Premium partnerships</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {feature.features.map((feat, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20 text-center">
                    <div className="text-sm font-medium">{feat}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-yellow-500/5 to-yellow-600/10 rounded-xl p-6 border border-yellow-500/20">
              <div className="text-3xl font-bold text-yellow-500">{feature.stats.value}</div>
              <div className="text-sm text-muted-foreground">Average {feature.stats.label}</div>
              <div className="mt-4 text-xs text-muted-foreground">Ultra-low latency execution</div>
            </div>
          </div>
        );

      default:
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {feature.features.map((feat, idx) => (
              <div key={idx} className="text-center p-4 rounded-lg bg-secondary/50">
                <Sparkles className="h-6 w-6 mx-auto mb-2 text-primary" />
                <div className="text-sm font-medium">{feat}</div>
              </div>
            ))}
          </div>
        );
    }
  };

  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/20 to-background" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Professional Trading Platform
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Everything you need to succeed in trading - from advanced tools to expert education
          </p>
        </motion.div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {tradingFeatures.map((feature, index) => {
            const Icon = feature.icon;
            const isActive = activeFeature === feature.id;
            const isHovered = hoveredFeature === feature.id;

            return (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card
                  className={`relative overflow-hidden cursor-pointer transition-all duration-500 hover:shadow-2xl hover:scale-105 border-border/50 ${
                    isActive ? 'ring-2 ring-primary/50' : ''
                  }`}
                  onMouseEnter={() => setHoveredFeature(feature.id)}
                  onMouseLeave={() => setHoveredFeature(null)}
                  onClick={() => handleFeatureClick(feature.id)}
                >
                  <CardContent className="p-6">
                    {/* Background Gradient */}
                    <div 
                      className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 transition-opacity duration-300 ${
                        isHovered || isActive ? 'opacity-100' : ''
                      }`} 
                    />
                    
                    <div className="relative z-10">
                      <div className="flex items-center gap-4 mb-4">
                        <div 
                          className="p-3 rounded-xl border transition-all duration-300"
                          style={{ 
                            backgroundColor: isHovered || isActive ? feature.color + '20' : 'hsl(var(--secondary))',
                            borderColor: isHovered || isActive ? feature.color + '30' : 'hsl(var(--border))'
                          }}
                        >
                          <Icon 
                            className="h-6 w-6 transition-colors duration-300" 
                            style={{ color: isHovered || isActive ? feature.color : 'hsl(var(--muted-foreground))' }}
                          />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-foreground">{feature.title}</h3>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          {feature.features[0]}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`transition-all duration-300 ${
                            isActive ? 'rotate-90' : ''
                          }`}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Expanded Feature Content */}
        <AnimatePresence>
          {activeFeature && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.5 }}
              className="overflow-hidden"
            >
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-8">
                  {(() => {
                    const feature = tradingFeatures.find(f => f.id === activeFeature);
                    if (!feature) return null;

                    return (
                      <div>
                        <div className="flex items-center gap-4 mb-8">
                          <div 
                            className="p-4 rounded-xl border"
                            style={{ 
                              backgroundColor: feature.color + '20',
                              borderColor: feature.color + '30'
                            }}
                          >
                            <feature.icon className="h-8 w-8" style={{ color: feature.color }} />
                          </div>
                          <div>
                            <h3 className="text-2xl font-bold text-foreground">{feature.title}</h3>
                            <p className="text-muted-foreground">{feature.description}</p>
                          </div>
                        </div>

                        {getFeatureLayout(feature)}

                        <div className="mt-8 flex justify-center">
                          <Button 
                            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3"
                          >
                            Explore {feature.title}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default ContainerNavigation;