import React, { useState, useEffect } from 'react';
import { Activity, Wifi, WifiOff, Clock } from 'lucide-react';
import { neonColors, neonTextGlow } from './neonTheme';

// Green/black abstract organic texture background
const bgImageUrl = 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?q=80&w=2029&auto=format&fit=crop';

interface MeccaHeaderProps {
  isConnected?: boolean;
}

const MeccaHeader: React.FC<MeccaHeaderProps> = ({ isConnected = true }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeSession, setActiveSession] = useState<string>('');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      setActiveSession(getActiveSession(now));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getActiveSession = (date: Date): string => {
    const utcHour = date.getUTCHours();
    // Sydney: 21:00-06:00 UTC | Tokyo: 23:00-08:00 UTC | London: 07:00-16:00 UTC | NY: 12:00-21:00 UTC
    if (utcHour >= 7 && utcHour < 16) return 'London';
    if (utcHour >= 12 && utcHour < 21) return 'New York';
    if (utcHour >= 23 || utcHour < 8) return 'Tokyo';
    if (utcHour >= 21 || utcHour < 6) return 'Sydney';
    return 'Market Closed';
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <header
      className="w-full px-4 py-3 flex items-center justify-between relative overflow-hidden"
      style={{
        borderBottom: `1px solid ${neonColors.neonGreen}20`,
        boxShadow: `0 4px 20px rgba(0, 0, 0, 0.3), 0 0 15px ${neonColors.neonGreenGlow}`,
      }}
    >
      {/* Background Image Layer */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${bgImageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.25,
        }}
      />
      {/* Glassmorphism Overlay */}
      <div
        className="absolute inset-0 z-[1]"
        style={{
          background: 'rgba(10, 15, 13, 0.8)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      />
      {/* Logo & Branding */}
      <div className="flex items-center gap-3 relative z-[2]">
        <div
          className="relative w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${neonColors.neonGreen} 0%, ${neonColors.neonGreenDark} 100%)`,
            boxShadow: `0 0 20px ${neonColors.neonGreenGlow}`,
          }}
        >
          <Activity className="w-5 h-5 text-black" />
          <div
            className="absolute inset-0 rounded-xl animate-ping"
            style={{
              background: neonColors.neonGreen,
              opacity: 0.2,
              animationDuration: '2s',
            }}
          />
        </div>
        <div>
          <h1
            className="text-xl font-bold tracking-wider"
            style={{
              color: neonColors.textPrimary,
              ...neonTextGlow,
            }}
          >
            MECCA <span style={{ color: neonColors.neonGreen }}>XX</span>
          </h1>
          <p className="text-xs" style={{ color: neonColors.textMuted }}>
            Trading Analysis Hub
          </p>
        </div>
      </div>

      {/* Center - Session Indicator */}
      <div className="hidden md:flex items-center gap-6">
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full"
          style={{
            background: neonColors.neonGreenSubtle,
            border: `1px solid ${neonColors.borderDefault}`,
          }}
        >
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: neonColors.neonGreen }}
          />
          <span className="text-sm font-medium" style={{ color: neonColors.neonGreenLight }}>
            {activeSession} Session
          </span>
        </div>
      </div>

      {/* Right - Time & Status */}
      <div className="flex items-center gap-4 relative z-[2]">
        {/* Live Clock */}
        <div className="hidden sm:flex flex-col items-end">
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3" style={{ color: neonColors.textMuted }} />
            <span
              className="text-sm font-mono font-bold"
              style={{ color: neonColors.textPrimary }}
            >
              {formatTime(currentTime)}
            </span>
            <span className="text-xs" style={{ color: neonColors.textMuted }}>
              UTC
            </span>
          </div>
          <span className="text-xs" style={{ color: neonColors.textDim }}>
            {formatDate(currentTime)}
          </span>
        </div>

        {/* Connection Status */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
          style={{
            background: isConnected ? neonColors.neonGreenSubtle : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${isConnected ? neonColors.borderDefault : 'rgba(239, 68, 68, 0.3)'}`,
          }}
        >
          {isConnected ? (
            <>
              <Wifi className="w-4 h-4" style={{ color: neonColors.neonGreen }} />
              <span className="text-xs font-medium hidden sm:inline" style={{ color: neonColors.neonGreen }}>
                Live
              </span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4" style={{ color: neonColors.negative }} />
              <span className="text-xs font-medium hidden sm:inline" style={{ color: neonColors.negative }}>
                Offline
              </span>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default MeccaHeader;
