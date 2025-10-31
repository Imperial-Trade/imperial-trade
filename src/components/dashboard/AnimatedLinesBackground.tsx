import React from 'react';
import { useTheme } from '@/contexts/SafeThemeProvider';

export const AnimatedLinesBackground: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <>
      {/* Video Background Layer */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover z-0"
        style={{ 
          filter: isDark 
            ? 'brightness(0.4) contrast(1.1)' 
            : 'brightness(0.7) contrast(1.05)'
        }}
      >
        <source src="/videos/space-particles.mp4" type="video/mp4" />
      </video>

      {/* Noisy Blur Overlay */}
      <div 
        className="fixed inset-0 z-10 pointer-events-none transition-all duration-300"
        style={{
          backgroundColor: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.3)',
          backdropFilter: 'blur(2px)',
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.15'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Additional Gradient Overlay for Depth */}
      <div 
        className="fixed inset-0 z-20 pointer-events-none"
        style={{
          background: isDark
            ? 'linear-gradient(to bottom, rgba(11, 11, 43, 0.3) 0%, rgba(27, 39, 53, 0.2) 50%, rgba(9, 10, 15, 0.4) 100%)'
            : 'linear-gradient(to bottom, rgba(224, 242, 255, 0.2) 0%, rgba(186, 230, 253, 0.15) 50%, rgba(125, 211, 252, 0.25) 100%)'
        }}
      />

      {/* Accessibility: Hide video for reduced motion */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          video {
            display: none;
          }
        }
      `}</style>
    </>
  );
};
