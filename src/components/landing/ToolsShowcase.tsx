
import React, { useEffect, useRef } from "react";
import ContentSection from "./ContentSection";
import { tools } from "./constants";

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
    <section className="relative py-32 bg-gradient-to-br from-background via-card to-muted">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-accent/30 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <ContentSection>
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-6xl font-bold mb-6">
              Educational Trading
              <span className="white-gold-gradient block">
                Toolkit
              </span>
            </h2>
            <p className="text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Everything you need to analyze the markets effectively. Built by educators, for learners.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {tools.map((tool, index) => (
              <div
                key={tool.title}
                className={`group relative bg-card/50 backdrop-blur-xl rounded-3xl p-8 border border-border/50 overflow-hidden tool-box-${index}`}
              >
                {/* Gradient Background */}
                <div 
                  className={`absolute inset-0 bg-gradient-to-br ${tool.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-3xl`}
                />
                
                {/* Circular Animation Highlight - All 8 boxes */}
                <div 
                  className="absolute inset-0 opacity-0 rounded-3xl circular-highlight"
                  style={{ 
                    background: `linear-gradient(135deg, ${tool.color}20, ${tool.color}10)` 
                  }}
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
