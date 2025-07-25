import React from 'react';

interface JournalXxLogoProps {
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}

export const JournalXxLogo: React.FC<JournalXxLogoProps> = ({ className = "", size = 24, style }) => {
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
        <linearGradient id="journalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EA580C" />
          <stop offset="50%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#FB923C" />
        </linearGradient>
      </defs>
      
      {/* Journal book */}
      <rect x="6" y="4" width="20" height="24" fill="url(#journalGradient)" rx="2" />
      <rect x="8" y="6" width="16" height="20" fill="#FFF" rx="1" />
      
      {/* Journal binding */}
      <rect x="6" y="4" width="3" height="24" fill="url(#journalGradient)" rx="1" />
      
      {/* Pages/lines */}
      <line x1="11" y1="10" x2="21" y2="10" stroke="#CCC" strokeWidth="0.5" />
      <line x1="11" y1="13" x2="19" y2="13" stroke="#CCC" strokeWidth="0.5" />
      <line x1="11" y1="16" x2="21" y2="16" stroke="#CCC" strokeWidth="0.5" />
      <line x1="11" y1="19" x2="17" y2="19" stroke="#CCC" strokeWidth="0.5" />
      <line x1="11" y1="22" x2="20" y2="22" stroke="#CCC" strokeWidth="0.5" />
      
      {/* Data visualization elements */}
      <rect x="12" y="14" width="2" height="3" fill="url(#journalGradient)" opacity="0.6" />
      <rect x="15" y="12" width="2" height="5" fill="url(#journalGradient)" opacity="0.6" />
      <rect x="18" y="15" width="2" height="2" fill="url(#journalGradient)" opacity="0.6" />
      
      {/* XX pattern overlay */}
      <path
        d="M20 8 L24 12 M24 8 L20 12"
        stroke="url(#journalGradient)"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.7"
      />
      
      {/* Performance arrow */}
      <path
        d="M26 18 L28 16 L26 14"
        stroke="url(#journalGradient)"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};