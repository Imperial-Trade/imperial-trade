
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, TrendingUp, Calendar, Clock, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { InvokeLLM } from '@/api/integrations';
import { OpportunitySignal } from '@/api/entities';
import { getMarketData } from '@/api/functions';

export default function OpportunityScanner() {
  const [signals, setSignals] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [marketData, setMarketData] = useState(null);
  const [dataStatus, setDataStatus] = useState('checking');

  useEffect(() => {
    loadSignals();
    checkMarketDataAvailability();
  }, []);

  const checkMarketDataAvailability = async () => {
    try {
      // The API requires a list of symbols to check. We check a common symbol
      // to determine if the price feed service is live.
      const priceData = await getMarketData({ symbols: ['XAU/USD'] });
      if (priceData?.data?.prices && Object.keys(priceData.data.prices).length > 0) {
        setMarketData(priceData.data.prices);
        setDataStatus('live');
      } else {
        setDataStatus('limited');
      }
    } catch (error) {
      console.error('Market data check failed:', error);
      setDataStatus('mock');
    }
  };

  const loadSignals = async () => {
    try {
      const fetchedSignals = await OpportunitySignal.list('-created_date', 10);
      setSignals(fetchedSignals.filter(s => s.status === 'active'));
    } catch (error) {
      console.error('Error loading signals:', error);
    }
  };

  const scanForOpportunities = async () => {
    setIsScanning(true);

    try {
      let scanPrompt = `
        You are an expert market analyst. Based on current market conditions, identify high-probability trading opportunities.

        CURRENT MARKET DATA:
        ${marketData ? `Live Prices: ${JSON.stringify(marketData)}` : 'Using general market analysis'}
        
        Analysis Framework:
        1. Major forex pairs (EUR/USD, GBP/USD, USD/JPY, AUD/USD, USD/CAD)
        2. Major indices (S&P 500, NASDAQ, FTSE, DAX)
        3. Commodities (Gold, Silver, Oil, Copper)
        4. Cryptocurrencies (Bitcoin, Ethereum)

        For each opportunity, consider:
        - Current price action and momentum
        - Key support/resistance levels
        - Economic events impact
        - Market sentiment
        - Volume confirmation

        Provide 3-5 HIGH-QUALITY opportunities with detailed analysis.
      `;

      // Enhanced prompt with real market context
      if (dataStatus === 'live') {
        scanPrompt += `
        
        REAL-TIME PRICE ANALYSIS:
        Use the provided live price data to identify:
        - Breakout opportunities
        - Reversal patterns at key levels
        - Momentum shifts
        - Cross-asset correlations
        `;
      }

      const result = await InvokeLLM({
        prompt: scanPrompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            market_context: {
              type: "string",
              description: "Current overall market sentiment and conditions"
            },
            data_sources: {
              type: "array",
              items: { type: "string" },
              description: "Sources of data used for analysis"
            },
            opportunities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  instrument: { type: "string" },
                  current_price: { type: "number" },
                  signal_type: { type: "string" },
                  description: { type: "string" },
                  probability: { type: "number" },
                  key_levels: { type: "array", items: { type: "number" } },
                  time_frame: { type: "string" },
                  entry_trigger: { type: "string" },
                  risk_reward: { type: "number" }
                }
              }
            }
          }
        }
      });

      // Save new signals to database with enhanced metadata
      for (const opp of result.opportunities) {
        await OpportunitySignal.create({
          ...opp,
          data_source: dataStatus,
          market_context: result.market_context,
          expiry_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });
      }

      setLastScan(new Date());
      loadSignals();
    } catch (error) {
      console.error('Error scanning for opportunities:', error);
    }

    setIsScanning(false);
  };

  const getSignalTypeColor = (type) => {
    const colors = {
      breakout: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      reversal: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      news_event: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      pattern: 'bg-green-500/10 text-green-400 border-green-500/20',
      momentum: 'bg-red-500/10 text-red-400 border-red-500/20'
    };
    return colors[type] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  };

  const getProbabilityColor = (probability) => {
    if (probability >= 80) return 'text-accent-green';
    if (probability >= 60) return 'text-accent-gold';
    return 'text-accent-red';
  };

  const getDataStatusInfo = () => {
    switch (dataStatus) {
      case 'live':
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-accent-green" />,
          text: 'Live Market Data Active',
          color: 'text-accent-green'
        };
      case 'limited':
        return {
          icon: <AlertCircle className="w-4 h-4 text-accent-gold" />,
          text: 'Limited Market Data',
          color: 'text-accent-gold'
        };
      case 'mock':
        return {
          icon: <AlertCircle className="w-4 h-4 text-accent-red" />,
          text: 'Using Simulated Data',
          color: 'text-accent-red'
        };
      default:
        return {
          icon: <Clock className="w-4 h-4 text-secondary" />,
          text: 'Checking Data Sources...',
          color: 'text-secondary'
        };
    }
  };

  const statusInfo = getDataStatusInfo();

  return (
    <Card className="glass-effect">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-6 h-6 text-blue-400" />
              AI Opportunity Scanner - "The Signal Finder"
            </CardTitle>
            <p className="text-secondary mt-2">
              AI-powered market analysis identifying high-probability trading setups
            </p>
            
            {/* Data Status Indicator */}
            <div className="flex items-center gap-2 mt-3">
              {statusInfo.icon}
              <span className={`text-sm ${statusInfo.color}`}>
                {statusInfo.text}
              </span>
              {dataStatus === 'live' && marketData && (
                <Badge variant="outline" className="text-xs border-accent-green text-accent-green">
                  {Object.keys(marketData).length} assets tracked
                </Badge>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              onClick={scanForOpportunities}
              disabled={isScanning}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isScanning ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Scanning...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Scan Markets
                </>
              )}
            </Button>
            <Button
              onClick={checkMarketDataAvailability}
              variant="outline"
              size="sm"
              className="text-xs border-default text-secondary hover:bg-surface hover:text-primary"
            >
              Refresh Data Status
            </Button>
          </div>
        </div>
        {lastScan && (
          <p className="text-sm text-secondary flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Last scan: {lastScan.toLocaleTimeString()}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {dataStatus === 'mock' && (
          <div className="mb-6 p-4 bg-accent-red/10 border border-accent-red/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-accent-red mt-0.5" />
              <div>
                <h4 className="font-semibold text-accent-red mb-1">Demo Mode Active</h4>
                <p className="text-sm text-secondary">
                  Currently showing simulated market opportunities. Connect real market data feeds for live analysis.
                  <br />
                  <span className="text-accent-red">Note: Do not trade based on demo signals.</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {signals.length === 0 ? (
          <div className="text-center py-8">
            <Search className="w-16 h-16 text-secondary/50 mx-auto mb-4" />
            <p className="text-secondary">No active signals found. Click "Scan Markets" to find opportunities.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {signals.map((signal) => (
              <Card key={signal.id} className="bg-surface/50 border-default hover:border-accent-green transition-colors">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-primary text-lg">{signal.instrument}</h3>
                      {signal.current_price && (
                        <p className="text-sm text-secondary">Current: ${signal.current_price}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`${getSignalTypeColor(signal.signal_type)} border`}>
                          {signal.signal_type.replace('_', ' ')}
                        </Badge>
                        <span className={`font-semibold ${getProbabilityColor(signal.probability)}`}>
                          {signal.probability}% probability
                        </span>
                        {signal.risk_reward && (
                          <Badge variant="outline" className="text-xs">
                            R:R {signal.risk_reward}:1
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="border-default text-secondary mb-2">
                        {signal.time_frame}
                      </Badge>
                      {dataStatus !== 'mock' && (
                        <div className="flex items-center gap-1 text-xs text-accent-green">
                          <CheckCircle2 className="w-3 h-3" />
                          Live Data
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-secondary mb-3">{signal.description}</p>

                  {signal.entry_trigger && (
                    <div className="mb-3 p-2 bg-accent-blue/10 rounded text-sm">
                      <strong className="text-accent-blue">Entry Trigger:</strong> {signal.entry_trigger}
                    </div>
                  )}
                  
                  {signal.key_levels && signal.key_levels.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="w-4 h-4 text-accent-green" />
                      <span className="text-secondary">Key levels:</span>
                      <div className="flex gap-2">
                        {signal.key_levels.map((level, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {level}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
