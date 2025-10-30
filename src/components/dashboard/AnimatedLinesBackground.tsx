import React, { useMemo } from 'react';
import { useTheme } from '@/contexts/SafeThemeProvider';
import { useIsMobile, useIsTablet } from '@/hooks/use-mobile';

export const AnimatedLinesBackground: React.FC = () => {
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDark = theme === 'dark';

  // Adaptive line count: 6 mobile, 8 tablet, 10 desktop
  const lineCount = useMemo(() => {
    if (isMobile) return 6;
    if (isTablet) return 8;
    return 10;
  }, [isMobile, isTablet]);

  // Dark mode: Monochrome grayscale / Light mode: Vibrant colors
  const colorPalette = isDark 
    ? [
        'rgba(255, 255, 255, 0.8)',
        'rgba(220, 220, 220, 0.7)',
        'rgba(200, 200, 200, 0.7)',
        'rgba(180, 180, 180, 0.6)',
        'rgba(160, 160, 160, 0.6)',
        'rgba(140, 140, 140, 0.5)',
        'rgba(120, 120, 120, 0.5)',
        'rgba(100, 100, 100, 0.4)',
        'rgba(80, 80, 80, 0.4)',
        'rgba(60, 60, 60, 0.3)',
      ]
    : [
        '#FF4500',
        '#32CD32',
        '#1E90FF',
        '#FFD700',
        '#8A2BE2',
        '#20B2AA',
        '#DC143C',
        '#00FA9A',
        '#FF1493',
        '#00BFFF',
      ];

  const selectedColors = colorPalette.slice(0, lineCount);

  return (
    <>
      <style>{`
        .animated-lines-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .lines-wrapper {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 100%;
          margin: auto;
          width: 90vw;
          max-width: 1600px;
          display: flex;
          justify-content: space-between;
        }

        .animated-line {
          position: relative;
          width: 1px;
          height: 100%;
          overflow: hidden;
          flex-shrink: 0;
        }

        .animated-line::after {
          content: '';
          display: block;
          position: absolute;
          height: 15vh;
          width: 100%;
          top: -50%;
          left: 0;
          will-change: transform;
          animation: line-drop 7s infinite cubic-bezier(0.4, 0.26, 0, 0.97);
        }

        @media (max-width: 640px) {
          .animated-line::after {
            animation-duration: 8s;
            height: 12vh;
          }
        }

        @keyframes line-drop {
          0% {
            top: -50%;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            top: 110%;
            opacity: 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .animated-line::after {
            animation: none;
          }
        }
      `}</style>

      <div 
        className="fixed inset-0 z-0 transition-colors duration-300"
        style={{ 
          backgroundColor: isDark ? '#111' : '#ffffff'
        }}
      />

      <div className="animated-lines-container">
        <div className="lines-wrapper">
          {selectedColors.map((color, index) => (
            <div 
              key={`line-${index}`} 
              className="animated-line"
            >
              <style>{`
                .animated-line:nth-child(${index + 1})::after {
                  background: linear-gradient(
                    to bottom,
                    transparent 0%,
                    ${color} 75%,
                    ${color} 100%
                  );
                  animation-delay: ${(index + 1) * 0.6}s;
                }
              `}</style>
            </div>
          ))}
        </div>
      </div>

      <div 
        className="fixed inset-0 z-10 transition-colors duration-300 pointer-events-none"
        style={{
          backgroundColor: isDark 
            ? 'rgba(0, 0, 0, 0.5)' 
            : 'rgba(255, 255, 255, 0.3)',
          backdropFilter: 'blur(1px)',
        }}
      />
    </>
  );
};
