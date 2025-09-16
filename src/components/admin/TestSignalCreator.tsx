import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TestTube, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface TestSignalData {
  assetName: string;
  tradeType: 'buy' | 'sell' | 'buy_limit' | 'sell_limit';
  entryPrice: string;
  stopLoss: string;
  tp1: string;
  tp2: string;
  tp3: string;
  notes: string;
}

export const TestSignalCreator: React.FC = () => {
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [signalData, setSignalData] = useState<TestSignalData>({
    assetName: 'EURUSD',
    tradeType: 'buy',
    entryPrice: '1.0950',
    stopLoss: '1.0900',
    tp1: '1.1000',
    tp2: '1.1050',
    tp3: '1.1100',
    notes: 'TEST SIGNAL - Please ignore this automated test'
  });

  const createTestSignal = async () => {
    if (!user) return;

    setIsCreating(true);
    const startTime = Date.now();

    try {
      console.log('🧪 Creating test signal...');
      
      // Create test signal
      const { data: signal, error: signalError } = await supabase
        .from('trade_alerts')
        .insert({
          user_id: user.id,
          asset_name: `[TEST] ${signalData.assetName}`,
          trade_type: signalData.tradeType,
          entry_price: parseFloat(signalData.entryPrice),
          stop_loss: parseFloat(signalData.stopLoss),
          tp1: parseFloat(signalData.tp1),
          tp2: signalData.tp2 ? parseFloat(signalData.tp2) : null,
          tp3: signalData.tp3 ? parseFloat(signalData.tp3) : null,
          tradermade_symbol: signalData.assetName,
          status: 'active',
          notes: `${signalData.notes} - Created at ${new Date().toISOString()}`,
          is_test_signal: true
        })
        .select()
        .single();

      if (signalError) throw signalError;

      const notificationTime = Date.now();
      console.log('✅ Test signal created:', signal);

      // Wait a moment for notifications to process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if notifications were triggered
      const { data: logs } = await supabase
        .from('cron_job_logs')
        .select('*')
        .eq('job_name', 'auto_notify_signal_creation')
        .gte('execution_time', new Date(startTime).toISOString())
        .order('execution_time', { ascending: false })
        .limit(5);

      const endTime = Date.now();
      const testResult = {
        id: signal.id,
        assetName: signal.asset_name,
        createdAt: new Date(signal.created_at).toLocaleTimeString(),
        processingTime: `${endTime - startTime}ms`,
        notificationTriggered: logs && logs.length > 0,
        notificationStatus: logs?.[0]?.status || 'unknown',
        affectedUsers: logs?.[0]?.records_affected || 0,
        logMessage: logs?.[0]?.error_message || 'No logs found'
      };

      setTestResults(prev => [testResult, ...prev.slice(0, 9)]);

      toast({
        title: "Test Signal Created",
        description: `Signal created and processed in ${testResult.processingTime}`,
      });

    } catch (error) {
      console.error('❌ Failed to create test signal:', error);
      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const cleanupTestSignals = async () => {
    try {
      const { error } = await supabase
        .from('trade_alerts')
        .delete()
        .eq('user_id', user?.id)
        .like('asset_name', '[TEST]%');

      if (error) throw error;

      toast({
        title: "Cleanup Complete",
        description: "All test signals have been removed",
      });

      setTestResults([]);
    } catch (error) {
      console.error('Failed to cleanup test signals:', error);
      toast({
        title: "Cleanup Failed",
        description: "Failed to remove test signals",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="grid gap-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="w-5 h-5" />
            Test Signal Creator
          </CardTitle>
          <CardDescription>
            Create test signals to verify the complete notification pipeline from database triggers to OneSignal delivery
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assetName">Asset Symbol</Label>
              <Input
                id="assetName"
                value={signalData.assetName}
                onChange={(e) => setSignalData(prev => ({ ...prev, assetName: e.target.value }))}
                placeholder="EURUSD"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tradeType">Trade Type</Label>
              <Select 
                value={signalData.tradeType} 
                onValueChange={(value: any) => setSignalData(prev => ({ ...prev, tradeType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="sell">Sell</SelectItem>
                  <SelectItem value="buy_limit">Buy Limit</SelectItem>
                  <SelectItem value="sell_limit">Sell Limit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="entryPrice">Entry Price</Label>
              <Input
                id="entryPrice"
                type="number"
                step="0.00001"
                value={signalData.entryPrice}
                onChange={(e) => setSignalData(prev => ({ ...prev, entryPrice: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stopLoss">Stop Loss</Label>
              <Input
                id="stopLoss"
                type="number"
                step="0.00001"
                value={signalData.stopLoss}
                onChange={(e) => setSignalData(prev => ({ ...prev, stopLoss: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tp1">Take Profit 1</Label>
              <Input
                id="tp1"
                type="number"
                step="0.00001"
                value={signalData.tp1}
                onChange={(e) => setSignalData(prev => ({ ...prev, tp1: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tp2">Take Profit 2 (Optional)</Label>
              <Input
                id="tp2"
                type="number"
                step="0.00001"
                value={signalData.tp2}
                onChange={(e) => setSignalData(prev => ({ ...prev, tp2: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Test Notes</Label>
            <Input
              id="notes"
              value={signalData.notes}
              onChange={(e) => setSignalData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Description of this test..."
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={createTestSignal} 
              disabled={isCreating}
              className="flex items-center gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              {isCreating ? 'Creating Test Signal...' : 'Create Test Signal'}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={cleanupTestSignals}
              className="flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              Cleanup Test Signals
            </Button>
          </div>
        </CardContent>
      </Card>

      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Test Results
            </CardTitle>
            <CardDescription>
              Recent test signal creation results and notification pipeline verification
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div key={result.id} className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={result.notificationTriggered ? 'default' : 'destructive'}>
                        {result.notificationTriggered ? 'SUCCESS' : 'FAILED'}
                      </Badge>
                      <span className="font-medium">{result.assetName}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{result.createdAt}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Processing Time:</span>
                      <span className="ml-2 font-mono">{result.processingTime}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Users Notified:</span>
                      <span className="ml-2 font-mono">{result.affectedUsers}</span>
                    </div>
                  </div>
                  
                  <div className="text-sm">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="ml-2 font-mono text-xs">{result.logMessage}</span>
                  </div>
                  
                  {index < testResults.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};