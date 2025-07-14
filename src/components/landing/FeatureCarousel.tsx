import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, TrendingUp, Radio, MessageSquare, Briefcase, Brain } from "lucide-react";
import ContentSection from "./ContentSection";
import { LaptopMockup, PhoneMockup } from "./DeviceMockups";
import { TradingDashboard, MobileTradingApp, AnalyticsInterface } from "./TradingInterface";

const features = [
  {
    icon: TrendingUp,
    title: "Professional Trading Platform",
    description: "Advanced trading tools with institutional-grade execution and real-time analytics.",
    details: "Experience lightning-fast execution, advanced charting, and comprehensive market analysis in one powerful platform.",
    link: "SignalStream",
    color: "hsl(var(--feature-blue))",
    mockup: "laptop",
    interface: <TradingDashboard />
  },
  {
    icon: Radio,
    title: "Mobile Trading Excellence",
    description: "Trade anywhere with our award-winning mobile application designed for professionals.",
    details: "Full-featured mobile trading with advanced order types, real-time alerts, and seamless synchronization.",
    link: "Live",
    color: "hsl(var(--feature-green))",
    mockup: "phone",
    interface: <MobileTradingApp />
  },
  {
    icon: Brain,
    title: "AI-Powered Analytics",
    description: "Harness the power of artificial intelligence for superior market insights and predictions.",
    details: "Our advanced AI algorithms analyze market patterns, sentiment, and technical indicators to provide actionable insights.",
    link: "Education",
    color: "hsl(var(--feature-purple))",
    mockup: "laptop",
    interface: <AnalyticsInterface />
  },
  {
    icon: MessageSquare,
    title: "Professional Community",
    description: "Connect with elite traders and industry professionals in our exclusive network.",
    details: "Access premium insights, share strategies, and learn from the most successful traders in the industry.",
    link: "Forum",
    color: "hsl(var(--feature-orange))",
    mockup: "phone",
    interface: <MobileTradingApp />
  },
];

export default function FeatureCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section className="relative py-32 bg-gradient-to-b from-background via-muted/5 to-background">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <ContentSection>
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-6xl font-bold mb-6 tracking-tight">
              Professional Trading
              <span className="block bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Experience
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-light">
              Cutting-edge technology meets professional trading in our comprehensive platform ecosystem.
            </p>
          </div>

          <div className="grid lg:grid-cols-5 gap-12 items-center">
            {/* Feature Navigation */}
            <div className="lg:col-span-2 space-y-3">
              {features.map((feature, index) => (
                <div
                  key={feature.title}
                  className={`group p-5 rounded-xl cursor-pointer transition-all duration-500 ${
                    activeIndex === index
                      ? 'bg-card border-2 border-primary/20 shadow-lg'
                      : 'bg-muted/20 border border-border hover:bg-card hover:border-primary/10'
                  }`}
                  onClick={() => setActiveIndex(index)}
                >
                  <div className="flex items-start gap-4">
                    <div 
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                        activeIndex === index ? 'scale-110' : 'group-hover:scale-105'
                      }`}
                      style={{ backgroundColor: feature.color + '15' }}
                    >
                      <feature.icon 
                        className="w-5 h-5" 
                        style={{ color: feature.color }}
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-semibold mb-1 transition-all duration-300 ${
                        activeIndex === index ? 'text-foreground text-lg' : 'text-foreground/80'
                      }`}>
                        {feature.title}
                      </h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Device Mockup Display */}
            <div className="lg:col-span-3 relative">
              <div className="relative animate-device-float">
                {features[activeIndex].mockup === "laptop" ? (
                  <LaptopMockup className="transform transition-all duration-700">
                    {features[activeIndex].interface}
                  </LaptopMockup>
                ) : (
                  <PhoneMockup className="transform transition-all duration-700">
                    {features[activeIndex].interface}
                  </PhoneMockup>
                )}
              </div>
              
              {/* Floating elements */}
              <div className="absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full blur-xl animate-pulse" />
              <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-gradient-to-br from-muted to-muted/50 rounded-full blur-2xl opacity-50 animate-float" />
            </div>
          </div>

          {/* Feature Details */}
          <div className="mt-16 text-center">
            <div className="max-w-4xl mx-auto bg-card/50 backdrop-blur-sm rounded-2xl p-8 border border-border/50">
              <h3 className="text-2xl font-bold mb-4">{features[activeIndex].title}</h3>
              <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
                {features[activeIndex].details}
              </p>
              <Link to={createPageUrl(features[activeIndex].link)}>
                <Button 
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-8 py-3 rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg"
                >
                  Explore {features[activeIndex].title.split(' ')[0]}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </ContentSection>
      </div>
    </section>
  );
}