import React from "react";
import { TrendingUp, Users, Shield, Award } from "lucide-react";
import ContentSection from "./ContentSection";

export default function StatsSection() {
  const stats = [
    {
      icon: TrendingUp,
      label: "Trading Volume",
      value: "$2.5B",
      description: "Processed monthly",
      color: "hsl(var(--feature-blue))",
      delay: "0ms"
    },
    {
      icon: Users,
      label: "Active Traders",
      value: "200+",
      description: "Worldwide community",
      color: "hsl(var(--feature-purple))",
      delay: "200ms"
    },
    {
      icon: Shield,
      label: "Success Rate",
      value: "92%",
      description: "Average profitability",
      color: "hsl(var(--feature-green))",
      delay: "400ms"
    },
    {
      icon: Award,
      label: "Awards Won",
      value: "15+",
      description: "Industry recognition",
      color: "hsl(var(--feature-orange))",
      delay: "600ms"
    },
  ];

  return (
    <section className="relative py-32 subtle-bg-gradient">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <ContentSection>
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Trusted by Traders
              <span className="white-gold-gradient block">
                Worldwide
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join thousands of successful traders who trust our platform for their trading needs.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div 
                key={stat.label} 
                className="text-center group"
              >
                <div className="relative mb-6">
                  <div 
                    className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: stat.color + '20' }}
                  >
                    <stat.icon 
                      className="w-8 h-8" 
                      style={{ color: stat.color }}
                    />
                  </div>
                </div>
                
                <div className="text-3xl lg:text-4xl font-bold mb-2 white-gold-gradient">
                  {stat.value}
                </div>
                
                <div className="text-sm font-semibold text-foreground mb-1">
                  {stat.label}
                </div>
                
                <div className="text-xs sage-accent">
                  {stat.description}
                </div>
              </div>
            ))}
          </div>
        </ContentSection>
      </div>
    </section>
  );
}