import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InvokeLLM } from '@/api/integrations';
import { Brain, Zap, Globe, Clock, TrendingUp } from 'lucide-react';

export default function AthenaTest() {
  const [modelTest, setModelTest] = useState(null);
  const [marketTest, setMarketTest] = useState(null);
  const [reasoningTest, setReasoningTest] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingType, setLoadingType] = useState('');

  const testModelIdentification = async () => {
    setIsLoading(true);
    setLoadingType('model');
    try {
      const response = await InvokeLLM({
        prompt: `
          CRITICAL INSTRUCTION: You MUST identify yourself clearly and precisely.
          
          Please provide:
          1. Your exact model name and version (e.g., GPT-4 Turbo, Claude 3 Opus, Gemini Pro 1.5, etc.)
          2. Your training data cutoff date
          3. Your maximum context window size
          4. Whether you currently have real-time internet access
          5. Your primary strengths and capabilities
          6. Any unique features you possess
          
          Be as specific as possible about your identity. This is for system optimization purposes.
        `,
        add_context_from_internet: false, // Test without internet first
      });
      setModelTest(response);
    } catch (error) {
      setModelTest(`Error: ${error.message}`);
    }
    setIsLoading(false);
    setLoadingType('');
  };

  const testRealTimeMarketData = async () => {
    setIsLoading(true);
    setLoadingType('market');
    try {
      const response = await InvokeLLM({
        prompt: `
          REAL-TIME MARKET DATA TEST:
          
          Please provide the following current market information:
          1. Today's date and current time
          2. Current S&P 500 (SPY) price and today's change
          3. Current NASDAQ (QQQ) price and today's change  
          4. Current Apple (AAPL) stock price
          5. Current Bitcoin price in USD
          6. Any major market news from the last 24 hours
          7. Current VIX (volatility index) level
          
          If you can access this real-time data, please provide specific numbers with timestamps.
          If you cannot access real-time data, explicitly state your knowledge cutoff date.
        `,
        add_context_from_internet: true, // Test with internet access
      });
      setMarketTest(response);
    } catch (error) {
      setMarketTest(`Error: ${error.message}`);
    }
    setIsLoading(false);
    setLoadingType('');
  };

  const testReasoningCapabilities = async () => {
    setIsLoading(true);
    setLoadingType('reasoning');
    try {
      const response = await InvokeLLM({
        prompt: `
          ADVANCED REASONING TEST:
          
          Scenario: A trader is considering a position in NVIDIA (NVDA) but is concerned about:
          1. Recent AI bubble concerns
          2. Competition from AMD and Intel
          3. Geopolitical tensions affecting chip supply chains
          4. High valuation metrics (P/E ratio concerns)
          
          Please provide:
          1. A multi-layered risk assessment (1-10 scale with reasoning)
          2. Three different scenario analyses (bull case, bear case, base case)
          3. Specific entry points, stop-loss levels, and profit targets
          4. Timeline considerations for this trade
          5. Portfolio allocation recommendations (what % of portfolio)
          
          This tests your ability to synthesize complex information and provide actionable trading insights.
        `,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            risk_assessment: {
              type: "object",
              properties: {
                overall_risk_score: { type: "number" },
                risk_factors: { type: "array", items: { type: "string" } }
              }
            },
            scenarios: {
              type: "object",
              properties: {
                bull_case: { type: "string" },
                bear_case: { type: "string" },
                base_case: { type: "string" }
              }
            },
            trading_levels: {
              type: "object",
              properties: {
                entry_points: { type: "array", items: { type: "number" } },
                stop_loss: { type: "number" },
                profit_targets: { type: "array", items: { type: "number" } }
              }
            },
            recommendations: {
              type: "object",
              properties: {
                portfolio_allocation: { type: "string" },
                timeline: { type: "string" },
                key_catalysts: { type: "array", items: { type: "string" } }
              }
            }
          }
        }
      });
      setReasoningTest(response);
    } catch (error) {
      setReasoningTest(`Error: ${error.message}`);
    }
    setIsLoading(false);
    setLoadingType('');
  };

  const runAllTests = async () => {
    await testModelIdentification();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause
    await testRealTimeMarketData();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause
    await testReasoningCapabilities();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      <Card className="glass-effect border-accent-gold">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary flex items-center justify-center gap-2">
            <Brain className="w-8 h-8 text-accent-gold" />
            MECCA - AI Model Analysis
          </CardTitle>
          <p className="text-secondary">
            Comprehensive testing of InvokeLLM capabilities and model identification
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Button 
              onClick={testModelIdentification}
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Brain className="w-4 h-4 mr-2" />
              {loadingType === 'model' ? 'Testing...' : 'Model ID'}
            </Button>
            <Button 
              onClick={testRealTimeMarketData}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Globe className="w-4 h-4 mr-2" />
              {loadingType === 'market' ? 'Testing...' : 'Market Data'}
            </Button>
            <Button 
              onClick={testReasoningCapabilities}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Zap className="w-4 h-4 mr-2" />
              {loadingType === 'reasoning' ? 'Testing...' : 'Reasoning'}
            </Button>
            <Button 
              onClick={runAllTests}
              disabled={isLoading}
              className="bg-accent-gold hover:bg-yellow-600 text-white font-bold"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              {isLoading ? 'Running...' : 'Run All Tests'}
            </Button>
          </div>

          {/* Model Identification Results */}
          {modelTest && (
            <Card className="mb-6 bg-purple-500/10 border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-lg text-purple-400 flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Model Identification Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-surface/50 p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap text-sm text-primary overflow-x-auto">
                    {typeof modelTest === 'string' ? modelTest : JSON.stringify(modelTest, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Real-Time Market Data Results */}
          {marketTest && (
            <Card className="mb-6 bg-green-500/10 border-green-500/20">
              <CardHeader>
                <CardTitle className="text-lg text-green-400 flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Real-Time Market Data Test
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-surface/50 p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap text-sm text-primary overflow-x-auto">
                    {typeof marketTest === 'string' ? marketTest : JSON.stringify(marketTest, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Advanced Reasoning Results */}
          {reasoningTest && (
            <Card className="mb-6 bg-blue-500/10 border-blue-500/20">
              <CardHeader>
                <CardTitle className="text-lg text-blue-400 flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Advanced Reasoning Test
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-surface/50 p-4 rounded-lg">
                  {typeof reasoningTest === 'object' ? (
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-primary mb-2">Risk Assessment:</h4>
                        <p className="text-secondary">
                          Score: {reasoningTest.risk_assessment?.overall_risk_score}/10
                        </p>
                        <ul className="list-disc list-inside text-secondary text-sm mt-2">
                          {reasoningTest.risk_assessment?.risk_factors?.map((factor, index) => (
                            <li key={index}>{factor}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-primary mb-2">Scenario Analysis:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="bg-green-500/10 p-3 rounded">
                            <h5 className="font-semibold text-green-400">Bull Case:</h5>
                            <p className="text-secondary">{reasoningTest.scenarios?.bull_case}</p>
                          </div>
                          <div className="bg-yellow-500/10 p-3 rounded">
                            <h5 className="font-semibold text-yellow-400">Base Case:</h5>
                            <p className="text-secondary">{reasoningTest.scenarios?.base_case}</p>
                          </div>
                          <div className="bg-red-500/10 p-3 rounded">
                            <h5 className="font-semibold text-red-400">Bear Case:</h5>
                            <p className="text-secondary">{reasoningTest.scenarios?.bear_case}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-primary mb-2">Trading Levels:</h4>
                        <div className="flex gap-4 flex-wrap">
                          <Badge className="bg-blue-500/10 text-blue-400">
                            Entry: ${reasoningTest.trading_levels?.entry_points?.join(', $') || 'N/A'}
                          </Badge>
                          <Badge className="bg-red-500/10 text-red-400">
                            Stop Loss: ${reasoningTest.trading_levels?.stop_loss || 'N/A'}
                          </Badge>
                          <Badge className="bg-green-500/10 text-green-400">
                            Targets: ${reasoningTest.trading_levels?.profit_targets?.join(', $') || 'N/A'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm text-primary overflow-x-auto">
                      {reasoningTest}
                    </pre>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Analysis Summary */}
          {(modelTest || marketTest || reasoningTest) && (
            <Card className="bg-accent-gold/10 border-accent-gold/20">
              <CardHeader>
                <CardTitle className="text-lg text-accent-gold">Analysis Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${modelTest ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                    <span className="text-secondary">Model Identification: {modelTest ? 'Complete' : 'Pending'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${marketTest ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                    <span className="text-secondary">Real-Time Data Access: {marketTest ? 'Complete' : 'Pending'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${reasoningTest ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                    <span className="text-secondary">Advanced Reasoning: {reasoningTest ? 'Complete' : 'Pending'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}