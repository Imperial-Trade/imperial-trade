import React, { useEffect } from "react";
import { ClickTracker } from "@/components/analytics/ClickTracker";
import HeroSection from "@/components/landing/HeroSection";
import StatsSection from "@/components/landing/StatsSection";
import FeatureCarousel from "@/components/landing/FeatureCarousel";
import ToolsShowcase from "@/components/landing/ToolsShowcase";
import FinalCTA from "@/components/landing/FinalCTA";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      <ClickTracker
        trackingId="hero_section"
        trackingData={{ section: "hero", page: "landing" }}
      >
        <HeroSection />
      </ClickTracker>

      <ClickTracker
        trackingId="stats_section"
        trackingData={{ section: "stats", page: "landing" }}
      >
        <StatsSection />
      </ClickTracker>

      <ClickTracker
        trackingId="feature_carousel"
        trackingData={{ section: "features", page: "landing" }}
      >
        <FeatureCarousel />
      </ClickTracker>

      <ClickTracker
        trackingId="tools_showcase"
        trackingData={{ section: "tools", page: "landing" }}
      >
        <ToolsShowcase />
      </ClickTracker>

      <ClickTracker
        trackingId="final_cta"
        trackingData={{ section: "cta", page: "landing" }}
      >
        <FinalCTA />
      </ClickTracker>
    </div>
  );
};

export default Landing;
