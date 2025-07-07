import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { OpportunitySignal } from '@/api/entities';
import { Code, Database, Zap, Plus } from 'lucide-react';

export default function SignalStreamAPI() {
  const [testResult, setTestResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [newSignal, setNewSignal] = useState({
    instrument: '',
    signal_type: 'breakout',
    description: '',
    probability: 75,
    key_levels: '',
    time_frame: '4H'
  });

  // API Examples - these are the actual functions you can use
  const apiExamples = {
    // Get all signals
    getAllSignals: async () => {
      return await OpportunitySignal.list('-created_date', 50);
    },

    // Get signals by type
    getSignalsByType: async (type) => {
      return await OpportunitySignal.filter({ signal_type: type }, '-created_date', 20);
    },

    // Get active signals only
    getActiveSignals: async () => {
      return await OpportunitySignal.filter({ status: 'active' }, '-created_date', 30);
    },

    // Get signals for specific instrument
    getInstrumentSignals: async (instrument) => {
      return await OpportunitySignal.filter({ instrument: instrument }, '-created_date', 10);
    },

    // Create new signal
    createSignal: async (signalData) => {
      return await OpportunitySignal.create(signalData);
    },

    // Update signal
    updateSignal: async (id, updateData) => {
      return await OpportunitySignal.update(id, updateData);
    },

    // Delete signal
    deleteSignal: async (id) => {
      return await OpportunitySignal.delete(id);
    },

    // Bulk create signals
    bulkCreateSignals: async (signalsArray) => {
      return await OpportunitySignal.bulkCreate(signalsArray);
    },

    // Get high probability signals (80%+)
    getHighProbabilitySignals: async () => {
      const allSignals = await OpportunitySignal.list('-created_date', 100);
      return allSignals.filter(signal => signal.probability >= 80);
    },

    // Get signals by time frame
    getSignalsByTimeFrame: async (timeFrame) => {
      return await OpportunitySignal.filter({ time_frame: timeFrame }, '-created_date', 20);
    }
  };

  const testAPI = async (apiName) => {
    setIsLoading(true);
    try {
      let result;
      switch(apiName) {
        case 'getAllSignals':
          result = await apiExamples.getAllSignals();
          break;
        case 'getActiveSignals':
          result = await apiExamples.getActiveSignals();
          break;
        case 'getHighProbabilitySignals':
          result = await apiExamples.getHighProbabilitySignals();
          break;
        default:
          result = await apiExamples.getAllSignals();
      }
      setTestResult({ success: true, data: result, count: result.length });
    } catch (error) {
      setTestResult({ success: false, error: error.message });
    }
    setIsLoading(false);
  };

  const createTestSignal = async () => {
    setIsLoading(true);
    try {
      const signalData = {
        ...newSignal,
        key_levels: newSignal.key_levels.split(',').map(level => parseFloat(level.trim())).filter(level => !isNaN(level)),
        probability: parseInt(newSignal.probability)
      };
      
      const result = await apiExamples.createSignal(signalData);
      setTestResult({ success: true, data: result, message: 'Signal created successfully!' });
      
      // Reset form
      setNewSignal({
        instrument: '',
        signal_type: 'breakout',
        description: '',
        probability: 75,
        key_levels: '',
        time_frame: '4H'
      });
    } catch (error) {
      setTestResult({ success: false, error: error.message });
    }
    setIsLoading(false);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card className="glass-effect border-accent-green">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Database className="w-6 h-6 text-accent-green" />
            Signal Stream API Documentation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* API Methods */}
          <div>
            <h3 className="text-xl font-semibold text-primary mb-4">Available API Methods</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(apiExamples).map(([methodName, method]) => (
                <Card key={methodName} className="bg-surface/50 border-default">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <code className="text-sm text-accent-green">{methodName}()</code>
                      <Badge variant="outline" className="text-xs">Method</Badge>
                    </div>
                    <p className="text-xs text-secondary">
                      {methodName.includes('get') ? 'Fetches' : methodName.includes('create') ? 'Creates' : methodName.includes('update') ? 'Updates' : 'Deletes'} signal data
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Test API */}
          <div>
            <h3 className="text-xl font-semibold text-primary mb-4">Test API Methods</h3>
            <div className="flex flex-wrap gap-3 mb-4">
              <Button onClick={() => testAPI('getAllSignals')} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                Get All Signals
              </Button>
              <Button onClick={() => testAPI('getActiveSignals')} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                Get Active Signals
              </Button>
              <Button onClick={() => testAPI('getHighProbabilitySignals')} disabled={isLoading} className="bg-purple-600 hover:bg-purple-700">
                Get High Probability
              </Button>
            </div>
          </div>

          {/* Create Signal Form */}
          <div>
            <h3 className="text-xl font-semibold text-primary mb-4">Create New Signal</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder="Instrument (e.g., EUR/USD)"
                value={newSignal.instrument}
                onChange={(e) => setNewSignal({...newSignal, instrument: e.target.value})}
                className="bg-surface border-default"
              />
              <select
                value={newSignal.signal_type}
                onChange={(e) => setNewSignal({...newSignal, signal_type: e.target.value})}
                className="p-2 bg-surface border border-default rounded text-primary"
              >
                <option value="breakout">Breakout</option>
                <option value="reversal">Reversal</option>
                <option value="pattern">Pattern</option>
                <option value="news_event">News Event</option>
              </select>
              <Input
                placeholder="Description"
                value={newSignal.description}
                onChange={(e) => setNewSignal({...newSignal, description: e.target.value})}
                className="bg-surface border-default md:col-span-2"
              />
              <Input
                placeholder="Key Levels (comma separated)"
                value={newSignal.key_levels}
                onChange={(e) => setNewSignal({...newSignal, key_levels: e.target.value})}
                className="bg-surface border-default"
              />
              <Input
                type="number"
                placeholder="Probability (%)"
                value={newSignal.probability}
                onChange={(e) => setNewSignal({...newSignal, probability: e.target.value})}
                className="bg-surface border-default"
              />
            </div>
            <Button onClick={createTestSignal} disabled={isLoading} className="mt-4 bg-accent-green hover:bg-green-500">
              <Plus className="w-4 h-4 mr-2" />
              Create Signal
            </Button>
          </div>

          {/* Code Examples */}
          <div>
            <h3 className="text-xl font-semibold text-primary mb-4">Code Examples</h3>
            <Card className="bg-background border-default">
              <CardContent className="p-4">
                <pre className="text-sm overflow-x-auto text-accent-green">
{`// Import the entity
import { OpportunitySignal } from '@/api/entities';

// Get all signals
const signals = await OpportunitySignal.list('-created_date', 50);

// Filter by type
const breakoutSignals = await OpportunitySignal.filter(
  { signal_type: 'breakout' }, 
  '-created_date', 
  20
);

// Create new signal
const newSignal = await OpportunitySignal.create({
  instrument: 'EUR/USD',
  signal_type: 'breakout',
  description: 'Strong breakout pattern',
  probability: 85,
  key_levels: [1.0850, 1.0820, 1.0950],
  time_frame: '4H'
});

// Update signal
await OpportunitySignal.update(signalId, { 
  status: 'triggered' 
});`}
                </pre>
              </CardContent>
            </Card>
          </div>

          {/* Test Results */}
          {testResult && (
            <div>
              <h3 className="text-xl font-semibold text-primary mb-4">API Test Results</h3>
              <Card className={`border-default ${testResult.success ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                <CardContent className="p-4">
                  {testResult.success ? (
                    <div>
                      <p className="text-accent-green font-semibold mb-2">
                        ✅ Success! {testResult.count ? `Found ${testResult.count} records` : testResult.message}
                      </p>
                      {testResult.data && (
                        <pre className="text-xs overflow-x-auto bg-surface p-2 rounded">
                          {JSON.stringify(testResult.data.slice(0, 2), null, 2)}
                        </pre>
                      )}
                    </div>
                  ) : (
                    <p className="text-accent-red">❌ Error: {testResult.error}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}