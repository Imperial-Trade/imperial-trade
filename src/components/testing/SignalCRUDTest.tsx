import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizedTrading } from '@/hooks/useOptimizedTrading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, AlertCircle, Loader } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  duration?: number;
}

export default function SignalCRUDTest() {
  const { user } = useAuth();
  const { alerts, createAlert, updateAlert, deleteAlert, isLoading, error } = useOptimizedTrading(user?.id || '', false);
  const { toast } = useToast();
  
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [createdSignalId, setCreatedSignalId] = useState<string | null>(null);

  const addTestResult = (result: TestResult) => {
    setTestResults(prev => [...prev, result]);
  };

  const runCRUDTests = async () => {
    if (!user?.id) {
      toast({
        title: "Test Failed",
        description: "Please log in to run CRUD tests",
        variant: "destructive"
      });
      return;
    }

    setIsRunning(true);
    setTestResults([]);
    setCreatedSignalId(null);

    try {
      // Test 1: CREATE Signal
      addTestResult({ name: 'CREATE Signal', status: 'pending', message: 'Creating test signal...' });
      const startCreate = Date.now();
      
      const testSignalData = {
        assetName: 'Gold',
        finnhubSymbol: 'XAU/USD',
        tradeType: 'buy' as const,
        entryPrice: 2000,
        stopLoss: 1950,
        tp1: 2050,
        tp2: 2100,
        notes: 'Test signal for CRUD operations'
      };

      const createResult = await createAlert(testSignalData);
      const createDuration = Date.now() - startCreate;

      if (createResult) {
        addTestResult({ 
          name: 'CREATE Signal', 
          status: 'success', 
          message: `Signal created successfully in ${createDuration}ms`,
          duration: createDuration
        });
        
        // Find the created signal
        setTimeout(() => {
          const newSignal = alerts.find(alert => 
            alert.assetName === testSignalData.assetName && 
            alert.entryPrice === testSignalData.entryPrice &&
            alert.notes === testSignalData.notes
          );
          if (newSignal) {
            setCreatedSignalId(newSignal.id);
          }
        }, 1000);
      } else {
        addTestResult({ 
          name: 'CREATE Signal', 
          status: 'error', 
          message: 'Failed to create signal',
          duration: createDuration
        });
        return;
      }

      // Wait for real-time update
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Test 2: READ Signal (verify it appears in list)
      addTestResult({ name: 'READ Signal', status: 'pending', message: 'Verifying signal appears in list...' });
      const startRead = Date.now();
      
      const foundSignal = alerts.find(alert => 
        alert.assetName === testSignalData.assetName && 
        alert.entryPrice === testSignalData.entryPrice &&
        alert.notes === testSignalData.notes
      );
      
      const readDuration = Date.now() - startRead;

      if (foundSignal) {
        setCreatedSignalId(foundSignal.id);
        addTestResult({ 
          name: 'READ Signal', 
          status: 'success', 
          message: `Signal found in list in ${readDuration}ms`,
          duration: readDuration
        });
      } else {
        addTestResult({ 
          name: 'READ Signal', 
          status: 'error', 
          message: 'Signal not found in list',
          duration: readDuration
        });
        return;
      }

      // Test 3: UPDATE Signal
      if (foundSignal) {
        addTestResult({ name: 'UPDATE Signal', status: 'pending', message: 'Updating signal status...' });
        const startUpdate = Date.now();
        
        const updateData = {
          status: 'closed' as const,
          notes: 'Updated test signal - CRUD test completed',
          tpHits: [1],
          closeReason: 'tp1' as const
        };

        const updateResult = await updateAlert(foundSignal.id, updateData);
        const updateDuration = Date.now() - startUpdate;

        if (updateResult) {
          addTestResult({ 
            name: 'UPDATE Signal', 
            status: 'success', 
            message: `Signal updated successfully in ${updateDuration}ms`,
            duration: updateDuration
          });
        } else {
          addTestResult({ 
            name: 'UPDATE Signal', 
            status: 'error', 
            message: 'Failed to update signal',
            duration: updateDuration
          });
        }

        // Wait for real-time update
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Test 4: DELETE Signal
        addTestResult({ name: 'DELETE Signal', status: 'pending', message: 'Deleting test signal...' });
        const startDelete = Date.now();
        
        const deleteResult = await deleteAlert(foundSignal.id);
        const deleteDuration = Date.now() - startDelete;

        if (deleteResult) {
          addTestResult({ 
            name: 'DELETE Signal', 
            status: 'success', 
            message: `Signal deleted successfully in ${deleteDuration}ms`,
            duration: deleteDuration
          });
        } else {
          addTestResult({ 
            name: 'DELETE Signal', 
            status: 'error', 
            message: 'Failed to delete signal',
            duration: deleteDuration
          });
        }
      }

      // Test 5: Real-time Synchronization
      await new Promise(resolve => setTimeout(resolve, 1000));
      addTestResult({ name: 'Real-time Sync', status: 'pending', message: 'Checking real-time synchronization...' });
      
      const syncStart = Date.now();
      const stillExists = alerts.find(alert => alert.id === foundSignal?.id);
      const syncDuration = Date.now() - syncStart;

      if (!stillExists) {
        addTestResult({ 
          name: 'Real-time Sync', 
          status: 'success', 
          message: `Real-time deletion confirmed in ${syncDuration}ms`,
          duration: syncDuration
        });
      } else {
        addTestResult({ 
          name: 'Real-time Sync', 
          status: 'error', 
          message: 'Real-time synchronization failed - signal still appears',
          duration: syncDuration
        });
      }

    } catch (error) {
      addTestResult({ 
        name: 'CRUD Test Suite', 
        status: 'error', 
        message: `Test suite failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'pending':
        return <Loader className="w-4 h-4 text-yellow-400 animate-spin" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    const variants = {
      success: 'bg-green-500/10 text-green-400 border-green-500/20',
      error: 'bg-red-500/10 text-red-400 border-red-500/20',
      pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    };
    
    return <Badge className={variants[status]}>{status.toUpperCase()}</Badge>;
  };

  const successfulTests = testResults.filter(r => r.status === 'success').length;
  const totalTests = testResults.filter(r => r.status !== 'pending').length;

  return (
    <div className="space-y-6 p-6">
      <Card className="glass-effect border-default">
        <CardHeader>
          <CardTitle className="text-primary">Signal Management CRUD Tests</CardTitle>
          <p className="text-secondary">
            Comprehensive testing of Create, Read, Update, Delete operations for trading signals
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                onClick={runCRUDTests}
                disabled={isRunning || !user?.id}
                className="bg-accent-green hover:bg-accent-green/90"
              >
                {isRunning ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Running Tests...
                  </>
                ) : (
                  'Run CRUD Tests'
                )}
              </Button>
              
              {totalTests > 0 && (
                <div className="text-sm text-secondary">
                  {successfulTests}/{totalTests} tests passed
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2 text-sm text-secondary">
              <span>Signals in system: {alerts.length}</span>
              {isLoading && <Loader className="w-4 h-4 animate-spin" />}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-red-400 text-sm">Error: {error}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {testResults.length > 0 && (
        <Card className="glass-effect border-default">
          <CardHeader>
            <CardTitle className="text-primary">Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-surface/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(result.status)}
                    <div>
                      <span className="text-primary font-medium">{result.name}</span>
                      <p className="text-sm text-secondary">{result.message}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {result.duration && (
                      <span className="text-xs text-secondary">{result.duration}ms</span>
                    )}
                    {getStatusBadge(result.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {createdSignalId && (
        <Card className="glass-effect border-default">
          <CardHeader>
            <CardTitle className="text-primary">Test Signal Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-secondary space-y-1">
              <p>Signal ID: <span className="text-primary font-mono">{createdSignalId}</span></p>
              <p>This signal was created for testing purposes and will be automatically cleaned up.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}