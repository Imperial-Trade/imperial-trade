
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface RealtimeConnectionStatusProps {
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastUpdated: Date | null;
  onRefresh: () => void;
  signalCount: number;
}

export const RealtimeConnectionStatus: React.FC<RealtimeConnectionStatusProps> = ({
  connectionStatus,
  lastUpdated,
  onRefresh,
  signalCount
}) => {
  const getStatusConfig = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: Wifi,
          color: 'bg-green-500/20 text-green-400 border-green-500/30',
          text: 'Live',
          pulseColor: 'border-green-500'
        };
      case 'connecting':
        return {
          icon: RefreshCw,
          color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
          text: 'Connecting',
          pulseColor: 'border-yellow-500'
        };
      case 'error':
        return {
          icon: AlertCircle,
          color: 'bg-red-500/20 text-red-400 border-red-500/30',
          text: 'Error',
          pulseColor: 'border-red-500'
        };
      default:
        return {
          icon: WifiOff,
          color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
          text: 'Offline',
          pulseColor: 'border-gray-500'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;
  
  const formatLastUpdated = () => {
    if (!lastUpdated) return 'Never';
    const now = new Date();
    const diff = now.getTime() - lastUpdated.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return lastUpdated.toLocaleTimeString();
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-black/20 rounded-lg border border-gray-800/50">
      <div className="relative">
        <Badge className={`${config.color} px-3 py-1`}>
          <Icon className={`w-3 h-3 mr-2 ${connectionStatus === 'connecting' ? 'animate-spin' : ''}`} />
          {config.text}
        </Badge>
        {connectionStatus === 'connected' && (
          <motion.div
            className={`absolute inset-0 rounded-full border-2 ${config.pulseColor}`}
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </div>
      
      <div className="flex flex-col text-xs">
        <span className="text-white font-medium">{signalCount} Signals</span>
        <span className="text-gray-400">Updated {formatLastUpdated()}</span>
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onRefresh}
        className="text-gray-400 hover:text-white hover:bg-white/10"
      >
        <RefreshCw className="w-4 h-4" />
      </Button>
    </div>
  );
};
