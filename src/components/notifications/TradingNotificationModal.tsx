
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, Smartphone, TrendingUp, AlertTriangle } from 'lucide-react';
import { useOneSignalEnhanced } from '@/hooks/useOneSignalEnhanced';
import { detectSafariPWA } from '@/utils/deviceDetection';

interface TradingNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationEnabled?: () => void;
}

export function TradingNotificationModal({ 
  isOpen, 
  onClose, 
  onNotificationEnabled 
}: TradingNotificationModalProps) {
  const { requestPermission } = useOneSignalEnhanced();
  const [isLoading, setIsLoading] = useState(false);
  const isSafariPWA = detectSafariPWA();

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    try {
      const result = await requestPermission();
      if (result.success) {
        onNotificationEnabled?.();
        onClose();
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLater = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Bell className="h-6 w-6 text-primary" />
            Enable Trading Alerts
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Stay ahead of the markets with instant notifications for:
          </p>
          
          <div className="grid gap-3">
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="font-medium">New Trading Signals</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Get notified instantly when new opportunities are posted
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-green-600" />
                  <span className="font-medium">Take Profit & Stop Loss Alerts</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Never miss important price movements on your trades
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Signal Updates</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Stay informed about changes to active signals
                </p>
              </CardContent>
            </Card>
          </div>

          {isSafariPWA && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                <strong>Safari PWA:</strong> After clicking "Enable", you may need to manually allow notifications in your device settings if prompted.
              </p>
            </div>
          )}
          
          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={handleLater}
              className="flex-1"
            >
              Maybe Later
            </Button>
            <Button 
              onClick={handleEnableNotifications}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? 'Setting up...' : 'Enable Alerts'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
