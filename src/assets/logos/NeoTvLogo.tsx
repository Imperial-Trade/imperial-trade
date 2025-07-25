import React from 'react';

interface NeoTvLogoProps {
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}

export const NeoTvLogo: React.FC<NeoTvLogoProps> = ({ className = "", size = 24, style }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="neoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#DC2626" />
          <stop offset="50%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#F87171" />
        </linearGradient>
        <linearGradient id="neoAccent" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#FFA500" />
        </linearGradient>
      </defs>
      
      {/* TV Screen */}
      <rect x="3" y="6" width="26" height="18" fill="url(#neoGradient)" rx="3" />
      <rect x="5" y="8" width="22" height="14" fill="#000" rx="1" />
      
      {/* Live indicator */}
      <circle cx="8" cy="11" r="2" fill="url(#neoAccent)" />
      <text x="12" y="13" fill="url(#neoAccent)" fontSize="4" fontWeight="bold">LIVE</text>
      
      {/* Signal waves on screen */}
      <path
        d="M10 15 L14 13 L18 17 L22 14 L26 16"
        stroke="url(#neoAccent)"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      
      {/* TV stand */}
      <rect x="14" y="24" width="4" height="3" fill="url(#neoGradient)" rx="1" />
      <rect x="10" y="27" width="12" height="2" fill="url(#neoGradient)" rx="1" />
      
      {/* Neo pattern */}
      <circle cx="24" cy="12" r="1" fill="url(#neoAccent)" opacity="0.7" />
      <circle cx="24" cy="16" r="1" fill="url(#neoAccent)" opacity="0.7" />
      <circle cx="24" cy="20" r="1" fill="url(#neoAccent)" opacity="0.7" />
    </svg>
  );
};