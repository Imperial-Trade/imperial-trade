import React from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CostMonitorDashboard from '@/components/monitoring/CostMonitorDashboard';
import { WebSocketHealthMonitor } from '@/components/testing/WebSocketHealthMonitor';
import WebSocketDiagnostics from '@/components/debug/WebSocketDiagnostics';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';
import { DollarSign, Activity, Settings } from 'lucide-react';

export default function CostMonitoringPage() {
  const { connectionStatus } = useOptimizedWebSocketPrices();

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cost Monitoring</h1>
          <p className="text-muted-foreground">
            Track Realtime message usage and optimize operational costs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            connectionStatus === 'connected' ? 'bg-success' : 
            connectionStatus === 'connecting' ? 'bg-warning' : 'bg-destructive'
          }`} />
          <span className="text-sm text-muted-foreground capitalize">
            {connectionStatus}
          </span>
        </div>
      </div>

      <Tabs defaultValue="cost" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cost" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Cost Tracking
          </TabsTrigger>
          <TabsTrigger value="health" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            System Health
          </TabsTrigger>
          <TabsTrigger value="diagnostics" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Diagnostics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cost" className="space-y-4">
          <CostMonitorDashboard />
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">WebSocket Health Monitor</h3>
            <WebSocketHealthMonitor />
          </Card>
        </TabsContent>

        <TabsContent value="diagnostics" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Connection Diagnostics</h3>
            <WebSocketDiagnostics symbols={['XAUUSD', 'BTCUSD']} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}