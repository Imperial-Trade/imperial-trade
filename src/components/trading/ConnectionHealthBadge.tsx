
import React from 'react';
import { useWebSocketHealth } from '@/hooks/useWebSocketHealth';
import { Wifi, WifiOff, Zap, AlertTriangle } from 'lucide-react';

interface ConnectionHealthBadgeProps {
  className?: string;
  showDetails?: boolean;
}

export const ConnectionHealthBadge: React.FC<ConnectionHealthBadgeProps> = ({
  className = '',
  showDetails = false
}) => {
  const {
    isHealthy,
    averageLatency,
    connectionUptime,
    missedPings,
    actualFrequency
  } = useWebSocketHealth();

  const getHealthStatus = () => {
    if (!isHealthy) {
      return {
        icon: WifiOff,
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30',
        text: 'Offline'
      };
    }
    
    if (actualFrequency <= 300 && connectionUptime >= 95) {
      return {
        icon: Zap,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/30',
        text: 'Ultra-Fast'
      };
    }
    
    if (actualFrequency <= 500 && connectionUptime >= 90) {
      return {
        icon: Wifi,
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/30',
        text: 'Good'
      };
    }
    
    return {
      icon: AlertTriangle,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
      text: 'Degraded'
    };
  };

  const status = getHealthStatus();
  const Icon = status.icon;

  if (!showDetails) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border ${status.bgColor} ${status.borderColor} ${className}`}>
        <Icon className={`w-3 h-3 ${status.color}`} />
        <span className={`text-xs font-medium ${status.color}`}>
          {status.text}
        </span>
        {actualFrequency > 0 && (
          <span className={`text-xs ${status.color} opacity-75`}>
            {actualFrequency}ms
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`${status.bgColor} ${status.borderColor} border rounded-lg p-3 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${status.color}`} />
          <span className={`text-sm font-medium ${status.color}`}>
            Connection Health
          </span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${status.bgColor} ${status.borderColor} border ${status.color}`}>
          {status.text}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-gray-400">Target Frequency</div>
          <div className="text-white font-mono">250ms</div>
        </div>
        <div>
          <div className="text-gray-400">Actual Frequency</div>
          <div className={`font-mono ${actualFrequency <= 300 ? 'text-emerald-400' : actualFrequency <= 500 ? 'text-green-400' : 'text-yellow-400'}`}>
            {actualFrequency > 0 ? `${actualFrequency}ms` : '--'}
          </div>
        </div>
        <div>
          <div className="text-gray-400">Uptime</div>
          <div className={`font-mono ${connectionUptime >= 95 ? 'text-emerald-400' : connectionUptime >= 90 ? 'text-green-400' : 'text-yellow-400'}`}>
            {connectionUptime}%
          </div>
        </div>
        <div>
          <div className="text-gray-400">Missed Pings</div>
          <div className={`font-mono ${missedPings === 0 ? 'text-emerald-400' : missedPings < 5 ? 'text-green-400' : 'text-yellow-400'}`}>
            {missedPings}
          </div>
        </div>
      </div>
      
      {averageLatency > 0 && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Avg Latency</span>
            <span className={`font-mono ${averageLatency < 50 ? 'text-emerald-400' : averageLatency < 100 ? 'text-green-400' : 'text-yellow-400'}`}>
              ±{averageLatency}ms
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
