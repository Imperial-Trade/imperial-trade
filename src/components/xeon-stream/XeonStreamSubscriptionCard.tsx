import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, Zap, Shield, TrendingUp } from 'lucide-react';
import { useXeonStream } from '@/contexts/XeonStreamContext';
import { useAuth } from '@/contexts/AuthContext';

export const XeonStreamSubscriptionCard: React.FC = () => {
  const { user, profile } = useAuth();
  const { 
    isSubscribed, 
    canSubscribe, 
    isLoading, 
    subscribeToXeonStream, 
    unsubscribeFromXeonStream 
  } = useXeonStream();

  const handleToggleSubscription = async () => {
    if (isSubscribed) {
      await unsubscribeFromXeonStream();
    } else {
      await subscribeToXeonStream();
    }
  };

  if (!user || !profile) return null;

  return (
    <Card className="bg-gradient-to-br from-primary/5 via-background to-accent/5 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-gradient-to-r from-primary to-primary/80">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">Xeon Stream Alerts</CardTitle>
              <p className="text-sm text-muted-foreground">Professional trading notifications</p>
            </div>
          </div>
          <Badge 
            variant={isSubscribed ? "default" : "secondary"}
            className={isSubscribed ? "bg-primary text-primary-foreground" : ""}
          >
            {isSubscribed ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center space-x-3">
            {isSubscribed ? (
              <Bell className="w-5 h-5 text-primary" />
            ) : (
              <BellOff className="w-5 h-5 text-muted-foreground" />
            )}
            <div>
              <p className="font-medium">Real-time Notifications</p>
              <p className="text-sm text-muted-foreground">
                {isSubscribed ? "You'll receive instant alerts" : "Enable to get notifications"}
              </p>
            </div>
          </div>
          <Switch
            checked={isSubscribed}
            onCheckedChange={handleToggleSubscription}
            disabled={!canSubscribe || isLoading}
          />
        </div>

        {isSubscribed && (
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
              <TrendingUp className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Signal Alerts</p>
                <p className="text-xs text-muted-foreground">New trading opportunities</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-accent/5 border border-accent/10">
              <Shield className="w-4 h-4 text-accent" />
              <div>
                <p className="text-sm font-medium">TP/SL Updates</p>
                <p className="text-xs text-muted-foreground">Take profit & stop loss hits</p>
              </div>
            </div>
          </div>
        )}

        {!canSubscribe && (
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
            <p className="text-sm text-warning font-medium">
              {!user ? "Please log in to activate Xeon Stream alerts" :
               !profile ? "Loading profile..." :
               "Please enable browser notifications first"}
            </p>
          </div>
        )}

        {canSubscribe && !isSubscribed && (
          <Button 
            onClick={subscribeToXeonStream}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80"
          >
            {isLoading ? 'Activating...' : 'Activate Xeon Stream'}
          </Button>
        )}

        <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
          <Shield className="w-3 h-3" />
          <span>Privacy protected • No spam • Unsubscribe anytime</span>
        </div>
      </CardContent>
    </Card>
  );
};