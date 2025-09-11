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
  
  // Market status display removed 
  return null;
};

const formatCurrentTime = () => {
  return new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
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
    <div className="bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-lg p-3 border border-white/20 dark:border-white/10 mb-3">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-foreground/60" />
        <div className="flex flex-col">
          <span className="text-xs font-mono text-foreground/80">Current time</span>
          <span className="text-sm font-medium text-foreground">{currentTime} - {currentSession}</span>
        </div>
      </div>
    </div>
  );
}