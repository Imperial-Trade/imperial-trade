import React from 'react';

interface ImperialAcademyLogoProps {
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}

export const ImperialAcademyLogo: React.FC<ImperialAcademyLogoProps> = ({ className = "", size = 24, style }) => {
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
        <linearGradient id="academyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="50%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#34D399" />
        </linearGradient>
      </defs>
      
      {/* Academy building base */}
      <rect x="4" y="20" width="24" height="8" fill="url(#academyGradient)" rx="1" />
      
      {/* Columns */}
      <rect x="7" y="12" width="2" height="8" fill="url(#academyGradient)" />
      <rect x="11" y="12" width="2" height="8" fill="url(#academyGradient)" />
      <rect x="15" y="12" width="2" height="8" fill="url(#academyGradient)" />
      <rect x="19" y="12" width="2" height="8" fill="url(#academyGradient)" />
      <rect x="23" y="12" width="2" height="8" fill="url(#academyGradient)" />
      
      {/* Triangular roof */}
      <path
        d="M2 12 L16 4 L30 12 L26 12 L16 6 L6 12 Z"
        fill="url(#academyGradient)"
      />
      
      {/* Crown detail */}
      <circle cx="16" cy="8" r="1.5" fill="#FFD700" />
      <path
        d="M14 8 L16 6 L18 8"
        stroke="#FFD700"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
};