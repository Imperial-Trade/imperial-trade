import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useOrderTriggerMonitor } from '@/hooks/useOrderTriggerMonitor';
import { useAuth } from '@/contexts/AuthContext';
import { Play, Activity, Clock } from 'lucide-react';

export const OrderMonitorPanel = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { triggerOrderMonitor } = useOrderTriggerMonitor(user?.id);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const runMonitor = async () => {
    setIsRunning(true);
    try {
      const success = await triggerOrderMonitor();
      if (success) {
        setLastRun(new Date());
      }
    } finally {
      setIsRunning(false);
    }
  };

  // Auto-run monitor every 30 seconds (for demo purposes)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isRunning) {
        runMonitor();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [isRunning]);

  return (
    <Card className="border-dashed border-2 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Activity className="h-4 w-4" />
          Order Monitor System
          <Badge variant="outline" className="bg-green-500/10 text-green-600">
            Auto-Active
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs text-muted-foreground">
          Automatically monitors limit orders and triggers when conditions are met.
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            <span className="text-xs">
              {lastRun ? `Last run: ${lastRun.toLocaleTimeString()}` : 'Not run yet'}
            </span>
          </div>
          
          <Button
            size="sm"
            variant="outline"
            onClick={runMonitor}
            disabled={isRunning}
            className="h-7 text-xs"
          >
            <Play className="h-3 w-3 mr-1" />
            {isRunning ? 'Running...' : 'Run Now'}
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground">
          ✓ Monitors buy/sell limit orders<br/>
          ✓ Auto-triggers based on live prices<br/>
          ✓ Real-time notifications
        </div>
      </CardContent>
    </Card>
  );
};