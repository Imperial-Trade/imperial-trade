import React, { useState, useEffect } from 'react';
import { EnhancedSignalCard } from '@/components/signals/EnhancedSignalCard';
import { SignalStreamStatus } from '@/components/signals/SignalStreamStatus';
import { useSignalRealtime } from '@/contexts/SignalRealtimeContext';
import { useToast } from "@/components/ui/use-toast"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TradeAlertWithProfile } from '@/api/services/TradingApiService';
import { SignalEngineDiagnostics } from '@/components/signals/SignalEngineDiagnostics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SignalStreamPage() {
  const { useSignalRealtime } = require('@/contexts/SignalRealtimeContext');
  const { signals, connectionStatus, subscribe, refreshSignals } = useSignalRealtime();
  const { toast } = useToast()
  const [assetFilter, setAssetFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    subscribe();
    refreshSignals();
  }, [subscribe, refreshSignals]);

  const filteredSignals = signals.filter(signal => {
    const assetMatch = !assetFilter || signal.assetName.toLowerCase().includes(assetFilter.toLowerCase());
    const typeMatch = !typeFilter || signal.tradeType.toLowerCase().includes(typeFilter.toLowerCase());
    const statusMatch = !statusFilter || signal.status.toLowerCase().includes(statusFilter.toLowerCase());
    return assetMatch && typeMatch && statusMatch;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Xeon Signal Stream</h1>
          <p className="text-muted-foreground">
            Real-time trading signals with advanced monitoring and diagnostics
          </p>
        </div>

        <Tabs defaultValue="signals" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="signals">Live Signals</TabsTrigger>
            <TabsTrigger value="diagnostics">Engine Health</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="signals" className="space-y-6">
            <SignalStreamStatus />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <Label htmlFor="asset-filter">Filter by Asset</Label>
                <Input
                  type="text"
                  id="asset-filter"
                  placeholder="e.g., EURUSD"
                  value={assetFilter}
                  onChange={(e) => setAssetFilter(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="type-filter">Filter by Type</Label>
                <Select onValueChange={setTypeFilter}>
                  <SelectTrigger id="type-filter">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    <SelectItem value="buy">Buy</SelectItem>
                    <SelectItem value="sell">Sell</SelectItem>
                    <SelectItem value="buy_limit">Buy Limit</SelectItem>
                    <SelectItem value="sell_limit">Sell Limit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status-filter">Filter by Status</Label>
                <Select onValueChange={setStatusFilter}>
                  <SelectTrigger id="status-filter">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="partially_profited">Partially Profited</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSignals.map((alert: TradeAlertWithProfile) => (
                <EnhancedSignalCard key={alert.id} alert={alert} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="diagnostics">
            <SignalEngineDiagnostics />
          </TabsContent>

          <TabsContent value="analytics">
            <div className="text-center py-12">
              <p className="text-muted-foreground">Analytics dashboard coming soon...</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
