import React from "react";
import HeroSection from "@/components/landing/HeroSection";
import StatsSection from "@/components/landing/StatsSection";
import FeatureCarousel from "@/components/landing/FeatureCarousel";
import ToolsShowcase from "@/components/landing/ToolsShowcase";
import FinalCTA from "@/components/landing/FinalCTA";

export default function Landing() {
  return (
    <div className="bg-background w-full overflow-x-hidden">
      <HeroSection />
      <StatsSection />
      <FeatureCarousel />
      <ToolsShowcase />
      <FinalCTA />
    </div>
  );
}