/**
 * Notification Recovery Button - One-click fix for OneSignal issues
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  RefreshCw, 
  CheckCircle, 
  Zap,
  Bell,
  Loader2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOneSignalRecovery } from '@/hooks/useOneSignalRecovery';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationRecoveryButtonProps {
  variant?: 'default' | 'outline' | 'minimal';
  size?: 'sm' | 'md' | 'lg';
  showStatus?: boolean;
  onSuccess?: () => void;
}

export const NotificationRecoveryButton: React.FC<NotificationRecoveryButtonProps> = ({
  variant = 'default',
  size = 'md',
  showStatus = true,
  onSuccess
}) => {
  const { profile } = useAuth();
  const { 
    isRecovering, 
    recoveryStage, 
    needsRecovery, 
    startRecovery, 
    canRetry, 
    lastError,
    subscriptionActive
  } = useOneSignalRecovery();

  const handleRecovery = async () => {
    const result = await startRecovery();
    if (result.success && onSuccess) {
      onSuccess();
    }
  };

  const getStatusInfo = () => {
    if (subscriptionActive) {
      return {
        icon: <CheckCircle className="w-4 h-4" />,
        text: 'Alerts Active',
        color: 'bg-emerald-500',
        variant: 'secondary' as const
      };
    }

    if (isRecovering) {
      const stageTexts = {
        initializing: 'Initializing...',
        subscribing: 'Subscribing...',
        verifying: 'Verifying...',
        complete: 'Complete!',
        failed: 'Failed',
        idle: 'Ready'
      };

      return {
        icon: <Loader2 className="w-4 h-4 animate-spin" />,
        text: stageTexts[recoveryStage],
        color: 'bg-primary',
        variant: 'default' as const
      };
    }

    if (needsRecovery) {
      return {
        icon: <AlertTriangle className="w-4 h-4" />,
        text: 'Setup Required',
        color: 'bg-red-500',
        variant: 'destructive' as const
      };
    }

    return {
      icon: <Bell className="w-4 h-4" />,
      text: 'Unknown Status',
      color: 'bg-gray-500',
      variant: 'secondary' as const
    };
  };

  const statusInfo = getStatusInfo();

  if (!needsRecovery && subscriptionActive) {
    return showStatus ? (
      <div className="flex items-center space-x-2">
        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Trading Alerts Active
        </Badge>
      </div>
    ) : null;
  }

  const buttonSizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  if (variant === 'minimal') {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRecovery}
        disabled={isRecovering}
        className="h-auto p-2"
      >
        {isRecovering ? (
          <Loader2 className={`${iconSizes[size]} animate-spin`} />
        ) : (
          <RefreshCw className={iconSizes[size]} />
        )}
      </Button>
    );
  }

  return (
    <div className="flex items-center space-x-3">
      <AnimatePresence mode="wait">
        <motion.div
          key={recoveryStage}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
        >
          <Button
            variant={variant}
            onClick={handleRecovery}
            disabled={isRecovering}
            className={`${buttonSizes[size]} ${
              needsRecovery && !isRecovering 
                ? 'bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white border-0' 
                : ''
            }`}
          >
            <div className="flex items-center space-x-2">
              {isRecovering ? (
                <Loader2 className={`${iconSizes[size]} animate-spin`} />
              ) : needsRecovery ? (
                <Zap className={iconSizes[size]} />
              ) : (
                <RefreshCw className={iconSizes[size]} />
              )}
              
              <span>
                {isRecovering 
                  ? `Setting up... (${recoveryStage})`
                  : needsRecovery 
                    ? 'Enable Trading Alerts'
                    : 'Refresh Alerts'
                }
              </span>
            </div>
          </Button>
        </motion.div>
      </AnimatePresence>

      {showStatus && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
          >
            <Badge variant={statusInfo.variant} className="flex items-center space-x-1">
              {statusInfo.icon}
              <span>{statusInfo.text}</span>
            </Badge>
          </motion.div>
        </AnimatePresence>
      )}

      {lastError && canRetry && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-red-500 max-w-48 truncate"
          title={lastError}
        >
          {lastError}
        </motion.div>
      )}
    </div>
  );
};