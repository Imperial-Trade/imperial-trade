/**
 * Player ID Status Indicator - Phase 4: Real-time Verification
 * Provides real-time feedback on Player ID capture status for iOS PWA users
 */

import React from "react";
import { usePlayerIdVerification } from "@/hooks/usePlayerIdVerification";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Clock, RefreshCw, Smartphone } from "lucide-react";
import { toast } from "sonner";

interface PlayerIdStatusIndicatorProps {
  showForced?: boolean;
  className?: string;
}

export default function PlayerIdStatusIndicator({ 
  showForced = false, 
  className = "" 
}: PlayerIdStatusIndicatorProps) {
  const { user } = useAuth();
  const { 
    hasValidPlayerId, 
    verificationStatus, 
    isVerifying, 
    isIOSPWA, 
    retryCount,
    forceRecapture 
  } = usePlayerIdVerification();

  // Only show for iOS PWA users or when forced
  if (!showForced && !isIOSPWA) return null;
  if (!user) return null;

  const handleForceRecapture = () => {
    toast.info("Forcing Player ID recapture...");
    forceRecapture();
  };

  const getStatusInfo = () => {
    switch (verificationStatus) {
      case 'valid':
        return {
          icon: <CheckCircle className="h-4 w-4 text-green-500" />,
          label: "Player ID Valid",
          variant: "default" as const,
          description: "Push notifications are properly configured"
        };
      
      case 'missing':
      case 'force_capture':
        return {
          icon: <AlertTriangle className="h-4 w-4 text-orange-500" />,
          label: `Missing Player ID ${retryCount > 0 ? `(Retry ${retryCount})` : ''}`,
          variant: "secondary" as const,
          description: "Player ID capture is required for push notifications"
        };
      
      case 'checking':
        return {
          icon: <Clock className="h-4 w-4 text-blue-500" />,
          label: "Checking Player ID",
          variant: "outline" as const,
          description: "Verifying notification configuration..."
        };
      
      case 'error':
        return {
          icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
          label: "Player ID Error",
          variant: "destructive" as const,
          description: "Failed to capture Player ID"
        };
      
      default:
        return {
          icon: <Clock className="h-4 w-4 text-gray-500" />,
          label: "Initializing",
          variant: "outline" as const,
          description: "Setting up notification system..."
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {statusInfo.icon}
          <Badge variant={statusInfo.variant}>
            {statusInfo.label}
          </Badge>
          {isIOSPWA && (
            <Badge variant="outline">
              <Smartphone className="h-3 w-3 mr-1" />
              iOS PWA
            </Badge>
          )}
        </div>
        
        {(verificationStatus === 'missing' || verificationStatus === 'error') && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleForceRecapture}
            disabled={isVerifying}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isVerifying ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground">
        {statusInfo.description}
      </p>
      
      {verificationStatus === 'force_capture' && (
        <div className="text-xs text-blue-600 dark:text-blue-400">
          Attempting aggressive Player ID capture...
        </div>
      )}
    </div>
  );
}