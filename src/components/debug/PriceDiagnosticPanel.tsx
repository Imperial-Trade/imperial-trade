import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TestResult {
  step: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  data?: any;
}

export function PriceDiagnosticPanel() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [secretValue, setSecretValue] = useState('');

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result]);
  };

  const runDiagnostic = async () => {
    setIsRunning(true);
    setResults([]);

    // Step 1: Test Secret Verifier
    addResult({
      step: 'Secret Verification',
      status: 'pending',
      message: 'Testing INGEST_SECRET with verifier function...'
    });

    try {
      const secretTest = await supabase.functions.invoke('ingest-secret-verifier', {
        body: {},
        headers: {
          'X-INGEST-KEY': secretValue || 'test-secret'
        }
      });

      if (secretTest.error) {
        addResult({
          step: 'Secret Verification',
          status: 'error',
          message: `Secret test failed: ${secretTest.error.message}`,
          data: secretTest.error
        });
      } else if (secretTest.data?.match) {
        addResult({
          step: 'Secret Verification',
          status: 'success',
          message: 'SECRET WORKS! ✅ Authentication is valid.',
          data: secretTest.data
        });
      } else {
        addResult({
          step: 'Secret Verification',
          status: 'error',
          message: 'Secret mismatch - this is likely the root cause!',
          data: secretTest.data
        });
      }
    } catch (error) {
      addResult({
        step: 'Secret Verification',
        status: 'error',
        message: `Secret verification error: ${error.message}`,
        data: error
      });
    }

    // Step 2: Test Price Ingestion with Known Good Data
    addResult({
      step: 'Price Ingestion Test',
      status: 'pending',
      message: 'Broadcasting known good XAUUSD price...'
    });

    try {
      const priceTest = await supabase.functions.invoke('price-ingestor', {
        body: {
          prices: [
            {
              symbol: 'XAUUSD',
              price: 2650.50,
              timestamp: new Date().toISOString()
            }
          ]
        },
        headers: {
          'X-INGEST-KEY': secretValue || 'test-secret'
        }
      });

      if (priceTest.error) {
        addResult({
          step: 'Price Ingestion Test',
          status: 'error',
          message: `Price ingestion failed: ${priceTest.error.message}`,
          data: priceTest.error
        });
      } else {
        addResult({
          step: 'Price Ingestion Test',
          status: 'success',
          message: `Price broadcast successful! ${priceTest.data?.processed || 0} prices processed.`,
          data: priceTest.data
        });
      }
    } catch (error) {
      addResult({
        step: 'Price Ingestion Test',
        status: 'error',
        message: `Price ingestion error: ${error.message}`,
        data: error
      });
    }

    // Step 3: Test WebSocket Connection
    addResult({
      step: 'WebSocket Test',
      status: 'pending',
      message: 'Checking Supabase Realtime connection...'
    });

    try {
      const channel = supabase.channel('diagnostic-test');
      
      const connectionPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, 5000);

        channel.on('broadcast', { event: 'price_update' }, (payload) => {
          clearTimeout(timeout);
          resolve(payload);
        });

        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            clearTimeout(timeout);
            resolve({ status: 'connected' });
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            clearTimeout(timeout);
            reject(new Error(`WebSocket status: ${status}`));
          }
        });
      });

      const result = await connectionPromise;
      
      addResult({
        step: 'WebSocket Test',
        status: 'success',
        message: 'WebSocket connection successful!',
        data: result
      });

      supabase.removeChannel(channel);
      
    } catch (error) {
      addResult({
        step: 'WebSocket Test',
        status: 'error',
        message: `WebSocket connection failed: ${error.message}`,
        data: error
      });
    }

    setIsRunning(false);
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>🔍 Price Pipeline Diagnostic</CardTitle>
        <div className="space-y-2">
          <input
            type="password"
            placeholder="Enter your INGEST_SECRET to test"
            value={secretValue}
            onChange={(e) => setSecretValue(e.target.value)}
            className="w-full p-2 border rounded"
          />
          <Button 
            onClick={runDiagnostic} 
            disabled={isRunning || !secretValue}
            className="w-full"
          >
            {isRunning ? 'Running Diagnostic...' : 'Run Full Diagnostic'}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {results.length === 0 && !isRunning && (
          <Alert>
            <AlertDescription>
              Enter your INGEST_SECRET above and click "Run Full Diagnostic" to test the entire price pipeline.
            </AlertDescription>
          </Alert>
        )}

        {results.map((result, index) => (
          <div key={index} className="flex items-start gap-3 p-3 border rounded">
            <Badge 
              className={`${getStatusColor(result.status)} text-white min-w-fit`}
            >
              {result.step}
            </Badge>
            <div className="flex-1">
              <p className="font-medium">{result.message}</p>
              {result.data && (
                <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-auto">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              )}
            </div>
          </div>
        ))}

        {isRunning && (
          <div className="flex items-center gap-2 p-3 border rounded">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span>Running diagnostic tests...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}