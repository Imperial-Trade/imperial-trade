import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, TrendingUp, Calendar, Clock, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
// import { InvokeLLM } from '@/api/integrations';
// import { OpportunitySignal } from '@/api/entities';
// import { getMarketData } from '@/api/functions';

export default function OpportunityScanner() {
  const [signals, setSignals] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [marketData, setMarketData] = useState(null);
  const [dataStatus, setDataStatus] = useState('mock');

  // Mock data
  const mockSignals = [{
    id: 1,
    instrument: 'EUR/USD',
    current_price: 1.0850,
    signal_type: 'breakout',
    description: 'Strong bullish breakout above 1.0830 resistance. Price action showing momentum continuation.',
    probability: 85,
    key_levels: [1.0830, 1.0780, 1.0900],
    time_frame: '4H',
    entry_trigger: 'Break above 1.0860 with volume',
    risk_reward: 2.5,
    status: 'active'
  }, {
    id: 2,
    instrument: 'GBP/USD',
    current_price: 1.2750,
    signal_type: 'reversal',
    description: 'Potential reversal at key support level. RSI showing oversold conditions.',
    probability: 72,
    key_levels: [1.2700, 1.2650, 1.2820],
    time_frame: '1H',
    entry_trigger: 'Bounce from 1.2700 support',
    risk_reward: 1.8,
    status: 'active'
  }, {
    id: 3,
    instrument: 'Gold',
    current_price: 2055.0,
    signal_type: 'pattern',
    description: 'Ascending triangle pattern completion. Bullish momentum building.',
    probability: 78,
    key_levels: [2050.0, 2040.0, 2070.0],
    time_frame: '4H',
    entry_trigger: 'Break above 2060 resistance',
    risk_reward: 3.0,
    status: 'active'
  }];
  const mockMarketData = {
    'EUR/USD': 1.0850,
    'GBP/USD': 1.2750,
    'Gold': 2055.0,
    'XAU/USD': 2055.0
  };
  useEffect(() => {
    loadSignals();
    checkMarketDataAvailability();
  }, []);
  const checkMarketDataAvailability = async () => {
    // Simulate checking market data
    await new Promise(resolve => setTimeout(resolve, 1000));
    setMarketData(mockMarketData);
    setDataStatus('mock');
  };
  const loadSignals = async () => {
    // Use mock data instead of API
    setSignals(mockSignals.filter(s => s.status === 'active'));
  };
  const scanForOpportunities = async () => {
    setIsScanning(true);
    try {
      // Simulate scanning delay
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Generate additional mock opportunities
      const newOpportunities = [{
        id: Date.now(),
        instrument: 'USD/JPY',
        current_price: 148.50,
        signal_type: 'momentum',
        description: 'Strong bullish momentum continuation. Breaking key resistance levels.',
        probability: 82,
        key_levels: [148.00, 147.50, 149.20],
        time_frame: '1H',
        entry_trigger: 'Break above 148.80',
        risk_reward: 2.2,
        status: 'active'
      }];

      // Add new opportunities to existing signals
      setSignals(prev => [...prev, ...newOpportunities]);
      setLastScan(new Date());
    } catch (error) {
      console.error('Error scanning for opportunities:', error);
    }
    setIsScanning(false);
  };
  const getSignalTypeColor = type => {
    const colors = {
      breakout: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      reversal: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      news_event: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      pattern: 'bg-green-500/10 text-green-400 border-green-500/20',
      momentum: 'bg-red-500/10 text-red-400 border-red-500/20'
    };
    return colors[type] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  };
  const getProbabilityColor = probability => {
    if (probability >= 80) return 'text-accent-green';
    if (probability >= 60) return 'text-accent-gold';
    return 'text-accent-red';
  };
  const getDataStatusInfo = () => {
    return {
      icon: <AlertCircle className="w-4 h-4 text-accent-red" />,
      text: 'Using Mock Data',
      color: 'text-accent-red'
    };
  };
  const statusInfo = getDataStatusInfo();
  return <Card className="glass-effect">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold mb-3 tool-title-two-tone">
              <span className="first-part">Opportunity</span> <span className="second-part">Scanner</span>
            </h1>
            
            {/* Data Status Indicator */}
            <div className="flex items-center gap-2 mt-3">
              {statusInfo.icon}
              <span className={`text-sm ${statusInfo.color}`}>
                {statusInfo.text}
              </span>
              {dataStatus === 'mock' && marketData && <Badge variant="outline" className="text-xs border-accent-red text-accent-red">
                  {Object.keys(marketData).length} mock assets
                </Badge>}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={scanForOpportunities} disabled={isScanning} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isScanning ? <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Scanning...
                </> : <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Scan Markets (Mock)
                </>}
            </Button>
            <Button onClick={checkMarketDataAvailability} variant="outline" size="sm" className="text-xs border-default text-secondary hover:bg-surface hover:text-primary">
              Refresh Data Status
            </Button>
          </div>
        </div>
        {lastScan && <p className="text-sm text-secondary flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Last scan: {lastScan.toLocaleTimeString()}
          </p>}
      </CardHeader>
      <CardContent>
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

        {signals.length === 0 ? <div className="text-center py-8">
            <Search className="w-16 h-16 text-secondary/50 mx-auto mb-4" />
            <p className="text-secondary">No active signals found. Click "Scan Markets" to find opportunities.</p>
          </div> : <div className="space-y-4">
            {signals.map(signal => <Card key={signal.id} className="bg-surface/50 border-default hover:border-accent-green transition-colors">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-primary text-lg">{signal.instrument}</h3>
                      {signal.current_price && <p className="text-sm text-secondary">Current: ${signal.current_price}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`${getSignalTypeColor(signal.signal_type)} border`}>
                          {signal.signal_type.replace('_', ' ')}
                        </Badge>
                        <span className={`font-semibold ${getProbabilityColor(signal.probability)}`}>
                          {signal.probability}% probability
                        </span>
                        {signal.risk_reward && <Badge variant="outline" className="text-xs">
                            R:R {signal.risk_reward}:1
                          </Badge>}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="border-default text-secondary mb-2">
                        {signal.time_frame}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-accent-red">
                        <AlertCircle className="w-3 h-3" />
                        Mock Data
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-secondary mb-3">{signal.description}</p>

                  {signal.entry_trigger && <div className="mb-3 p-2 bg-accent-blue/10 rounded text-sm">
                      <strong className="text-accent-blue">Entry Trigger:</strong> {signal.entry_trigger}
                    </div>}
                  
                  {signal.key_levels && signal.key_levels.length > 0 && <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="w-4 h-4 text-accent-green" />
                      <span className="text-secondary">Key levels:</span>
                      <div className="flex gap-2">
                        {signal.key_levels.map((level, index) => <Badge key={index} variant="outline" className="text-xs">
                            {level}
                          </Badge>)}
                      </div>
                    </div>}
                </CardContent>
              </Card>)}
          </div>}
      </CardContent>
    </Card>;
}