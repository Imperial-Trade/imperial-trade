import React from 'react';

interface KalcuLogoProps {
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}

export const KalcuLogo: React.FC<KalcuLogoProps> = ({ className = "", size = 24, style }) => {
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
        <linearGradient id="kalcuGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0891B2" />
          <stop offset="50%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
      
      {/* Calculator body */}
      <rect x="6" y="4" width="20" height="24" fill="url(#kalcuGradient)" rx="3" />
      <rect x="8" y="6" width="16" height="20" fill="#000" rx="2" />
      
      {/* Display screen */}
      <rect x="10" y="8" width="12" height="4" fill="url(#kalcuGradient)" rx="1" />
      
      {/* Calculator buttons grid */}
      <circle cx="12" cy="16" r="1.5" fill="url(#kalcuGradient)" opacity="0.8" />
      <circle cx="16" cy="16" r="1.5" fill="url(#kalcuGradient)" opacity="0.8" />
      <circle cx="20" cy="16" r="1.5" fill="url(#kalcuGradient)" opacity="0.8" />
      
      <circle cx="12" cy="20" r="1.5" fill="url(#kalcuGradient)" opacity="0.8" />
      <circle cx="16" cy="20" r="1.5" fill="url(#kalcuGradient)" opacity="0.8" />
      <circle cx="20" cy="20" r="1.5" fill="url(#kalcuGradient)" opacity="0.8" />
      
      <circle cx="12" cy="24" r="1.5" fill="url(#kalcuGradient)" opacity="0.8" />
      <circle cx="16" cy="24" r="1.5" fill="url(#kalcuGradient)" opacity="0.8" />
      <circle cx="20" cy="24" r="1.5" fill="url(#kalcuGradient)" opacity="0.8" />
      
      {/* Mathematical symbols on display */}
      <text x="11" y="11" fill="#000" fontSize="2" fontWeight="bold">%</text>
      <text x="15" y="11" fill="#000" fontSize="2" fontWeight="bold">$</text>
      <text x="19" y="11" fill="#000" fontSize="2" fontWeight="bold">=</text>
      
      {/* Edge calculation indicator */}
      <path
        d="M2 16 L6 16 M26 16 L30 16"
        stroke="url(#kalcuGradient)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
};