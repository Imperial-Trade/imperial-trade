import React from 'react';
import MarketTickerBar from './MarketTickerBar';
import { neonColors } from './neonTheme';

// Green/black abstract organic texture background
const bgImageUrl = 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?q=80&w=2029&auto=format&fit=crop';

interface SessionTimelineProps {
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
}

const SessionTimeline: React.FC<SessionTimelineProps> = ({ selectedSymbol, onSelectSymbol }) => {
  return (
    <div
      className="relative flex items-center gap-2 px-3 py-2 rounded-xl overflow-hidden"
      style={{
        border: `1px solid ${neonColors.neonGreen}20`,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      }}
    >
      {/* Background Image Layer */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${bgImageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.3,
        }}
      />
      {/* Glassmorphism Overlay */}
      <div
        className="absolute inset-0 z-[1]"
        style={{
          background: 'rgba(10, 15, 13, 0.75)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      />
      {/* Market Ticker - Compact inline */}
      <div className="flex-1 relative z-[2]">
        <MarketTickerBar selectedSymbol={selectedSymbol} onSelectSymbol={onSelectSymbol} compact />
      </div>
    </div>
  );
};

export default SessionTimeline;
