import React from 'react';

export const MagnifyingSearchEmptyState: React.FC = () => {
  return (
    <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
      <svg className="w-10 h-10" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Document background */}
        <path 
          d="M38 12H10C8.89543 12 8 12.8954 8 14V38C8 39.1046 8.89543 40 10 40H38C39.1046 40 40 39.1046 40 38V14C40 12.8954 39.1046 12 38 12Z" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className="text-muted-foreground/50"
        />
        
        {/* Content lines */}
        <path 
          d="M16 22H26M16 28H32" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          className="text-muted-foreground/30"
        />
        
        {/* Search highlight (clipped to document) */}
        <g clipPath="url(#clipDocSearch)">
          <rect 
            x="24" 
            y="12" 
            width="20" 
            height="28" 
            fill="#64748b" 
            opacity="0.15"
            style={{
              animation: 'sweep-highlight 4s ease-in-out infinite'
            }}
          />
        </g>

        {/* Magnifying glass */}
        <g style={{ animation: 'sweep-search 4s ease-in-out infinite' }}>
          <circle cx="24" cy="24" r="9" stroke="currentColor" strokeWidth="2.5" className="text-slate-400"/>
          <path d="M31 31L36 36" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-slate-400"/>
        </g>

        {/* Clip path definition */}
        <defs>
          <clipPath id="clipDocSearch">
            <path d="M38 12H10C8.89543 12 8 12.8954 8 14V38C8 39.1046 8.89543 40 10 40H38C39.1046 40 40 39.1046 40 38V14C40 12.8954 39.1046 12 38 12Z"/>
          </clipPath>
        </defs>
      </svg>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes sweep-search {
            0%, 100% { transform: translate(-8px, -8px) rotate(-15deg); }
            50% { transform: translate(8px, 8px) rotate(15deg); }
          }

          @keyframes sweep-highlight {
            0%, 100% { transform: translateX(-80%); }
            50% { transform: translateX(80%); }
          }
        `
      }} />
    </div>
  );
};
