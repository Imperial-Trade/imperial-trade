import React from "react";

export function PhoneMockup({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative w-64 h-[520px] mx-auto ${className}`}>
      {/* Phone frame */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-gray-900 rounded-[2.5rem] shadow-2xl">
        {/* Screen */}
        <div className="absolute inset-[6px] bg-background rounded-[2rem] overflow-hidden">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-xl z-10" />
          {/* Content */}
          <div className="pt-8 h-full">
            {children}
          </div>
        </div>
        {/* Home indicator */}
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gray-600 rounded-full" />
      </div>
    </div>
  );
}

export function LaptopMockup({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative w-full max-w-4xl mx-auto ${className}`}>
      {/* Laptop base */}
      <div className="relative">
        {/* Screen */}
        <div className="relative bg-gradient-to-b from-gray-800 to-gray-900 rounded-t-xl p-3 shadow-2xl">
          {/* Camera */}
          <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-600 rounded-full" />
          {/* Screen content */}
          <div className="bg-background rounded-lg overflow-hidden aspect-[16/10]">
            {children}
          </div>
        </div>
        {/* Keyboard base */}
        <div className="h-8 bg-gradient-to-b from-gray-700 to-gray-800 rounded-b-2xl relative">
          {/* Trackpad */}
          <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-16 h-4 bg-gray-600 rounded opacity-50" />
        </div>
      </div>
    </div>
  );
}

export function TabletMockup({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative w-80 h-[500px] mx-auto ${className}`}>
      {/* Tablet frame */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl shadow-2xl">
        {/* Screen */}
        <div className="absolute inset-[8px] bg-background rounded-xl overflow-hidden">
          {children}
        </div>
        {/* Home button */}
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-gray-700 rounded-full border-2 border-gray-600" />
      </div>
    </div>
  );
}