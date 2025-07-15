
import React, { useEffect } from 'react';
import { usePostHogTracking } from '@/hooks/usePostHogTracking';
import { HeroSection } from '@/components/landing/HeroSection';
import { StatsSection } from '@/components/landing/StatsSection';
import { FeatureCarousel } from '@/components/landing/FeatureCarousel';
import { ParallaxSection } from '@/components/landing/ParallaxSection';
import { ToolsShowcase } from '@/components/landing/ToolsShowcase';
import { FinalCTA } from '@/components/landing/FinalCTA';

const Landing = () => {
  const { track } = usePostHogTracking();

  useEffect(() => {
    // Test event to verify PostHog is working
    track('landing_page_loaded', {
      page: 'landing',
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
    });
  }, [track]);

  return (
    <div className="min-h-screen bg-background">
      <HeroSection />
      <StatsSection />
      <FeatureCarousel />
      <ParallaxSection />
      <ToolsShowcase />
      <FinalCTA />
    </div>
  );
};

export default Landing;
