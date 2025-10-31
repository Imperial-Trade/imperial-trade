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

      {/* Glassmorphism Layer */}
      <div 
        className="fixed inset-0 z-10 pointer-events-none transition-all duration-300"
        style={{
          background: isDark 
            ? 'rgba(0, 0, 0, 0.85)' 
            : 'rgba(255, 255, 255, 0.75)',
          backdropFilter: 'blur(0px)',
          WebkitBackdropFilter: 'blur(0px)',
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
