
import React from 'react';
import { SignalsFeed } from './SignalsFeed';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Target, Clock, Activity } from 'lucide-react';

export const DashboardSignalsView: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Quick Stats Header */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-sm text-muted-foreground">Market Status</div>
                <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
                  Live
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-sm text-muted-foreground">Active Traders</div>
                <div className="text-lg font-semibold">12</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-600" />
              <div>
                <div className="text-sm text-muted-foreground">Signals Today</div>
                <div className="text-lg font-semibold">24</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <div className="text-sm text-muted-foreground">Avg Response</div>
                <div className="text-lg font-semibold">1.2s</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Signals Feed */}
      <SignalsFeed />
    </div>
  );
};
