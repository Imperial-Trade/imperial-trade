
import React, { useEffect, useRef } from "react";
import { BarChart3, Brain, Shield, Zap, Target, Smartphone, TrendingUp, DollarSign, Lock, Activity, Globe, Users } from "lucide-react";
import ContentSection from "./ContentSection";

const tools = [
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    description: "Real-time market analysis with AI-powered insights and predictive modeling for institutional-grade decision making.",
    color: "hsl(var(--feature-blue))",
    badge: "Popular"
  },
  {
    icon: Brain,
    title: "AI Trading Assistant", 
    description: "Personalized trading recommendations powered by machine learning algorithms and market sentiment analysis.",
    color: "hsl(var(--feature-purple))",
    badge: "New"
  },
  {
    icon: Shield,
    title: "Risk Management",
    description: "Automated risk controls with dynamic position sizing, portfolio protection, and regulatory compliance.",
    color: "hsl(var(--feature-green))",
    badge: "Essential"
  },
  {
    icon: Zap,
    title: "Lightning Execution",
    description: "Ultra-low latency order execution with smart routing and institutional-grade infrastructure.",
    color: "hsl(var(--feature-orange))",
    badge: "Pro"
  },
  {
    icon: Target,
    title: "Precision Signals",
    description: "Machine learning algorithms analyze market patterns for precise entry and exit timing.",
    color: "hsl(var(--feature-pink))",
    badge: "AI-Powered"
  },
  {
    icon: Lock,
    title: "Bank-Grade Security",
    description: "Multi-layer security protocols with encryption, 2FA, and cold storage protection.",
    color: "hsl(var(--feature-blue))",
    badge: "Secure"
  },
  {
    icon: Activity,
    title: "Live Market Data",
    description: "Real-time data feeds from major exchanges with microsecond precision and reliability.",
    color: "hsl(var(--feature-green))",
    badge: "Real-time"
  },
  {
    icon: Globe,
    title: "Global Markets",
    description: "Access to forex, stocks, commodities, and crypto markets from a single unified platform.",
    color: "hsl(var(--feature-purple))",
    badge: "Worldwide"
  },
  {
    icon: Users,
    title: "Copy Trading",
    description: "Follow and copy successful traders automatically with transparent performance tracking.",
    color: "hsl(var(--feature-orange))",
    badge: "Social"
  },
  {
    icon: DollarSign,
    title: "Performance Analytics",
    description: "Comprehensive P&L analysis, tax optimization, and detailed performance reporting tools.",
    color: "hsl(var(--feature-yellow))",
    badge: "Insights"
  }
];

export default function ToolsShowcase() {
  return (
    <section className="relative py-32 bg-gradient-to-b from-background via-muted/10 to-background">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <ContentSection>
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-6xl font-bold mb-6 tracking-tight">
              Professional Grade
              <span className="block bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Trading Tools
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-4xl mx-auto font-light leading-relaxed">
              Built with institutional-grade technology and designed for professional traders who demand excellence in every trade.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {tools.map((tool, index) => (
              <div
                key={tool.title}
                className="group relative bg-card rounded-2xl p-6 border border-border hover:border-primary/20 transition-all duration-500 hover:shadow-lg animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Badge */}
                <div className="absolute -top-2 -right-2 z-10">
                  <span 
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white shadow-sm"
                    style={{ backgroundColor: tool.color }}
                  >
                    {tool.badge}
                  </span>
                </div>

                {/* Hover effect background */}
                <div 
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-5 transition-opacity duration-500"
                  style={{ backgroundColor: tool.color }}
                />
                
                <div className="relative z-10">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-all duration-300"
                    style={{ backgroundColor: tool.color + '15' }}
                  >
                    <tool.icon 
                      className="w-6 h-6" 
                      style={{ color: tool.color }}
                    />
                  </div>
                  
                  <h3 className="font-bold mb-3 text-foreground group-hover:text-foreground transition-colors duration-300">
                    {tool.title}
                  </h3>
                  
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {tool.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="text-center mt-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border text-sm font-medium mb-4">
              <div className="w-2 h-2 bg-feature-green rounded-full animate-pulse" />
              All tools included in every plan
            </div>
          </div>
        </ContentSection>
      </div>
    </section>
  );
}
