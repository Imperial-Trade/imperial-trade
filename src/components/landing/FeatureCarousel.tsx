import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, TrendingUp, Radio, MessageSquare, Briefcase } from "lucide-react";
import ContentSection from "./ContentSection";

const features = [
  {
    icon: BookOpen,
    title: "AI-Powered Education",
    description: "Learn from personalized trading courses powered by artificial intelligence.",
    details: "Master trading with 50+ courses tailored to your skill level and trading style.",
    link: "Education",
    color: "hsl(var(--feature-purple))",
    gradient: "from-purple-500 to-blue-500"
  },
  {
    icon: TrendingUp,
    title: "Smart Signals",
    description: "Get real-time trading signals with 92% accuracy powered by machine learning.",
    details: "Never miss a profitable trade with our AI-driven signal detection system.",
    link: "SignalStream",
    color: "hsl(var(--feature-blue))",
    gradient: "from-blue-500 to-cyan-500"
  },
  {
    icon: Radio,
    title: "Live Trading",
    description: "Join live trading sessions with professional traders and learn in real-time.",
    details: "Watch experts trade live and copy their strategies in real-time.",
    link: "Live",
    color: "hsl(var(--feature-green))",
    gradient: "from-green-500 to-emerald-500"
  },
  {
    icon: MessageSquare,
    title: "Community",
    description: "Connect with 10,000+ traders in our exclusive community forum.",
    details: "Share ideas, get feedback, and learn from successful traders worldwide.",
    link: "Forum",
    color: "hsl(var(--feature-orange))",
    gradient: "from-orange-500 to-red-500"
  },
  {
    icon: Briefcase,
    title: "Partnership",
    description: "Earn up to $20 per lot with our exclusive IB partnership program.",
    details: "Build a profitable business with industry-leading compensation and support.",
    link: "IBPartnership",
    color: "hsl(var(--feature-pink))",
    gradient: "from-pink-500 to-purple-500"
  },
];

export default function FeatureCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  // Auto-advance every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prevIndex) => (prevIndex + 1) % features.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative py-32 sophisticated-bg-mesh">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <ContentSection>
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Everything You Need
              <span className="white-gold-gradient block">
                In One Platform
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A complete trading ecosystem designed to help you succeed in the markets.
            </p>
          </div>

          <div className="grid lg:grid-cols-5 gap-8 items-center">
            {/* Feature Navigation - Compact */}
            <div className="lg:col-span-2 space-y-6">
              {features.map((feature, index) => (
                <div
                  key={feature.title}
                  className={`p-3 rounded-lg border cursor-pointer transition-all duration-300 card-hover ${
                    activeIndex === index
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:border-primary/50'
                  }`}
                  onClick={() => setActiveIndex(index)}
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: feature.color + '20' }}
                    >
                      <feature.icon 
                        className="w-4 h-4" 
                        style={{ color: feature.color }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold mb-0.5 truncate">
                        {feature.title}
                      </h3>
                      <p className="text-muted-foreground text-xs leading-tight line-clamp-2">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Feature Display - Larger */}
            <div className="lg:col-span-3 relative">
              <div className="bg-card rounded-3xl border-2 border-border p-12 lg:p-16 min-h-[600px] h-3/4 flex flex-col justify-center">
                <div 
                  className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
                  style={{ backgroundColor: features[activeIndex].color + '20' }}
                >
                  {React.createElement(features[activeIndex].icon, {
                    className: "w-10 h-10",
                    style: { color: features[activeIndex].color }
                  })}
                </div>
                
                <h3 className="text-2xl lg:text-3xl font-bold mb-4 white-gold-gradient">
                  {features[activeIndex].title}
                </h3>
                
                <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
                  {features[activeIndex].details}
                </p>
                
                <Link to={createPageUrl(features[activeIndex].link)}>
                  <Button 
                    size="lg"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105"
                    style={{ 
                      background: `linear-gradient(135deg, ${features[activeIndex].color}, ${features[activeIndex].color}dd)`
                    }}
                  >
                    Explore {features[activeIndex].title}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </ContentSection>
      </div>
    </section>
  );
}