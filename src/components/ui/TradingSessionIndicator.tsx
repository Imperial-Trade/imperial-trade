import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

const TRADING_SESSIONS = {
  SYDNEY: { name: 'Sydney Session', utcStart: 22, utcEnd: 7 },
  TOKYO: { name: 'Tokyo Session', utcStart: 0, utcEnd: 9 },
  LONDON: { name: 'London Session', utcStart: 8, utcEnd: 17 },
  NEW_YORK: { name: 'New York Session', utcStart: 13, utcEnd: 22 },
};

const getCurrentTradingSession = () => {
  const now = new Date();
  const utcHour = now.getUTCHours();
  
  // Check each session (order matters for overlaps)
  if (utcHour >= TRADING_SESSIONS.NEW_YORK.utcStart && utcHour < TRADING_SESSIONS.NEW_YORK.utcEnd) {
    return TRADING_SESSIONS.NEW_YORK.name;
  }
  if (utcHour >= TRADING_SESSIONS.LONDON.utcStart && utcHour < TRADING_SESSIONS.LONDON.utcEnd) {
    return TRADING_SESSIONS.LONDON.name;
  }
  if (utcHour >= TRADING_SESSIONS.TOKYO.utcStart && utcHour < TRADING_SESSIONS.TOKYO.utcEnd) {
    return TRADING_SESSIONS.TOKYO.name;
  }
  if (utcHour >= TRADING_SESSIONS.SYDNEY.utcStart || utcHour < TRADING_SESSIONS.SYDNEY.utcEnd) {
    return TRADING_SESSIONS.SYDNEY.name;
  }
  
  return 'Market Closed';
};

const formatCurrentTime = () => {
  return new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

const AnalogClock = ({ size = 40 }: { size?: number }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const hours = time.getHours() % 12;
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();

  const hourAngle = (hours * 30) + (minutes * 0.5);
  const minuteAngle = minutes * 6;
  const secondAngle = seconds * 6;

  return (
    <svg width={size} height={size} className="text-foreground">
      <circle
        cx={size/2}
        cy={size/2}
        r={size/2 - 2}
        fill="currentColor"
        fillOpacity="0.1"
        stroke="currentColor"
        strokeWidth="2"
      />
      
      {/* Hour markers */}
      {[...Array(12)].map((_, i) => {
        const angle = i * 30;
        const x1 = size/2 + (size/2 - 8) * Math.cos((angle - 90) * Math.PI / 180);
        const y1 = size/2 + (size/2 - 8) * Math.sin((angle - 90) * Math.PI / 180);
        const x2 = size/2 + (size/2 - 4) * Math.cos((angle - 90) * Math.PI / 180);
        const y2 = size/2 + (size/2 - 4) * Math.sin((angle - 90) * Math.PI / 180);
        
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="currentColor"
            strokeWidth="1"
          />
        );
      })}

      {/* Hour hand */}
      <line
        x1={size/2}
        y1={size/2}
        x2={size/2 + (size/4) * Math.cos((hourAngle - 90) * Math.PI / 180)}
        y2={size/2 + (size/4) * Math.sin((hourAngle - 90) * Math.PI / 180)}
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Minute hand */}
      <line
        x1={size/2}
        y1={size/2}
        x2={size/2 + (size/3) * Math.cos((minuteAngle - 90) * Math.PI / 180)}
        y2={size/2 + (size/3) * Math.sin((minuteAngle - 90) * Math.PI / 180)}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Center dot */}
      <circle cx={size/2} cy={size/2} r="2" fill="currentColor" />
    </svg>
  );
};

export function TradingSessionIndicator() {
  const [currentSession, setCurrentSession] = useState(getCurrentTradingSession());
  const [currentTime, setCurrentTime] = useState(formatCurrentTime());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSession(getCurrentTradingSession());
      setCurrentTime(formatCurrentTime());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-lg p-3 border border-white/20 dark:border-white/10 mb-3 relative">
      {/* Analog clock in upper right corner */}
      <div className="absolute top-2 right-2">
        <AnalogClock size={32} />
      </div>
      
      <div className="flex items-center gap-2 pr-10">
        <Clock className="w-4 h-4 text-foreground/60" />
        <div className="flex flex-col">
          <span className="text-xs font-mono text-foreground/80">Current time</span>
          <span className="text-sm font-medium text-foreground">{currentTime} - {currentSession}</span>
        </div>
      </div>
    </div>
  );
}