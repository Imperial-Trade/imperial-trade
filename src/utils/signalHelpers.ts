
/**
 * Signal display and calculation utilities
 */

import { TradeAlertWithProfile } from '@/api/services/TradingApiService';

export interface SignalDisplayData {
  providerName: string;
  providerAvatar?: string;
  providerInitials: string;
  timeLabel: string;
  statusBadge: {
    variant: string;
    className: string;
    label: string;
  };
  tpProgress: {
    completed: number;
    total: number;
    percentage: number;
  };
}

export const getSignalDisplayData = (alert: TradeAlertWithProfile): SignalDisplayData => {
  // Provider information
  const providerName = alert.creator?.display_name || 'Unknown Provider';
  const providerAvatar = alert.creator?.avatar_url;
  const providerInitials = providerName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Time label
  const timeLabel = alert.status === 'active' && alert.activatedAt 
    ? `Active since ${new Date(alert.activatedAt).toLocaleTimeString()}`
    : `Posted at ${new Date(alert.createdAt).toLocaleTimeString()}`;

  // Status badge configuration
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          variant: 'outline',
          className: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
          label: 'Pending'
        };
      case 'active':
        return {
          variant: 'default',
          className: 'bg-green-500/10 text-green-600 border-green-500/20',
          label: 'Active'
        };
      case 'partially_profited':
        return {
          variant: 'default',
          className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
          label: 'Partial Profit'
        };
      case 'closed':
        return {
          variant: 'secondary',
          className: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
          label: 'Closed'
        };
      default:
        return {
          variant: 'outline',
          className: '',
          label: status
        };
    }
  };

  // TP Progress calculation
  const totalTPs = [alert.tp1, alert.tp2, alert.tp3, alert.tp4, alert.tp5].filter(Boolean).length;
  const completedTPs = alert.tpHits?.length || 0;
  const tpPercentage = totalTPs > 0 ? (completedTPs / totalTPs) * 100 : 0;

  return {
    providerName,
    providerAvatar,
    providerInitials,
    timeLabel,
    statusBadge: getStatusConfig(alert.status),
    tpProgress: {
      completed: completedTPs,
      total: totalTPs,
      percentage: tpPercentage
    }
  };
};

export const formatPriceDisplay = (price: number, precision: number = 4): string => {
  return `$${price.toFixed(precision)}`;
};

export const getTradeTypeIcon = (tradeType: string) => {
  return tradeType.startsWith('buy') ? 'trending-up' : 'trending-down';
};

export const calculateSignalAge = (createdAt: string, activatedAt?: string): {
  ageInMinutes: number;
  ageDisplay: string;
  isRecent: boolean;
} => {
  const relevantTime = activatedAt || createdAt;
  const now = new Date();
  const signalTime = new Date(relevantTime);
  const ageInMinutes = Math.floor((now.getTime() - signalTime.getTime()) / (1000 * 60));
  
  let ageDisplay: string;
  if (ageInMinutes < 1) {
    ageDisplay = 'Just now';
  } else if (ageInMinutes < 60) {
    ageDisplay = `${ageInMinutes}m ago`;
  } else if (ageInMinutes < 1440) {
    const hours = Math.floor(ageInMinutes / 60);
    ageDisplay = `${hours}h ago`;
  } else {
    const days = Math.floor(ageInMinutes / 1440);
    ageDisplay = `${days}d ago`;
  }

  return {
    ageInMinutes,
    ageDisplay,
    isRecent: ageInMinutes < 30 // Recent if less than 30 minutes
  };
};
