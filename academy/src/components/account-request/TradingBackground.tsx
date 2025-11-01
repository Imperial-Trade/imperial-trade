import React from 'react';

export const TradingBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 via-teal-500/30 to-cyan-600/40"></div>
      
      {/* Animated Trading Charts */}
      <div className="absolute inset-0">
        {/* Candlestick patterns */}
        <div className="absolute top-20 left-10 w-4 h-32 bg-emerald-400/30 rounded-sm animate-pulse"></div>
        <div className="absolute top-40 left-20 w-4 h-24 bg-emerald-500/40 rounded-sm animate-pulse delay-100"></div>
        <div className="absolute top-60 left-32 w-4 h-40 bg-emerald-300/35 rounded-sm animate-pulse delay-200"></div>
        <div className="absolute top-80 left-44 w-4 h-28 bg-emerald-600/45 rounded-sm animate-pulse delay-300"></div>
        
        {/* Additional candlesticks on the right */}
        <div className="absolute top-32 right-20 w-4 h-36 bg-teal-400/30 rounded-sm animate-pulse delay-500"></div>
        <div className="absolute top-52 right-32 w-4 h-20 bg-teal-500/40 rounded-sm animate-pulse delay-600"></div>
        <div className="absolute top-72 right-44 w-4 h-44 bg-teal-300/35 rounded-sm animate-pulse delay-700"></div>
        
        {/* Chart lines */}
        <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 800 600">
          <path
            d="M50 400 Q200 300 350 350 T650 250"
            stroke="url(#chartGradient)"
            strokeWidth="3"
            fill="none"
            className="animate-pulse"
          />
          <path
            d="M50 450 Q200 380 350 400 T650 320"
            stroke="url(#chartGradient2)"
            strokeWidth="2"
            fill="none"
            className="animate-pulse delay-300"
          />
          <defs>
            <linearGradient id="chartGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8"/>
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.3"/>
            </linearGradient>
            <linearGradient id="chartGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.6"/>
              <stop offset="100%" stopColor="#0891b2" stopOpacity="0.2"/>
            </linearGradient>
          </defs>
        </svg>
        
        {/* Floating elements */}
        <div className="absolute top-1/4 left-1/3 w-2 h-2 bg-emerald-400/60 rounded-full animate-ping"></div>
        <div className="absolute top-1/2 right-1/4 w-3 h-3 bg-teal-400/50 rounded-full animate-ping delay-1000"></div>
        <div className="absolute bottom-1/3 left-1/4 w-2 h-2 bg-cyan-400/60 rounded-full animate-ping delay-2000"></div>
      </div>
      
      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-5">
        <div className="w-full h-full" style={{
          backgroundImage: `linear-gradient(rgba(16, 185, 129, 0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(16, 185, 129, 0.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}></div>
      </div>
    </div>
  );
};