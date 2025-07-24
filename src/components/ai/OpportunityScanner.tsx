
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, TrendingUp, Clock, RefreshCw, AlertCircle, Target, Zap, BarChart3, Filter, SortDesc, Eye, Bell, Play, Brain, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ComplianceNotice, EducationalBadge, HypotheticalBadge } from '@/components/compliance/ComplianceNotice';
import { useAuth } from '@/contexts/AuthContext';
import { signalProcessingService, EducationalSignal } from '@/services/signalProcessingService';
import { marketDataService, MarketDataPoint } from '@/services/MarketDataService';

export default function OpportunityScanner() {
  const { user } = useAuth();
  const [signals, setSignals] = useState<EducationalSignal[]>([]);
  const [livePrice, setLivePrice] = useState<Record<string, MarketDataPoint>>({});
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState<Date | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    market: 'all',
    strategy: 'all',
    timeframe: 'all'
  });
  const [sortBy, setSortBy] = useState('probability');

  useEffect(() => {
    loadSignals();
  }, []);

  const fetchLivePrices = async (symbols: string[]) => {
    try {
      const marketData = await marketDataService.getMarketData({ symbols });
      const priceMap: Record<string, MarketDataPoint> = {};
      marketData.forEach(data => {
        priceMap[data.symbol] = data;
      });
      setLivePrice(priceMap);
    } catch (error) {
      console.error('Error fetching live prices:', error);
    }
  };

  const loadSignals = async () => {
    if (!user) {
      console.log('No user available for educational pattern scanning');
      return;
    }

    try {
      setScanError(null);
      const educationalSignals = await signalProcessingService.scanForEducationalOpportunities(user.id);
      
      // Fetch live prices for signals
      const symbols = educationalSignals.map(s => s.instrument);
      await fetchLivePrices(symbols);
      
      // Apply filters and sorting
      let filteredSignals = educationalSignals.filter(s => s.status === 'active');
      
      if (filters.market !== 'all') {
        filteredSignals = filteredSignals.filter(s => s.market === filters.market);
      }
      if (filters.strategy !== 'all') {
        filteredSignals = filteredSignals.filter(s => s.strategy.includes(filters.strategy));
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
            return parseInt(b.id.split('-')[1] || '0') - parseInt(a.id.split('-')[1] || '0');
          default:
            return 0;
        }
      });

      setSignals(filteredSignals);
    } catch (error) {
      console.error('Error loading educational signals:', error);
      setScanError('Failed to load educational patterns. Using fallback examples.');
    }
  };

  const scanForOpportunities = async () => {
    if (!user) {
      setScanError('Please sign in to access personalized educational content');
      return;
    }

    setIsScanning(true);
    setScanError(null);
    
    try {
      console.log('Starting educational pattern scan for user:', user.id);
      
      // Call signal-finder-agent for AI-powered educational content
      const educationalSignals = await signalProcessingService.scanForEducationalOpportunities(user.id);
      
      // Apply current filters and sorting
      await loadSignals();
      setLastScan(new Date());
      
      console.log('Educational pattern scan completed successfully');
    } catch (error) {
      console.error('Error scanning for educational opportunities:', error);
      setScanError('Failed to scan for educational patterns. Please try again.');
    }
    setIsScanning(false);
  };

  // Update signals when filters change
  useEffect(() => {
    loadSignals();
  }, [filters, sortBy, user]);

  const getSignalTypeColor = (type: string) => {
    const colors = {
      breakout: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      reversal: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      news_event: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      pattern: 'bg-green-500/10 text-green-400 border-green-500/20',
      momentum: 'bg-red-500/10 text-red-400 border-red-500/20',
      educational: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 80) return 'text-green-400';
    if (probability >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getConfidenceGauge = (score: number) => {
    const percentage = score;
    const color = score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400';
    return { percentage, color };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Compliance Notice */}
        <ComplianceNotice type="educational" size="md" />

        {/* Header with Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">AI Pattern Scanner</h1>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
              <Brain className="w-3 h-3 mr-1" />
              Live Market Data
            </Badge>
          </div>
          {lastScan && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Last Scan: {lastScan.toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Error Display */}
        {scanError && (
          <Card className="bg-orange-500/10 border-orange-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-orange-400">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{scanError}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Authentication Notice */}
        {!user && (
          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-blue-400">
                <Brain className="w-4 h-4" />
                <span className="text-sm">Sign in to access personalized AI-powered educational content based on your trading patterns</span>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-3">
            <div className="flex flex-wrap gap-2 items-center justify-between">
              {/* Left side - Filters */}
              <div className="flex flex-wrap gap-2 items-center">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">Educational Filters:</span>
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
                    <SelectItem value="educational">Educational</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.strategy} onValueChange={(value) => setFilters(prev => ({ ...prev, strategy: value }))}>
                  <SelectTrigger className="w-[180px] h-8 bg-background text-xs">
                    <SelectValue placeholder="Strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Educational Patterns</SelectItem>
                    <SelectItem value="Breakout">Educational Breakout</SelectItem>
                    <SelectItem value="Momentum">Educational Momentum</SelectItem>
                    <SelectItem value="Reversal">Educational Reversal</SelectItem>
                    <SelectItem value="Pattern">Educational Pattern</SelectItem>
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
                    <SelectItem value="probability">Educational Probability</SelectItem>
                    <SelectItem value="risk_reward">Risk/Reward Learning</SelectItem>
                    <SelectItem value="recency">Latest Examples</SelectItem>
                  </SelectContent>
                </Select>

                <Button 
                  onClick={scanForOpportunities} 
                  disabled={isScanning || !user} 
                  size="sm"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white h-8 px-3 text-xs"
                >
                  {isScanning ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent mr-1" />
                      AI Learning Scan...
                    </>
                  ) : (
                    <>
                      <Brain className="w-3 h-3 mr-1" />
                      AI Pattern Scan
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
                <BookOpen className="w-10 h-10 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {user ? 'No Educational Patterns Available' : 'Sign In for Personalized Learning'}
              </h3>
              <p className="text-muted-foreground">
                {user 
                  ? 'Click "AI Pattern Scan" to discover new educational opportunities based on your trading patterns'
                  : 'Sign in to access AI-powered educational content personalized to your trading style'
                }
              </p>
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
                     <Card className="bg-card hover:bg-card/80 border-border hover:border-blue-500/50 transition-all duration-300">
                       <CardContent className="p-6">
                         {/* Header */}
                         <div className="flex items-start justify-between mb-4">
                           <div>
                             <h3 className="text-lg font-bold text-foreground">{signal.instrument}</h3>
                             <p className="text-sm text-muted-foreground">{signal.asset_name}</p>
                           </div>
                           <Badge className={`${getSignalTypeColor(signal.signal_type)} border`}>
                             {signal.signal_type.replace('_', ' ')}
                           </Badge>
                         </div>

                         {/* Live Price & Confidence */}
                         <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                           <div className="flex items-center justify-between mb-2">
                             <div>
                               <div className="text-xl font-bold text-foreground">
                                 ${livePrice[signal.instrument]?.price || signal.current_price}
                               </div>
                               {livePrice[signal.instrument] && (
                                 <div className={`text-sm flex items-center gap-1 ${
                                   livePrice[signal.instrument].changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                                 }`}>
                                   <TrendingUp className="w-3 h-3" />
                                   {livePrice[signal.instrument].changePercent.toFixed(2)}%
                                 </div>
                               )}
                             </div>
                             <div className="text-right">
                               <div className={`text-xl font-bold ${confidence.color}`}>
                                 {confidence.percentage}%
                               </div>
                               <div className="text-xs text-muted-foreground">Confidence</div>
                             </div>
                           </div>
                           <div className="flex items-center gap-2 text-xs text-muted-foreground">
                             <span>{signal.time_frame}</span>
                             <span>•</span>
                             <span>R:R {signal.risk_reward}:1</span>
                           </div>
                         </div>

                         {/* Analysis */}
                         <div className="mb-4">
                           <h4 className="text-sm font-semibold text-foreground mb-2">Analysis</h4>
                           <p className="text-sm text-muted-foreground">{signal.rationale}</p>
                         </div>

                         {/* Action Buttons */}
                         <div className="flex gap-2">
                           <Button variant="outline" size="sm" className="flex-1">
                             <Eye className="w-4 h-4 mr-1" />
                             View
                           </Button>
                           <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700">
                             <Target className="w-4 h-4 mr-1" />
                             Track
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
