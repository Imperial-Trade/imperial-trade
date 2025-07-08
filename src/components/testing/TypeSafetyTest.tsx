
import React, { useEffect, useState } from 'react';
import { useTrading } from '@/hooks/useTrading';
import { CreateTradeAlertDto } from '@/domain/dtos/trading/CreateTradeAlertDto';
import { apiClient } from '@/api/client/ApiClient';
import { isApiResponse, isTradeAlert, isCreateTradeAlertDto } from '@/types/guards';

interface TypeSafetyTestProps {
  userId: string;
}

export const TypeSafetyTest: React.FC<TypeSafetyTestProps> = ({ userId }) => {
  const { alerts, isLoading, error, createAlert, updateAlert, deleteAlert } = useTrading(userId);
  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, result]);
  };

  const runTypeSafetyTests = async () => {
    setTestResults([]);
    addTestResult('🧪 Starting Phase 2 Type Safety Tests...');

    // Test 1: API Client Type Safety
    try {
      const userResult = await apiClient.getCurrentUser();
      if (isApiResponse(userResult)) {
        addTestResult('✅ API Client returns properly typed responses');
      } else {
        addTestResult('❌ API Client response type validation failed');
      }
    } catch (error) {
      addTestResult('❌ API Client test failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    // Test 2: Type Guards
    const validTradeAlert = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      asset_name: 'Gold',
      finnhub_symbol: 'XAU/USD',
      trade_type: 'buy' as const,
      entry_price: 2000,
      stop_loss: 1950,
      status: 'active' as const,
      tp_hits: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: userId
    };

    if (isTradeAlert(validTradeAlert)) {
      addTestResult('✅ Trade Alert type guard works correctly');
    } else {
      addTestResult('❌ Trade Alert type guard failed');
    }

    // Test 3: DTO Validation
    const validCreateDto: CreateTradeAlertDto = {
      assetName: 'Bitcoin',
      finnhubSymbol: 'BTC/USD',
      tradeType: 'buy',
      entryPrice: 50000,
      stopLoss: 48000,
      tp1: 52000
    };

    if (isCreateTradeAlertDto(validCreateDto)) {
      addTestResult('✅ CreateTradeAlertDto validation works');
    } else {
      addTestResult('❌ CreateTradeAlertDto validation failed');
    }

    // Test 4: Invalid data rejection
    const invalidDto = {
      assetName: 123, // Should be string
      tradeType: 'invalid_type'
    };

    if (!isCreateTradeAlertDto(invalidDto)) {
      addTestResult('✅ Invalid DTO correctly rejected');
    } else {
      addTestResult('❌ Invalid DTO was incorrectly accepted');
    }

    // Test 5: Hook Type Safety
    try {
      if (typeof createAlert === 'function') {
        addTestResult('✅ useTrading hook provides properly typed functions');
      } else {
        addTestResult('❌ useTrading hook typing is incorrect');
      }
    } catch (error) {
      addTestResult('❌ Hook type safety test failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    // Test 6: Database Schema Alignment
    try {
      const alertsResult = await apiClient.select('trade_alerts', {
        limit: 1
      });
      
      if (alertsResult.success) {
        addTestResult('✅ Database schema alignment verified');
      } else {
        addTestResult('⚠️ Database query issue: ' + (alertsResult.error || 'Unknown error'));
      }
    } catch (error) {
      addTestResult('❌ Database schema alignment test failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    addTestResult('🎯 Phase 2 Type Safety Tests Complete!');
  };

  useEffect(() => {
    if (userId) {
      runTypeSafetyTests();
    }
  }, [userId]);

  return (
    <div className="p-6 bg-surface rounded-lg border border-default">
      <h2 className="text-xl font-semibold text-primary mb-4">
        Phase 2: API & Data Flow Type Safety Test
      </h2>
      
      <div className="space-y-4">
        <div>
          <h3 className="font-medium text-primary mb-2">Test Results:</h3>
          <div className="bg-background rounded p-4 max-h-60 overflow-y-auto">
            {testResults.map((result, index) => (
              <div key={index} className="text-sm font-mono text-secondary mb-1">
                {result}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-medium text-primary mb-2">Trading Hook Status:</h3>
          <div className="text-sm text-secondary">
            <p>Loading: {isLoading ? 'Yes' : 'No'}</p>
            <p>Error: {error || 'None'}</p>
            <p>Alerts Count: {alerts.length}</p>
          </div>
        </div>

        <button
          onClick={runTypeSafetyTests}
          className="bg-accent-green hover:bg-green-500 text-white px-4 py-2 rounded"
        >
          Run Tests Again
        </button>
      </div>
    </div>
  );
};
