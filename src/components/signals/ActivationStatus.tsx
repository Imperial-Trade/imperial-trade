import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Clock, Zap } from 'lucide-react';
import { TradeAlertData } from '@/types/components';

interface ActivationStatusProps {
  alert: TradeAlertData;
  currentPrice?: number;
  onActivationDetected?: (signalId: string) => void;
}

export const ActivationStatus: React.FC<ActivationStatusProps> = ({
  alert,
  currentPrice,
  onActivationDetected
}) => {
  const [activationState, setActivationState] = useState<'pending' | 'detected' | 'processing' | 'active'>('pending');
  const [showActivationFeedback, setShowActivationFeedback] = useState(false);

  const isLimitOrder = alert.trade_type === 'buy_limit' || alert.trade_type === 'sell_limit';
  const isPending = alert.status === 'pending';

  // Check activation conditions
  const shouldActivate = React.useMemo(() => {
    if (!isLimitOrder || !isPending || !currentPrice) return false;
    
    if (alert.trade_type === 'buy_limit') {
      return currentPrice <= alert.entry_price;
    } else if (alert.trade_type === 'sell_limit') {
      return currentPrice >= alert.entry_price;
    }
    return false;
  }, [isLimitOrder, isPending, currentPrice, alert.trade_type, alert.entry_price]);

  // Handle activation detection
  useEffect(() => {
    if (shouldActivate && activationState === 'pending') {
      console.log(`🎯 ACTIVATION DETECTED: ${alert.asset_name} should activate (Price: ${currentPrice}, Entry: ${alert.entry_price})`);
      setActivationState('detected');
      setShowActivationFeedback(true);
      
      // Notify parent component
      if (onActivationDetected) {
        onActivationDetected(alert.id);
      }
      
      // Auto-hide feedback after 3 seconds
      setTimeout(() => setShowActivationFeedback(false), 3000);
    }
  }, [shouldActivate, activationState, alert.id, alert.asset_name, currentPrice, alert.entry_price, onActivationDetected]);

  // Listen for real-time activation confirmations
  useEffect(() => {
    const handleActivationConfirmed = (event: any) => {
      if (event.detail?.signalId === alert.id) {
        console.log(`✅ ACTIVATION CONFIRMED: ${alert.asset_name} activation confirmed by server`);
        setActivationState('active');
        setShowActivationFeedback(true);
        setTimeout(() => setShowActivationFeedback(false), 2000);
      }
    };

    window.addEventListener('order-activation-confirmed', handleActivationConfirmed);
    window.addEventListener('order-activated', handleActivationConfirmed);
    
    return () => {
      window.removeEventListener('order-activation-confirmed', handleActivationConfirmed);
      window.removeEventListener('order-activated', handleActivationConfirmed);
    };
  }, [alert.id, alert.asset_name]);

  // Update state based on alert status changes
  useEffect(() => {
    if (alert.status === 'active' && activationState !== 'active') {
      setActivationState('active');
    } else if (alert.status === 'pending') {
      setActivationState('pending');
    }
  }, [alert.status, activationState]);

  if (!isLimitOrder) return null;

  const getStatusDisplay = () => {
    switch (activationState) {
      case 'detected':
        return {
          icon: AlertTriangle,
          label: 'Activation Detected',
          variant: 'secondary' as const,
          className: 'text-amber-400 animate-pulse'
        };
      case 'processing':
        return {
          icon: Clock,
          label: 'Processing...',
          variant: 'secondary' as const,
          className: 'text-blue-400'
        };
      case 'active':
        return {
          icon: CheckCircle,
          label: 'ACTIVE',
          variant: 'default' as const,
          className: 'text-green-400'
        };
      default:
        if (shouldActivate) {
          return {
            icon: Zap,
            label: 'Ready to Activate',
            variant: 'secondary' as const,
            className: 'text-yellow-400'
          };
        }
        return {
          icon: Clock,
          label: 'Pending',
          variant: 'outline' as const,
          className: 'text-muted-foreground'
        };
    }
  };

  const statusDisplay = getStatusDisplay();
  const StatusIcon = statusDisplay.icon;

  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant={statusDisplay.variant}
        className={`flex items-center gap-1 ${statusDisplay.className} ${
          showActivationFeedback ? 'ring-2 ring-primary/50' : ''
        }`}
      >
        <StatusIcon className="w-3 h-3" />
        {statusDisplay.label}
      </Badge>
      
      {shouldActivate && currentPrice && (
        <div className="text-xs text-muted-foreground">
          Price: {currentPrice.toFixed(5)} / Entry: {alert.entry_price.toFixed(5)}
        </div>
      )}
    </div>
  );
};