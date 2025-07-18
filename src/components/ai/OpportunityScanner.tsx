import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, TrendingUp, Clock, RefreshCw, AlertCircle, Target, Zap, BarChart3, Filter, SortDesc, Eye, Bell, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OpportunityScanner() {
  const [signals, setSignals] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [marketData, setMarketData] = useState(null);
  const [dataStatus, setDataStatus] = useState('mock');
  const [filters, setFilters] = useState({
    market: 'all',
    strategy: 'all',
    timeframe: 'all'
  });
  const [sortBy, setSortBy] = useState('probability');

  // Mock data with enhanced format
  const mockSignals = [{
    id: 1,
    instrument: 'TSLA',
    asset_name: 'Tesla, Inc.',
    current_price: 245.67,
    signal_type: 'breakout',
    description: 'Breaking above key resistance with increasing volume',
    probability: 88,
    key_levels: [240.00, 235.50, 255.00],
    time_frame: '4H',
    entry_trigger: 'Break above $248 with volume',
    risk_reward: 2.5,
    status: 'active',
    market: 'stocks',
    strategy: 'AI Breakout',
    confidence_score: 88,
    mini_chart: '📈',
    rationale: 'Breaking above key resistance with increasing volume'
  }, {
    id: 2,
    instrument: 'EUR/USD',
    asset_name: 'Euro/US Dollar',
    current_price: 1.0850,
    signal_type: 'reversal',
    description: 'Potential reversal at key support level with bullish divergence',
    probability: 75,
    key_levels: [1.0800, 1.0780, 1.0920],
    time_frame: '1H',
    entry_trigger: 'Bounce from 1.0800 support',
    risk_reward: 2.1,
    status: 'active',
    market: 'forex',
    strategy: 'AI Reversal',
    confidence_score: 75,
    mini_chart: '📊',
    rationale: 'RSI oversold with bullish divergence forming'
  }, {
    id: 3,
    instrument: 'BTC/USD',
    asset_name: 'Bitcoin',
    current_price: 43250.0,
    signal_type: 'momentum',
    description: 'Strong bullish momentum continuation above $42K resistance',
    probability: 82,
    key_levels: [42000, 41500, 45000],
    time_frame: '4H',
    entry_trigger: 'Break above $43,500',
    risk_reward: 3.2,
    status: 'active',
    market: 'crypto',
    strategy: 'AI Momentum',
    confidence_score: 82,
    mini_chart: '⚡',
    rationale: 'Volume surge with institutional buying pressure'
  }, {
    id: 4,
    instrument: 'GOLD',
    asset_name: 'Gold Spot',
    current_price: 2055.0,
    signal_type: 'pattern',
    description: 'Ascending triangle pattern completion with bullish bias',
    probability: 79,
    key_levels: [2050.0, 2040.0, 2080.0],
    time_frame: '4H',
    entry_trigger: 'Break above $2060',
    risk_reward: 2.8,
    status: 'active',
    market: 'commodities',
    strategy: 'AI Pattern',
    confidence_score: 79,
    mini_chart: '📐',
    rationale: 'Triangle breakout with volume confirmation'
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
    // Filter and sort signals based on current filters
    let filteredSignals = mockSignals.filter(s => s.status === 'active');
    
    if (filters.market !== 'all') {
      filteredSignals = filteredSignals.filter(s => s.market === filters.market);
    }
    if (filters.strategy !== 'all') {
      filteredSignals = filteredSignals.filter(s => s.strategy === filters.strategy);
    }
    if (filters.timeframe !== 'all') {
      filteredSignals = filteredSignals.filter(s => s.time_frame === filters.timeframe);
    }

    // Sort signals
    filteredSignals.sort((a, b) => {
      switch (sortBy) {
        case 'probability':
          return b.probability - a.probability;
        case 'risk_reward':
          return b.risk_reward - a.risk_reward;
        case 'recency':
          return b.id - a.id;
        default:
          return 0;
      }
    });

    setSignals(filteredSignals);
  };

  const scanForOpportunities = async () => {
    setIsScanning(true);
    try {
      // Simulate scanning delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Reload signals with current filters
      await loadSignals();
      setLastScan(new Date());
    } catch (error) {
      console.error('Error scanning for opportunities:', error);
    }
    setIsScanning(false);
  };

  // Update signals when filters change
  useEffect(() => {
    loadSignals();
  }, [filters, sortBy]);

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
    if (probability >= 80) return 'text-green-400';
    if (probability >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getConfidenceGauge = (score) => {
    const percentage = score;
    const color = score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400';
    return { percentage, color };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with Controls */}
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
          {lastScan && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Last: {lastScan.toLocaleTimeString()}
            </div>
          )}
        </div>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-3">
            <div className="flex flex-wrap gap-2 items-center justify-between">
              {/* Left side - Filters */}
              <div className="flex flex-wrap gap-2 items-center">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">Filters:</span>
                </div>
                
                <Select value={filters.market} onValueChange={(value) => setFilters(prev => ({ ...prev, market: value }))}>
                  <SelectTrigger className="w-[120px] h-8 bg-background text-xs">
                    <SelectValue placeholder="Market" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Markets</SelectItem>
                    <SelectItem value="crypto">Crypto</SelectItem>
                    <SelectItem value="stocks">Stocks</SelectItem>
                    <SelectItem value="forex">Forex</SelectItem>
                    <SelectItem value="commodities">Commodities</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.strategy} onValueChange={(value) => setFilters(prev => ({ ...prev, strategy: value }))}>
                  <SelectTrigger className="w-[130px] h-8 bg-background text-xs">
                    <SelectValue placeholder="Strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Strategies</SelectItem>
                    <SelectItem value="AI Breakout">AI Breakout</SelectItem>
                    <SelectItem value="AI Momentum">AI Momentum</SelectItem>
                    <SelectItem value="AI Reversal">AI Reversal</SelectItem>
                    <SelectItem value="AI Pattern">AI Pattern</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.timeframe} onValueChange={(value) => setFilters(prev => ({ ...prev, timeframe: value }))}>
                  <SelectTrigger className="w-[110px] h-8 bg-background text-xs">
                    <SelectValue placeholder="Timeframe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Timeframes</SelectItem>
                    <SelectItem value="1H">1 Hour</SelectItem>
                    <SelectItem value="4H">4 Hours</SelectItem>
                    <SelectItem value="1D">1 Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Right side - Sort and Scan */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <SortDesc className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">Sort:</span>
                </div>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[120px] h-8 bg-background text-xs">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="probability">Probability</SelectItem>
                    <SelectItem value="risk_reward">Risk/Reward</SelectItem>
                    <SelectItem value="recency">Recency</SelectItem>
                  </SelectContent>
                </Select>

                <Button 
                  onClick={scanForOpportunities} 
                  disabled={isScanning} 
                  size="sm"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white h-8 px-3 text-xs"
                >
                  {isScanning ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent mr-1" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Search className="w-3 h-3 mr-1" />
                      Scan
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Signals Grid */}
        <AnimatePresence>
          {signals.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-500/30 mb-6">
                <Search className="w-10 h-10 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No Active Signals</h3>
              <p className="text-muted-foreground">Click "Scan Markets" to discover new trading opportunities</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {signals.map((signal, index) => {
                const confidence = getConfidenceGauge(signal.confidence_score);
                return (
                  <motion.div
                    key={signal.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="bg-card hover:bg-card/80 border-border hover:border-blue-500/50 transition-all duration-300 group">
                      <CardContent className="p-6">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-bold text-foreground">{signal.instrument}</h3>
                            <p className="text-sm text-muted-foreground">{signal.asset_name}</p>
                          </div>
                          <div className="text-right">
                            <Badge className={`${getSignalTypeColor(signal.signal_type)} border`}>
                              {signal.signal_type.replace('_', ' ')}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">{signal.time_frame}</p>
                          </div>
                        </div>

                        {/* AI Confidence Score */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-foreground">AI Confidence</span>
                            <span className={`text-lg font-bold ${confidence.color}`}>
                              {confidence.percentage}%
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <motion.div
                              className={`h-2 rounded-full ${confidence.percentage >= 80 ? 'bg-green-400' : confidence.percentage >= 60 ? 'bg-yellow-400' : 'bg-red-400'}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${confidence.percentage}%` }}
                              transition={{ duration: 1, delay: index * 0.1 }}
                            />
                          </div>
                        </div>

                        {/* Mini Chart */}
                        <div className="flex items-center gap-3 mb-4 p-3 bg-muted/30 rounded-lg">
                          <div className="text-2xl">{signal.mini_chart}</div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">Price: ${signal.current_price}</p>
                            <p className="text-xs text-muted-foreground">R:R {signal.risk_reward}:1</p>
                          </div>
                        </div>

                        {/* AI Rationale */}
                        <div className="mb-4">
                          <p className="text-sm text-muted-foreground mb-2">
                            <strong className="text-blue-400">AI Analysis:</strong> {signal.rationale}
                          </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-4 border-t border-border">
                          <Button variant="outline" size="sm" className="flex-1">
                            <Eye className="w-4 h-4 mr-1" />
                            Analyze
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1">
                            <Bell className="w-4 h-4 mr-1" />
                            Alert
                          </Button>
                          <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700">
                            <Play className="w-4 h-4 mr-1" />
                            Trade
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}