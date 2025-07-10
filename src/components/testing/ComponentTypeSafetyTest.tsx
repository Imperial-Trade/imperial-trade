
import React from 'react';
import OptimizedNewAlertForm from '@/components/signals/OptimizedNewAlertForm';
import { useOptimizedTradeAlertForm, type TradeAlertSubmissionData } from '@/hooks/useOptimizedTradeAlertForm';
import { useWebSocketLivePrice } from '@/hooks/useWebSocketLivePrice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const ComponentTypeSafetyTest: React.FC = () => {
  // Test optimized hooks
  const { price, isLoading, connectionStatus } = useWebSocketLivePrice('XAU/USD');
  const { form, isSubmitting } = useOptimizedTradeAlertForm({
    onSubmit: async (data: TradeAlertSubmissionData) => {
      console.log('✅ Optimized form submission:', data);
    }
  });

  const handleTestSubmit = async (data: TradeAlertSubmissionData) => {
    console.log('🚀 Performance test - WebSocket form submission:', data);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card className="glass-effect border-default">
        <CardHeader>
          <CardTitle className="text-primary flex items-center gap-2">
            🧪 WebSocket Migration Test Suite
            <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
              All Migrated ✅
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* WebSocket Price Test */}
          <div className="p-4 bg-surface/50 rounded-lg">
            <h3 className="text-lg font-semibold text-primary mb-2">Live Price (WebSocket)</h3>
            <div className="flex items-center gap-4">
              <span className="text-2xl font-mono text-accent-green">
                ${price.toFixed(2)}
              </span>
              <Badge variant={connectionStatus === 'connected' ? 'default' : 'destructive'}>
                {connectionStatus}
              </Badge>
              {isLoading && <span className="text-secondary">Loading...</span>}
            </div>
          </div>

          {/* Form Performance Test */}
          <div className="p-4 bg-surface/50 rounded-lg">
            <h3 className="text-lg font-semibold text-primary mb-2">Form Performance</h3>
            <div className="flex items-center gap-4">
              <Button 
                onClick={() => form.trigger()}
                disabled={isSubmitting}
                className="bg-accent-green hover:bg-green-500"
              >
                {isSubmitting ? 'Processing...' : 'Test Validation Speed'}
              </Button>
              <span className="text-sm text-secondary">
                Optimized validation with debouncing
              </span>
            </div>
          </div>

          {/* Migration Status */}
          <div className="p-4 bg-surface/50 rounded-lg">
            <h3 className="text-lg font-semibold text-primary mb-2">Migration Status</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-green-400">✅ EnhancedNewAlertForm → OptimizedNewAlertForm</div>
              <div className="text-green-400">✅ useLivePrice → useWebSocketLivePrice</div>
              <div className="text-green-400">✅ useEnhancedLivePrice → useOptimizedLivePrice</div>
              <div className="text-green-400">✅ HTTP calls → WebSocket connections</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test the optimized form */}
      <Card className="glass-effect border-default">
        <CardHeader>
          <CardTitle className="text-primary">Optimized Form Test</CardTitle>
        </CardHeader>
        <CardContent>
          <OptimizedNewAlertForm 
            onSubmit={handleTestSubmit}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default ComponentTypeSafetyTest;
