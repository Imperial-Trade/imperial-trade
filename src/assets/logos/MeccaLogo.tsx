import React from 'react';

interface MeccaLogoProps {
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}

export const MeccaLogo: React.FC<MeccaLogoProps> = ({ className = "", size = 24, style }) => {
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
        <linearGradient id="meccaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7C2D92" />
          <stop offset="50%" stopColor="#9333EA" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>
        <linearGradient id="meccaAccent" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#FFA500" />
        </linearGradient>
      </defs>
      
      {/* AI Brain core */}
      <circle cx="16" cy="16" r="8" fill="url(#meccaGradient)" opacity="0.8" />
      <circle cx="16" cy="16" r="5" fill="url(#meccaAccent)" opacity="0.3" />
      
      {/* Neural network nodes */}
      <circle cx="10" cy="10" r="1.5" fill="url(#meccaGradient)" />
      <circle cx="22" cy="10" r="1.5" fill="url(#meccaGradient)" />
      <circle cx="6" cy="16" r="1.5" fill="url(#meccaGradient)" />
      <circle cx="26" cy="16" r="1.5" fill="url(#meccaGradient)" />
      <circle cx="10" cy="22" r="1.5" fill="url(#meccaGradient)" />
      <circle cx="22" cy="22" r="1.5" fill="url(#meccaGradient)" />
      
      {/* Neural connections */}
      <path d="M10 10 L13 13" stroke="url(#meccaGradient)" strokeWidth="1" opacity="0.6" />
      <path d="M22 10 L19 13" stroke="url(#meccaGradient)" strokeWidth="1" opacity="0.6" />
      <path d="M6 16 L11 16" stroke="url(#meccaGradient)" strokeWidth="1" opacity="0.6" />
      <path d="M26 16 L21 16" stroke="url(#meccaGradient)" strokeWidth="1" opacity="0.6" />
      <path d="M10 22 L13 19" stroke="url(#meccaGradient)" strokeWidth="1" opacity="0.6" />
      <path d="M22 22 L19 19" stroke="url(#meccaGradient)" strokeWidth="1" opacity="0.6" />
      
      {/* Central processing indicator */}
      <circle cx="16" cy="16" r="2" fill="url(#meccaAccent)" />
      
      {/* Data flow pulses */}
      <circle cx="16" cy="8" r="1" fill="url(#meccaAccent)" opacity="0.7" />
      <circle cx="24" cy="16" r="1" fill="url(#meccaAccent)" opacity="0.7" />
      <circle cx="16" cy="24" r="1" fill="url(#meccaAccent)" opacity="0.7" />
      <circle cx="8" cy="16" r="1" fill="url(#meccaAccent)" opacity="0.7" />
      
      {/* Processing waves */}
      <path
        d="M2 16 Q6 12, 10 16 Q14 20, 18 16 Q22 12, 26 16 Q30 20, 34 16"
        stroke="url(#meccaAccent)"
        strokeWidth="1"
        fill="none"
        opacity="0.4"
      />
    </svg>
  );
};