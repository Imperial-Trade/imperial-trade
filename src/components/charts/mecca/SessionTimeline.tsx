import React, { useState, useEffect } from 'react';
import { neonColors, sessionColors } from './neonTheme';

// Green/black abstract organic texture background
const bgImageUrl = 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?q=80&w=2029&auto=format&fit=crop';

interface Session {
  id: string;
  name: string;
  shortName: string;
  startHour: number; // UTC
  endHour: number; // UTC
  color: { bg: string; glow: string };
}

const SESSIONS: Session[] = [
  { id: 'sydney', name: 'Sydney', shortName: 'SYD', startHour: 21, endHour: 6, color: sessionColors.sydney },
  { id: 'tokyo', name: 'Tokyo', shortName: 'TKY', startHour: 23, endHour: 8, color: sessionColors.tokyo },
  { id: 'london', name: 'London', shortName: 'LDN', startHour: 7, endHour: 16, color: sessionColors.london },
  { id: 'newyork', name: 'New York', shortName: 'NYC', startHour: 12, endHour: 21, color: sessionColors.newYork },
];

const SessionTimeline: React.FC = () => {
  const [currentHour, setCurrentHour] = useState(new Date().getUTCHours());
  const [activeSessions, setActiveSessions] = useState<string[]>([]);

  useEffect(() => {
    const updateSessions = () => {
      const hour = new Date().getUTCHours();
      setCurrentHour(hour);

      const active = SESSIONS.filter((session) => {
        if (session.startHour < session.endHour) {
          return hour >= session.startHour && hour < session.endHour;
        } else {
          // Overnight session (e.g., Sydney 21:00-06:00)
          return hour >= session.startHour || hour < session.endHour;
        }
      }).map((s) => s.id);

      setActiveSessions(active);
    };

    updateSessions();
    const interval = setInterval(updateSessions, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const isActive = (sessionId: string) => activeSessions.includes(sessionId);

  return (
    <div
      className="relative flex items-center justify-between gap-2 px-3 md:px-4 py-2 md:py-3 rounded-xl overflow-x-auto scrollbar-hide overflow-hidden"
      style={{
        border: `1px solid ${neonColors.neonGreen}20`,
        boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 0 20px ${neonColors.neonGreenGlow}`,
      }}
    >
      {/* Background Image Layer */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${bgImageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.3,
        }}
      />
      {/* Glassmorphism Overlay */}
      <div
        className="absolute inset-0 z-[1]"
        style={{
          background: 'rgba(10, 15, 13, 0.75)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      />
      {/* Label - hidden on very small screens */}
      <div className="hidden sm:flex items-center gap-2 shrink-0 relative z-[2]">
        <span className="text-xs font-medium" style={{ color: neonColors.textDim }}>
          Sessions
        </span>
      </div>

      {/* Session Pills */}
      <div className="flex items-center gap-1.5 md:gap-2 flex-1 justify-center sm:justify-start relative z-[2]">
        {SESSIONS.map((session) => {
          const active = isActive(session.id);
          return (
            <div
              key={session.id}
              className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-full transition-all duration-300 shrink-0"
              style={{
                background: active ? `${session.color.bg}20` : 'transparent',
                border: `1px solid ${active ? session.color.bg : neonColors.borderDefault}`,
                boxShadow: active ? `0 0 12px ${session.color.glow}` : 'none',
              }}
            >
              {/* Status dot */}
              <div
                className={`w-1.5 h-1.5 rounded-full ${active ? 'animate-pulse' : ''}`}
                style={{
                  background: active ? session.color.bg : neonColors.textDim,
                }}
              />
              {/* Session name */}
              <span
                className="text-[10px] md:text-xs font-medium"
                style={{
                  color: active ? session.color.bg : neonColors.textDim,
                }}
              >
                {session.shortName}
              </span>
            </div>
          );
        })}
      </div>

      {/* Current UTC time */}
      <div className="hidden sm:flex items-center gap-1 shrink-0 relative z-[2]">
        <span className="text-[10px] md:text-xs font-mono" style={{ color: neonColors.textMuted }}>
          {currentHour.toString().padStart(2, '0')}:00 UTC
        </span>
      </div>
    </div>
  );
};

export default SessionTimeline;
