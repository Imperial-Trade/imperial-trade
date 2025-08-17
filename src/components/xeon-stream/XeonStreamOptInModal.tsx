import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, TrendingUp, DollarSign, Clock, Shield } from 'lucide-react';
import { useXeonStream } from '@/contexts/XeonStreamContext';
import { detectSafariPWA } from '@/utils/deviceDetection';

export const XeonStreamOptInModal: React.FC = () => {
  const { 
    showOptInModal, 
    setShowOptInModal, 
    subscribeToXeonStream, 
    isLoading 
  } = useXeonStream();

  const isSafariPWA = detectSafariPWA();

  const handleActivate = async () => {
    const result = await subscribeToXeonStream();
    if (result.success) {
      setShowOptInModal(false);
    }
  };

  const handleLater = () => {
    setShowOptInModal(false);
  };

  if (!showOptInModal) return null;

  return (
    <Dialog open={showOptInModal} onOpenChange={setShowOptInModal}>
      <DialogContent className="max-w-md mx-auto bg-gradient-to-b from-background via-background to-muted/20 border-primary/20">
        <DialogHeader className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-primary to-primary/80 rounded-full flex items-center justify-center">
            <Bell className="w-8 h-8 text-primary-foreground" />
          </div>
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Activate Xeon Stream Alerts
          </DialogTitle>
          <p className="text-muted-foreground text-sm">
            Get instant notifications for critical trading signals and never miss a profitable opportunity.
          </p>
        </DialogHeader>

        <div className="space-y-3 my-6">
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
            <CardContent className="p-3 flex items-center space-x-3">
              <TrendingUp className="w-5 h-5 text-primary flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">Signal Alerts</p>
                <p className="text-xs text-muted-foreground">New trading opportunities</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-accent/20 bg-gradient-to-r from-accent/5 to-transparent">
            <CardContent className="p-3 flex items-center space-x-3">
              <DollarSign className="w-5 h-5 text-accent flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">TP/SL Hits</p>
                <p className="text-xs text-muted-foreground">Take profit & stop loss updates</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-secondary/20 bg-gradient-to-r from-secondary/5 to-transparent">
            <CardContent className="p-3 flex items-center space-x-3">
              <Clock className="w-5 h-5 text-secondary flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">Real-time Updates</p>
                <p className="text-xs text-muted-foreground">Instant signal modifications</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-muted/20">
            <CardContent className="p-3 flex items-center space-x-3">
              <Shield className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">Privacy Protected</p>
                <p className="text-xs text-muted-foreground">No spam, unsubscribe anytime</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {isSafariPWA && (
          <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg mb-4">
            <p className="text-xs text-warning font-medium">
              Safari PWA: Notifications will appear as banners. Make sure notifications are enabled in Safari settings.
            </p>
          </div>
        )}

        <div className="flex flex-col space-y-2">
          <Button 
            onClick={handleActivate}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-primary-foreground font-semibold"
          >
            {isLoading ? 'Activating...' : 'Activate Xeon Stream Alerts'}
          </Button>
          
          <Button 
            variant="ghost" 
            onClick={handleLater}
            disabled={isLoading}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};