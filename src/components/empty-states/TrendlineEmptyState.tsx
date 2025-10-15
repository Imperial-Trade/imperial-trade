import React from 'react';

export const TrendlineEmptyState: React.FC = () => {
  return (
    <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
      <svg className="w-10 h-10" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Y-axis */}
        <path 
          d="M8 40V8" 
          stroke="currentColor" 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          className="text-muted-foreground/30"
        />
        
        {/* X-axis */}
        <path 
          d="M4 36H44" 
          stroke="currentColor" 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          className="text-muted-foreground/30"
        />

        {/* Animated trendline */}
        <path 
          d="M8 36L16 28L24 30L32 20L40 18" 
          stroke="#0ea5e9" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          style={{
            strokeDasharray: '200',
            strokeDashoffset: '200',
            animation: 'draw-trendline 4s ease-in-out infinite'
          }}
        />
        
        {/* Tracing dot */}
        <g style={{ 
          offsetPath: 'path("M8 36L16 28L24 30L32 20L40 18")',
          animation: 'trace-path 4s ease-in-out infinite',
          opacity: 0
        }}>
          <circle r="5" fill="#38bdf8" fillOpacity="0.5"/>
          <circle r="3" fill="white"/>
        </g>
      </svg>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes draw-trendline {
            0% { stroke-dashoffset: 200; }
            50%, 100% { stroke-dashoffset: 0; }
          }

          @keyframes trace-path {
            0% { offset-distance: 0%; opacity: 0; }
            10% { opacity: 1; }
            50% { offset-distance: 100%; opacity: 1; }
            60%, 100% { offset-distance: 100%; opacity: 0; }
          }
        `
      }} />
    </div>
  );
};
