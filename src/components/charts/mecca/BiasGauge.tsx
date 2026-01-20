import React from 'react';
import { neonColors } from './neonTheme';

interface BiasGaugeProps {
  bias: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
}

const BiasGauge: React.FC<BiasGaugeProps> = ({ bias, confidence }) => {
  // Convert bias to angle: -90 (bearish) to 90 (bullish), 0 is neutral
  const getAngle = () => {
    if (bias === 'bullish') return 45 + (confidence / 100) * 45; // 45 to 90
    if (bias === 'bearish') return -45 - (confidence / 100) * 45; // -45 to -90
    return 0; // neutral
  };

  const angle = getAngle();
  
  const getBiasColor = () => {
    if (bias === 'bullish') return neonColors.positive;
    if (bias === 'bearish') return neonColors.negative;
    return neonColors.neutral;
  };

  const biasColor = getBiasColor();

  return (
    <div className="flex flex-col items-center">
      {/* Gauge */}
      <div className="relative w-full max-w-[180px] aspect-[2/1]">
        {/* Background Arc */}
        <svg viewBox="0 0 200 100" className="w-full h-full">
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={neonColors.negative} stopOpacity="0.3" />
              <stop offset="50%" stopColor={neonColors.neutral} stopOpacity="0.3" />
              <stop offset="100%" stopColor={neonColors.positive} stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="activeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={neonColors.negative} />
              <stop offset="50%" stopColor={neonColors.neutral} />
              <stop offset="100%" stopColor={neonColors.positive} />
            </linearGradient>
          </defs>
          
          {/* Background arc */}
          <path
            d="M 20 90 A 80 80 0 0 1 180 90"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          
          {/* Tick marks */}
          {[-75, -45, 0, 45, 75].map((tickAngle, i) => {
            const rad = (tickAngle - 90) * (Math.PI / 180);
            const x1 = 100 + 65 * Math.cos(rad);
            const y1 = 90 + 65 * Math.sin(rad);
            const x2 = 100 + 75 * Math.cos(rad);
            const y2 = 90 + 75 * Math.sin(rad);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={neonColors.textDim}
                strokeWidth="2"
              />
            );
          })}
          
          {/* Labels */}
          <text x="30" y="95" fill={neonColors.negative} fontSize="10" fontWeight="600">
            SELL
          </text>
          <text x="155" y="95" fill={neonColors.positive} fontSize="10" fontWeight="600">
            BUY
          </text>
        </svg>

        {/* Needle */}
        <div
          className="absolute bottom-0 left-1/2 origin-bottom transition-transform duration-700 ease-out"
          style={{
            width: '4px',
            height: '60px',
            background: `linear-gradient(to top, ${biasColor}, transparent)`,
            borderRadius: '2px',
            transform: `translateX(-50%) rotate(${angle}deg)`,
            boxShadow: `0 0 10px ${biasColor}`,
          }}
        >
          {/* Needle head */}
          <div
            className="absolute -top-1 left-1/2 w-3 h-3 rounded-full"
            style={{
              transform: 'translateX(-50%)',
              background: biasColor,
              boxShadow: `0 0 15px ${biasColor}`,
            }}
          />
        </div>

        {/* Center pivot */}
        <div
          className="absolute bottom-0 left-1/2 w-4 h-4 rounded-full"
          style={{
            transform: 'translate(-50%, 50%)',
            background: neonColors.bgSecondary,
            border: `2px solid ${neonColors.borderActive}`,
          }}
        />
      </div>

      {/* Bias Label */}
      <div className="mt-4 text-center">
        <span
          className="text-lg font-bold uppercase tracking-wider"
          style={{ 
            color: biasColor,
            textShadow: `0 0 10px ${biasColor}40`,
          }}
        >
          {bias}
        </span>
      </div>
    </div>
  );
};

export default BiasGauge;
