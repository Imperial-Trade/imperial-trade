import React from 'react';

interface OrderflowLogoProps {
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}

export const OrderflowLogo: React.FC<OrderflowLogoProps> = ({ className = "", size = 24, style }) => {
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
        <linearGradient id="orderflowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="50%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#C084FC" />
        </linearGradient>
      </defs>
      
      {/* Community hub center */}
      <circle cx="16" cy="16" r="4" fill="url(#orderflowGradient)" />
      
      {/* Connecting nodes */}
      <circle cx="8" cy="8" r="2.5" fill="url(#orderflowGradient)" opacity="0.8" />
      <circle cx="24" cy="8" r="2.5" fill="url(#orderflowGradient)" opacity="0.8" />
      <circle cx="8" cy="24" r="2.5" fill="url(#orderflowGradient)" opacity="0.8" />
      <circle cx="24" cy="24" r="2.5" fill="url(#orderflowGradient)" opacity="0.8" />
      
      {/* Connection lines */}
      <path
        d="M10.5 10.5 L13.5 13.5"
        stroke="url(#orderflowGradient)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M21.5 10.5 L18.5 13.5"
        stroke="url(#orderflowGradient)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M10.5 21.5 L13.5 18.5"
        stroke="url(#orderflowGradient)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M21.5 21.5 L18.5 18.5"
        stroke="url(#orderflowGradient)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      
      {/* Flow arrows */}
      <path
        d="M4 16 L12 16 M26 4 L26 12 M28 16 L20 16 M6 4 L6 12"
        stroke="url(#orderflowGradient)"
        strokeWidth="1.5"
        opacity="0.6"
        strokeLinecap="round"
        fill="none"
      />
      
      {/* Arrow heads */}
      <path d="M11 14 L12 16 L11 18" stroke="url(#orderflowGradient)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M21 14 L20 16 L21 18" stroke="url(#orderflowGradient)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
};