
import React, { useEffect } from 'react';
import { useComprehensivePostHogTracking } from '@/hooks/useComprehensivePostHogTracking';
import { ClickTracker } from '@/components/analytics/ClickTracker';
import HeroSection from '@/components/landing/HeroSection';
import StatsSection from '@/components/landing/StatsSection';
import FeatureCarousel from '@/components/landing/FeatureCarousel';
import ToolsShowcase from '@/components/landing/ToolsShowcase';
import FinalCTA from '@/components/landing/FinalCTA';

const Landing = () => {
  const { track, trackUserJourney } = useComprehensivePostHogTracking();

  useEffect(() => {
    // Enhanced landing page tracking with comprehensive context
    track('landing_page_loaded_comprehensive', {
      page: 'landing',
      load_timestamp: Date.now(),
      referrer: document.referrer,
      entry_method: document.referrer ? 'referral' : 'direct',
      page_load_time: performance.now(),
    });

    // Track landing page entry in user journey
    trackUserJourney('funnel_landing_page_entry', {
      entry_source: document.referrer || 'direct',
      landing_timestamp: Date.now(),
      user_agent: navigator.userAgent,
      viewport_size: `${window.innerWidth}x${window.innerHeight}`,
    });
  }, [track, trackUserJourney]);

  return (
    <div className="min-h-screen bg-background">
      <ClickTracker 
        trackingId="hero_section" 
        trackingData={{ section: 'hero', page: 'landing' }}
      >
        <HeroSection />
      </ClickTracker>
      
      <ClickTracker 
        trackingId="stats_section" 
        trackingData={{ section: 'stats', page: 'landing' }}
      >
        <StatsSection />
      </ClickTracker>
      
      <ClickTracker 
        trackingId="feature_carousel" 
        trackingData={{ section: 'features', page: 'landing' }}
      >
        <FeatureCarousel />
      </ClickTracker>
      
      <ClickTracker 
        trackingId="tools_showcase" 
        trackingData={{ section: 'tools', page: 'landing' }}
      >
        <ToolsShowcase />
      </ClickTracker>
      
      <ClickTracker 
        trackingId="final_cta" 
        trackingData={{ section: 'cta', page: 'landing' }}
      >
        <FinalCTA />
      </ClickTracker>
    </div>
  );
};

export default Landing;
