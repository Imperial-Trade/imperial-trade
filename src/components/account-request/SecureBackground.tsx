import React from 'react';
import { Lock } from 'lucide-react';

export const SecureBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-purple-600 via-purple-500 to-blue-500">
      {/* Circuit board pattern overlay */}
      <div className="absolute inset-0 opacity-20">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="circuit" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
              <circle cx="25" cy="25" r="2" fill="white" opacity="0.5"/>
              <circle cx="75" cy="75" r="2" fill="white" opacity="0.5"/>
              <line x1="25" y1="25" x2="75" y2="25" stroke="white" strokeWidth="0.5" opacity="0.3"/>
              <line x1="75" y1="25" x2="75" y2="75" stroke="white" strokeWidth="0.5" opacity="0.3"/>
              <line x1="25" y1="25" x2="25" y2="75" stroke="white" strokeWidth="0.5" opacity="0.3"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#circuit)"/>
        </svg>
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>

      {/* Content overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-4 sm:px-6 text-center">
        {/* Lock Icon with glowing effect */}
        <div className="mb-8 relative">
          <div className="absolute inset-0 bg-white/30 blur-3xl rounded-full"></div>
          <div className="relative bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl">
            <Lock className="w-24 h-24 text-white drop-shadow-2xl" strokeWidth={1.5} />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-4 drop-shadow-2xl">
          Secure & Seamless
          <br />
          Trading
        </h1>

        {/* Subtitle */}
        <p className="text-xl sm:text-2xl text-white/90 max-w-lg drop-shadow-lg">
          Join today and take control of your financial future
        </p>

        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-3 h-3 bg-white/40 rounded-full animate-ping"></div>
        <div className="absolute bottom-32 right-20 w-2 h-2 bg-white/30 rounded-full animate-ping delay-1000"></div>
        <div className="absolute top-1/3 right-10 w-2 h-2 bg-white/30 rounded-full animate-pulse"></div>
      </div>

      {/* Copyright */}
      <div className="absolute bottom-6 right-6 text-xs text-white/70">
        © Copyright 2025 Imperial. All Rights Reserved
      </div>
    </div>
  );
};
