import React from 'react';

interface XeonLogoProps {
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}

export const XeonLogo: React.FC<XeonLogoProps> = ({ className = "", size = 24, style }) => {
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
        <linearGradient id="xeonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="50%" stopColor="#1D4ED8" />
          <stop offset="100%" stopColor="#1E40AF" />
        </linearGradient>
      </defs>
      
      {/* Signal wave pattern */}
      <path
        d="M4 16 L8 12 L12 20 L16 8 L20 24 L24 10 L28 18"
        stroke="url(#xeonGradient)"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Signal dots */}
      <circle cx="8" cy="12" r="2" fill="url(#xeonGradient)" />
      <circle cx="16" cy="8" r="2" fill="url(#xeonGradient)" />
      <circle cx="24" cy="10" r="2" fill="url(#xeonGradient)" />
      
      {/* X pattern overlay */}
      <path
        d="M6 6 L26 26 M26 6 L6 26"
        stroke="url(#xeonGradient)"
        strokeWidth="1.5"
        opacity="0.3"
        strokeLinecap="round"
      />
    </svg>
  );
};