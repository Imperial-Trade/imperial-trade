
import React, { useEffect, useRef } from "react";
import { BarChart3, Brain, Shield, Zap, Target, Smartphone, TrendingUp, DollarSign } from "lucide-react";
import ContentSection from "./ContentSection";

const tools = [
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    description: "Real-time market analysis with AI-powered insights and predictive modeling",
    color: "hsl(var(--feature-blue))",
    gradient: "from-blue-500 to-purple-500"
  },
  {
    icon: Brain,
    title: "AI Trading Assistant", 
    description: "Personalized trading recommendations and strategy optimization",
    color: "hsl(var(--feature-purple))",
    gradient: "from-purple-500 to-pink-500"
  },
  {
    icon: Shield,
    title: "Risk Management",
    description: "Automated risk controls with position sizing and portfolio protection",
    color: "hsl(var(--feature-green))",
    gradient: "from-green-500 to-emerald-500"
  },
  {
    icon: Zap,
    title: "Lightning Execution",
    description: "Ultra-low latency order execution with institutional-grade infrastructure",
    color: "hsl(var(--feature-orange))",
    gradient: "from-orange-500 to-red-500"
  },
  {
    icon: Target,
    title: "Precision Signals",
    description: "Machine learning algorithms for precise entry and exit points",
    color: "hsl(var(--feature-pink))",
    gradient: "from-pink-500 to-purple-500"
  },
  {
    icon: Smartphone,
    title: "Mobile Trading",
    description: "Full-featured mobile app for professional trading on the go",
    color: "hsl(var(--feature-blue))",
    gradient: "from-blue-500 to-cyan-500"
  },
  {
    icon: TrendingUp,
    title: "Market Scanner",
    description: "Real-time opportunity detection across global markets",
    color: "hsl(var(--feature-purple))",
    gradient: "from-purple-500 to-indigo-500"
  },
  {
    icon: DollarSign,
    title: "Profit Tracker",
    description: "Comprehensive P&L analysis with tax optimization tools",
    color: "hsl(var(--feature-green))",
    gradient: "from-green-500 to-teal-500"
  }
];

export default function ToolsShowcase() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;
      
      const rect = sectionRef.current.getBoundingClientRect();
      const scrolled = window.pageYOffset;
      const parallax = scrolled * 0.5;
      
      sectionRef.current.style.transform = `translate3d(0, ${parallax}px, 0)`;
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section className="relative py-32 bg-white">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-20 w-96 h-96 bg-gray-100 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-gray-100 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <ContentSection>
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-6xl font-bold mb-6">
              Professional Trading
              <span className="white-gold-gradient block">
                Arsenal
              </span>
            </h2>
            <p className="text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Everything you need to dominate the markets. Built by traders, for traders.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {tools.map((tool, index) => (
              <div
                key={tool.title}
                className="group relative bg-card/50 backdrop-blur-xl rounded-3xl p-8 border border-border/50 overflow-hidden"
              >
                {/* Gradient Background */}
                <div 
                  className={`absolute inset-0 bg-gradient-to-br ${tool.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-3xl`}
                />
                
                <div className="relative z-10">
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                    style={{ backgroundColor: tool.color + '15' }}
                  >
                    <tool.icon 
                      className="w-8 h-8" 
                      style={{ color: tool.color }}
                    />
                  </div>
                  
                  <h3 className="text-xl font-bold mb-4 group-hover:gradient-text transition-all duration-300">
                    {tool.title}
                  </h3>
                  
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {tool.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ContentSection>
      </div>
    </section>
  );
}
