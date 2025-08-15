import React from 'react';
import { Bell, Zap, TrendingUp, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface NotificationExplainerProps {
  className?: string;
}

export const NotificationExplainer: React.FC<NotificationExplainerProps> = ({ className = "" }) => {
  return (
    <Card className={`border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5 ${className}`}>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Enable Push Notifications</h3>
            <p className="text-sm text-muted-foreground">
              Stay ahead of the market with instant alerts
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4 text-yellow-500" />
            <span className="text-muted-foreground">Live trading signals</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-muted-foreground">Take-profit hits</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-blue-500" />
            <span className="text-muted-foreground">Risk alerts</span>
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
          <strong>For all roles:</strong> Members, Educators, and Admins can receive notifications on desktop browsers, iOS Safari (including PWA), Chrome, and Android devices.
        </div>
      </CardContent>
    </Card>
  );
};