import React from "react";
import HeroSection from "@/components/landing/HeroSection";
import StatsSection from "@/components/landing/StatsSection";
import FeatureCarousel from "@/components/landing/FeatureCarousel";
import ToolsShowcase from "@/components/landing/ToolsShowcase";
import ToolsCarousel from "@/components/landing/ToolsCarousel";
import ContentSection from "@/components/landing/ContentSection";
import FinalCTA from "@/components/landing/FinalCTA";
import ParallaxSection from "@/components/landing/ParallaxSection";

export default function Landing() {
  return (
    <div className="bg-background w-full overflow-x-hidden">
      <ParallaxSection speed={0.3}>
        <HeroSection />
      </ParallaxSection>
      
      <ParallaxSection speed={0.4}>
        <StatsSection />
      </ParallaxSection>
      
      <ParallaxSection speed={0.5}>
        <FeatureCarousel />
      </ParallaxSection>
      
      <ParallaxSection speed={0.3}>
        <ToolsShowcase />
      </ParallaxSection>
      
      {/* An Arsenal of Professional Tools Section */}
      <ParallaxSection speed={0.4} className="py-24 bg-gradient-to-b from-white to-gray-50/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <ContentSection>
            <div className="text-center mb-12">
              <h2 className="text-4xl lg:text-5xl font-bold text-primary mb-4">
                An Arsenal of <span className="linear-gold-gradient">Professional Tools</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Engineered for performance, powered by AI. Your trading, elevated.
              </p>
            </div>
          </ContentSection>
          <ToolsCarousel />
        </div>
      </ParallaxSection>
      
      <ParallaxSection speed={0.3}>
        <FinalCTA />
      </ParallaxSection>
    </div>
  );
}