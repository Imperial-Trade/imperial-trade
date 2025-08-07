import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calculator, DollarSign, Percent, TrendingUp, AlertTriangle, Hourglass, Activity, Target, ArrowUp, ArrowDown, Zap, RefreshCw, Wifi, WifiOff, Signal, TrendingDown, Radio } from 'lucide-react';
import { LimitOrderStatus } from './LimitOrderStatus';
import { calculatePnL, calculateRiskAmount, formatLotSize, getLotSizeSpec, calculatePositionSize } from '@/utils/lotSizing';
import { useWebSocketLivePrice } from '@/hooks/useWebSocketLivePrice';

export default function TradingCalculator({
  alert,
  livePrice: externalLivePrice
}) {
  // Get live price from WebSocket for the current asset
  const symbol = alert.tradermade_symbol || alert.asset_name || '';
  const wsLivePrice = useWebSocketLivePrice(symbol);

  // Use external live price or fallback to WebSocket live price
  const livePrice = externalLivePrice || wsLivePrice;
  const [accountBalance, setAccountBalance] = useState('');
  const [lotSize, setLotSize] = useState('');
  const [priceChangeFlash, setPriceChangeFlash] = useState(false);
  const [calculationFlash, setCalculationFlash] = useState(false);
  const [riskWarningFlash, setRiskWarningFlash] = useState(false);
  const [trendDirection, setTrendDirection] = useState('neutral'); // 'up', 'down', 'neutral'
  const prevPriceRef = useRef(null);
  const prevPnLRef = useRef(null);
  const prevRiskRef = useRef(null);
  const priceHistoryRef = useRef([]);
  const riskLevelRef = useRef('normal');
  const isPending = alert.status === 'pending';

  // Get current price value for calculations
  const currentPrice = typeof livePrice === 'number' && livePrice > 0 ? livePrice : livePrice?.price && livePrice.price > 0 ? livePrice.price : alert.entry_price;

  // Calculate price change from entry
  const priceChangeFromEntry = currentPrice - alert.entry_price;
  const priceChangePercentage = priceChangeFromEntry / alert.entry_price * 100;
  const isPriceUp = priceChangeFromEntry > 0;

  // Enhanced price tracking with trend detection
  useEffect(() => {
    if (prevPriceRef.current !== null && prevPriceRef.current !== currentPrice) {
      // Price change flash effect
      setPriceChangeFlash(true);
      const timer = setTimeout(() => setPriceChangeFlash(false), 300);

      // Update price history for trend detection
      const now = Date.now();
      priceHistoryRef.current = [...priceHistoryRef.current.slice(-4),
      // Keep last 5 prices
      {
        price: currentPrice,
        timestamp: now
      }];

      // Determine trend direction
      if (priceHistoryRef.current.length >= 3) {
        const recent = priceHistoryRef.current.slice(-3);
        const isUpTrend = recent.every((item, i) => i === 0 || item.price > recent[i - 1].price);
        const isDownTrend = recent.every((item, i) => i === 0 || item.price < recent[i - 1].price);
        if (isUpTrend) setTrendDirection('up');else if (isDownTrend) setTrendDirection('down');else setTrendDirection('neutral');
      }
      return () => clearTimeout(timer);
    }
    prevPriceRef.current = currentPrice;
  }, [currentPrice]);

  // Enhanced pip distance calculations for all asset types
  const calculatePipDistance = (fromPrice, toPrice) => {
    const symbol = alert.tradermade_symbol || alert.asset_name || '';
    const priceDiff = Math.abs(toPrice - fromPrice);

    // Enhanced asset type detection with better support for indices
    if (symbol.includes('JPY')) {
      return (priceDiff * 100).toFixed(1); // JPY pairs: 1 pip = 0.01
    } else if (symbol.includes('USD') && (symbol.includes('XAU') || symbol.includes('GOLD'))) {
      return (priceDiff * 10).toFixed(1); // Gold: 1 pip = 0.1
    } else if (symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('CRYPTO')) {
      return priceDiff.toFixed(0); // Crypto: 1 point = 1 unit
    } else if (symbol.includes('NAS100') || symbol.includes('US30') || symbol.includes('USA30') || symbol.includes('SPX500') || symbol.includes('DJ30')) {
      return priceDiff.toFixed(1); // Indices: 1 point = 1 unit
    } else {
      return (priceDiff * 10000).toFixed(1); // Standard forex: 1 pip = 0.0001
    }
  };

  // Get proper terminology for the asset type
  const getPipTerminology = () => {
    const symbol = alert.tradermade_symbol || alert.asset_name || '';
    if (symbol.includes('NAS100') || symbol.includes('US30') || symbol.includes('USA30') || symbol.includes('SPX500') || symbol.includes('DJ30')) {
      return 'points';
    } else if (symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('CRYPTO')) {
      return 'points';
    }
    return 'pips';
  };

  // Calculate maximum lot size based on both margin requirements AND risk limit
  const maxLotSizeByMargin = useMemo(() => {
    const balance = parseFloat(accountBalance) || 0;
    const entryPrice = alert.entry_price || 0;
    const stopLoss = alert.stop_loss || 0;
    const symbol = alert.tradermade_symbol || alert.asset_name || '';
    if (!balance || !entryPrice || !stopLoss || !symbol) return null;

    // Handle livePrice - use current price for active trades, entry price for pending
    const currentPrice = typeof livePrice === 'number' && livePrice > 0 ? livePrice : livePrice?.price && livePrice.price > 0 ? livePrice.price : entryPrice;

    // Use current price for active trades, entry price for pending orders
    const basePrice = isPending ? entryPrice : currentPrice;

    // Calculate max lot size based on risk (100% of account balance)
    const maxRiskAmount = balance; // Use 100% of account as max risk
    const maxLotsByRisk = calculatePositionSize(maxRiskAmount, basePrice, stopLoss, symbol);

    // Return the risk-based limit (this ensures risk never exceeds account balance)
    return Math.max(0.01, maxLotsByRisk); // Minimum 0.01 lots
  }, [accountBalance, alert, livePrice, isPending]);

  // Prevent scroll wheel from changing number inputs
  const handleNumberInputWheel = e => {
    e.target.blur();
  };

  // Calculate all trading metrics in real-time with proper synchronization
  const calculations = useMemo(() => {
    const balance = parseFloat(accountBalance) || 0;
    const lots = parseFloat(lotSize) || 0;
    const entryPrice = alert.entry_price || 0;
    const stopLoss = alert.stop_loss || 0;

    // Extract current price for better dependency tracking
    const priceValue = typeof livePrice === 'number' && livePrice > 0 ? livePrice : livePrice?.price && livePrice.price > 0 ? livePrice.price : entryPrice;

    // Debug logging for price updates
    console.log('🧮 TradingCalculator - Price Update:', {
      symbol: alert.tradermade_symbol || alert.asset_name,
      priceValue,
      livePrice: typeof livePrice === 'object' ? livePrice?.price : livePrice,
      connectionStatus: livePrice?.connectionStatus,
      isLoading: livePrice?.isLoading,
      timestamp: new Date().toISOString()
    });
    if (!balance || !lots || !entryPrice || !stopLoss) {
      return null;
    }
    const isBuy = alert.trade_type.includes('buy');
    const symbol = alert.tradermade_symbol || alert.asset_name || '';

    // LIVE RISK CALCULATION: Use live price for active trades, entry price for pending
    // - Pending orders: Show potential risk from entry to SL
    // - Active trades: Show CURRENT LIVE risk from live price to SL
    const riskBasePrice = isPending ? entryPrice : priceValue;
    const totalRisk = calculateRiskAmount(riskBasePrice, stopLoss, lots, symbol);
    const riskPercentage = totalRisk / balance * 100;

    // Debug logging for risk calculations
    console.log('📊 Risk Calculation Update:', {
      riskBasePrice,
      totalRisk,
      riskPercentage,
      isPending,
      timestamp: new Date().toISOString()
    });

    // Current P&L: Always from entry to current price (shows unrealized P&L for active trades)
    const currentPnL = isPending ? 0 : calculatePnL(entryPrice, priceValue, lots, symbol);
    const currentPnLPercentage = isPending ? 0 : currentPnL / balance * 100;

    // Calculate stop loss distance from current price (real-time)
    const entryToStopPips = parseFloat(calculatePipDistance(entryPrice, stopLoss));
    const currentToStopPips = parseFloat(calculatePipDistance(priceValue, stopLoss));

    // Progress to Stop Loss calculation (how close we are to hitting SL)
    const entryToCurrentPips = parseFloat(calculatePipDistance(entryPrice, priceValue));
    let stopLossProgress = 0;
    if (entryToStopPips > 0) {
      // Check if we're moving towards or away from stop loss
      const isMovingTowardsStopLoss = isBuy ? priceValue <= entryPrice : priceValue >= entryPrice;
      const isStopLossHit = isBuy ? priceValue <= stopLoss : priceValue >= stopLoss;
      if (isStopLossHit) {
        stopLossProgress = 100; // Stop loss hit
      } else if (isMovingTowardsStopLoss) {
        stopLossProgress = entryToCurrentPips / entryToStopPips * 100;
      } else {
        stopLossProgress = 0; // Moving away from stop loss (good)
      }
    }

    // Clamp progress between 0-100%
    stopLossProgress = Math.max(0, Math.min(100, stopLossProgress));
    const stopLossDistance = {
      pips: currentToStopPips,
      percent: Math.abs((stopLoss - priceValue) / priceValue * 100),
      pipPercent: entryToStopPips > 0 ? currentToStopPips / entryToStopPips * 100 : 0,
      progressPercent: stopLossProgress,
      direction: stopLoss > priceValue ? 'above' : 'below',
      isHit: isBuy ? priceValue <= stopLoss : priceValue >= stopLoss,
      isClose: currentToStopPips / Math.max(entryToStopPips, 1) * 100 < 25,
      // Within 25% of SL distance
      isVeryClose: currentToStopPips / Math.max(entryToStopPips, 1) * 100 < 10 // Within 10% of SL distance
    };

    // Calculate potential rewards for each TP level with real-time updates
    const takeProfits = [{
      level: 1,
      price: alert.tp1
    }, {
      level: 2,
      price: alert.tp2
    }, {
      level: 3,
      price: alert.tp3
    }, {
      level: 4,
      price: alert.tp4
    }, {
      level: 5,
      price: alert.tp5
    }].filter(tp => tp.price && tp.price > 0);
    const rewards = takeProfits.map(tp => {
      // LIVE REWARD CALCULATION LOGIC:
      // - Pending orders: Show potential reward from entry to TP
      // - Active trades: Show CURRENT LIVE reward from live price to TP
      const rewardBasePrice = isPending ? entryPrice : priceValue;
      const liveReward = calculatePnL(rewardBasePrice, tp.price, lots, symbol);

      // Risk ratio based on original risk (entry to SL) vs current reward
      const liveRewardRiskRatio = totalRisk > 0 ? Math.abs(liveReward) / totalRisk : 0;

      // LIVE DISTANCE calculations always from current price (updates in real-time)
      const liveDistancePips = parseFloat(calculatePipDistance(priceValue, tp.price));
      const liveDistancePercent = Math.abs((tp.price - priceValue) / priceValue * 100);

      // Progress percentage: calculate completion from entry to TP target
      const entryToTpPips = parseFloat(calculatePipDistance(entryPrice, tp.price));
      const entryToCurrentPips = parseFloat(calculatePipDistance(entryPrice, priceValue));

      // Calculate actual progress (0-100%) - how much of the journey from entry to TP is complete
      let progressPercent = 0;
      if (entryToTpPips > 0) {
        // Check if we're moving in the right direction for the trade type
        const isMovingTowardsTarget = isBuy ? priceValue >= entryPrice : priceValue <= entryPrice;
        const isTargetReached = isBuy ? priceValue >= tp.price : priceValue <= tp.price;
        if (isTargetReached) {
          progressPercent = 100; // Target reached or passed
        } else if (isMovingTowardsTarget) {
          progressPercent = entryToCurrentPips / entryToTpPips * 100;
        } else {
          progressPercent = 0; // Moving away from target
        }
      }

      // Pip-based percentage: calculate remaining distance as percentage of total entry-to-TP distance
      const pipBasedPercent = entryToTpPips > 0 ? liveDistancePips / entryToTpPips * 100 : 0;

      // Clamp progress between 0-100%
      progressPercent = Math.max(0, Math.min(100, progressPercent));
      const isVeryClose = pipBasedPercent < 10; // Within 10% of pip distance is very close
      const isClose = pipBasedPercent < 25; // Within 25% of pip distance is close

      // LIVE STATUS: Check if we've passed this TP level with current price
      const isPassed = isBuy ? priceValue >= tp.price : priceValue <= tp.price;
      return {
        level: tp.level,
        price: tp.price,
        usd: Math.abs(liveReward),
        // LIVE current reward amount
        ratio: liveRewardRiskRatio,
        // LIVE risk:reward ratio
        distancePips: liveDistancePips,
        // LIVE distance in pips
        distancePercent: liveDistancePercent,
        // LIVE distance percentage  
        pipBasedPercent,
        // Pip-based percentage of remaining distance
        progressPercent,
        // NEW: Actual progress completion percentage (0-100%)
        isVeryClose,
        // LIVE proximity status
        isClose,
        // LIVE proximity status
        isPassed,
        // LIVE achievement status
        direction: tp.price > priceValue ? 'above' : 'below' // LIVE direction
      };
    });
    return {
      totalRisk,
      riskPercentage,
      currentPnL,
      currentPnLPercentage,
      stopLossDistance,
      rewards,
      isCurrentlyProfit: currentPnL > 0,
      // Add breakeven info
      breakeven: {
        price: entryPrice,
        distance: parseFloat(calculatePipDistance(priceValue, entryPrice)),
        direction: entryPrice > priceValue ? 'above' : 'below'
      }
    };
  }, [accountBalance, lotSize, alert, livePrice, isPending]);

  // Enhanced flash effects for P&L and risk changes
  useEffect(() => {
    if (calculations) {
      // P&L flash effect
      if (prevPnLRef.current !== null && prevPnLRef.current !== calculations.currentPnL) {
        setCalculationFlash(true);
        const timer = setTimeout(() => setCalculationFlash(false), 400);
      }

      // Risk warning flash effect
      if (prevRiskRef.current !== null && prevRiskRef.current !== calculations.riskPercentage) {
        const currentRiskLevel = calculations.riskPercentage > 10 ? 'critical' : calculations.riskPercentage > 5 ? 'high' : 'normal';
        const prevRiskLevel = riskLevelRef.current;
        if (currentRiskLevel !== prevRiskLevel && currentRiskLevel !== 'normal') {
          setRiskWarningFlash(true);
          const timer = setTimeout(() => setRiskWarningFlash(false), 600);
        }
        riskLevelRef.current = currentRiskLevel;
      }
      prevPnLRef.current = calculations.currentPnL;
      prevRiskRef.current = calculations.riskPercentage;
    }
  }, [calculations]);
  const formatCurrency = value => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };
  const formatPercentage = value => {
    const color = value >= 0 ? 'text-emerald-400' : 'text-red-400';
    const sign = value >= 0 ? '+' : '';
    return <span className={color}>{sign}{value.toFixed(2)}%</span>;
  };

  // Enhanced price formatting for different asset types
  const formatPrice = (price, symbol = '') => {
    if (symbol.includes('NAS100') || symbol.includes('US30') || symbol.includes('USA30')) {
      return price.toFixed(0); // No decimals for major indices
    } else if (symbol.includes('SPX500')) {
      return price.toFixed(1); // 1 decimal for S&P 500
    } else if (symbol.includes('JPY')) {
      return price.toFixed(3); // 3 decimals for JPY pairs
    } else if (symbol.includes('BTC') || symbol.includes('ETH')) {
      return price.toFixed(2); // 2 decimals for crypto
    }
    return price.toFixed(5); // 5 decimals for standard forex
  };
  return <Card className="bg-gray-900/50 border-gray-700 text-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-gray-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-emerald-400" />
            Position Calculator - {alert.asset_name}
            {/* Live Calculation Indicator */}
            {livePrice?.connectionStatus === 'connected' && <div className="flex items-center gap-1 px-2 py-1 bg-emerald-900/30 rounded-full">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-emerald-400 font-medium">LIVE</span>
              </div>}
          </div>
          <div className="flex items-center gap-2">
            {/* Live Price Trend Indicator */}
            {trendDirection !== 'neutral' && <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all duration-300 ${trendDirection === 'up' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-700/50' : 'bg-red-900/30 text-red-400 border border-red-700/50'}`}>
                {trendDirection === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {trendDirection === 'up' ? 'Bullish' : 'Bearish'}
              </div>}
            {/* Connection Status */}
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all duration-300 ${livePrice?.connectionStatus === 'connected' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'}`}>
              {livePrice?.connectionStatus === 'connected' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {livePrice?.connectionStatus === 'connected' ? 'Live' : 'Offline'}
            </div>
            {/* Data Source Indicator */}
            {livePrice?.connectionStatus === 'connected' && <div className="text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded-full">
                {symbol}
              </div>}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input Fields */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs text-gray-400">Account Balance</Label>
            <Input type="number" step="any" placeholder="10000" value={accountBalance} onChange={e => setAccountBalance(e.target.value)} onWheel={handleNumberInputWheel} className="bg-gray-800 border-gray-600 text-white h-8 text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-gray-400">
              Position Size 
              {maxLotSizeByMargin && <span className="ml-2 text-xs text-emerald-400">
                  Max: {maxLotSizeByMargin.toFixed(2)}
                </span>}
            </Label>
            <Input type="number" step="any" placeholder="0.1" value={lotSize} max={maxLotSizeByMargin || undefined} onChange={e => {
            const inputValue = e.target.value;
            const numValue = parseFloat(inputValue);

            // Prevent input if exceeding margin limit
            if (maxLotSizeByMargin && numValue > maxLotSizeByMargin) {
              // Don't allow the input - enforce hard limit
              return;
            }
            setLotSize(inputValue);
          }} onWheel={handleNumberInputWheel} className={`bg-gray-800 border-gray-600 text-white h-8 text-sm ${maxLotSizeByMargin && parseFloat(lotSize) > maxLotSizeByMargin ? 'border-red-500 ring-1 ring-red-500' : ''}`} />
            {maxLotSizeByMargin && parseFloat(lotSize) > maxLotSizeByMargin && <div className="text-xs text-red-400 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Position size exceeds margin limit (100% margin used)
              </div>}
          </div>
        </div>

        {/* Enhanced Live Price & Market Data Display - Hidden but functions still running */}
        {livePrice && <div className={`hidden bg-gray-800/50 rounded-md p-3 border transition-all duration-300 ${priceChangeFlash ? isPriceUp ? 'border-emerald-400 bg-emerald-900/20' : 'border-red-400 bg-red-900/20' : 'border-gray-700'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity className={`w-4 h-4 ${livePrice?.connectionStatus === 'connected' ? 'text-emerald-400' : 'text-red-400'}`} />
                <span className="text-sm font-medium text-gray-300">Live Market Data</span>
                {livePrice?.connectionStatus && <Badge variant="outline" className={`text-xs px-1 py-0 ${livePrice.connectionStatus === 'connected' ? 'text-emerald-400 border-emerald-600' : 'text-red-400 border-red-600'}`}>
                    {livePrice.connectionStatus}
                  </Badge>}
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <RefreshCw className="w-3 h-3" />
                {livePrice?.lastUpdated ? new Date(livePrice.lastUpdated).toLocaleTimeString() : 'Live'}
              </div>
            </div>
            
            {/* Current Price with Change Indicator */}
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <div className="text-xs text-gray-400 mb-1">Current Price</div>
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold transition-colors duration-300 ${priceChangeFlash ? isPriceUp ? 'text-emerald-400' : 'text-red-400' : 'text-white'}`}>
                    ${formatPrice(currentPrice, alert.tradermade_symbol)}
                  </span>
                  {priceChangeFromEntry !== 0 && <div className={`flex items-center gap-1 ${isPriceUp ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isPriceUp ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                      <span className="text-xs font-medium">
                        {isPriceUp ? '+' : ''}{formatPrice(priceChangeFromEntry, alert.tradermade_symbol)}
                      </span>
                    </div>}
                </div>
                <div className="text-xs text-gray-400">
                  Entry: ${formatPrice(alert.entry_price, alert.tradermade_symbol)}
                  {priceChangeFromEntry !== 0 && <span className={`ml-2 ${isPriceUp ? 'text-emerald-400' : 'text-red-400'}`}>
                      ({isPriceUp ? '+' : ''}{priceChangePercentage.toFixed(2)}%)
                    </span>}
                </div>
              </div>
              
              {/* Current P&L (only for active trades with position size) */}
              {calculations && !isPending && <div>
                  <div className="text-xs text-gray-400 mb-1">Current P&L</div>
                  <div className={`transition-all duration-400 ${calculationFlash ? calculations.isCurrentlyProfit ? 'scale-105 text-emerald-300' : 'scale-105 text-red-300' : calculations.isCurrentlyProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                    <div className="text-lg font-bold">
                      {formatCurrency(calculations.currentPnL)}
                    </div>
                    <div className="text-xs">
                      {formatPercentage(calculations.currentPnLPercentage)}
                    </div>
                  </div>
                </div>}
            </div>
            
            {/* Enhanced Distance to All Levels */}
            {calculations && <div className="space-y-3">
                <div className="text-xs font-medium text-gray-300 flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  Distance to Levels ({getPipTerminology()})
                </div>
                
                {/* Stop Loss */}
                <div className="bg-red-900/30 rounded px-2 py-1 border border-red-700/50">
                  <div className="flex justify-between items-center">
                    <div className="text-red-300 font-medium">Stop Loss</div>
                    <div className="text-white text-xs">
                      {calculatePipDistance(currentPrice, alert.stop_loss)} {getPipTerminology()}
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <div className="text-xs text-red-200">
                      ${formatPrice(alert.stop_loss, alert.tradermade_symbol)}
                    </div>
                    <div className="text-xs text-gray-300">
                      {calculations.stopLossDistance.pipPercent.toFixed(1)}% away
                    </div>
                  </div>
                </div>

                {/* All Take Profit Levels */}
                {calculations.rewards.length > 0 && <div className="space-y-2">
                    {calculations.rewards.map(reward => <div key={reward.level} className={`rounded px-2 py-1 border transition-all duration-300 ${reward.isClose ? 'bg-emerald-800/40 border-emerald-600/70' : 'bg-emerald-900/30 border-emerald-700/50'}`}>
                        <div className="flex justify-between items-center">
                          <div className="text-emerald-300 font-medium text-xs">
                            TP{reward.level}
                            {reward.isClose && <span className="ml-1 text-emerald-200">●</span>}
                          </div>
                          <div className="text-white text-xs">
                            {reward.distancePips.toFixed(1)} {getPipTerminology()}
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <div className="text-xs text-emerald-200">
                            ${formatPrice(reward.price, alert.tradermade_symbol)}
                          </div>
                          <div className="text-xs text-gray-300">
                            {reward.pipBasedPercent.toFixed(1)}% away
                          </div>
                        </div>
                      </div>)}
                  </div>}
              </div>}
          </div>}
        
        {/* Pending Order Notice */}
        {isPending && <div className="bg-amber-900/20 rounded-md p-3 border border-amber-700/50 text-center">
                <div className="flex items-center justify-center gap-2 text-amber-300 font-medium">
                    <Hourglass className="w-4 h-4" />
                    <span>Pending Order Calculation</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                    Risk/Reward is based on the limit price of <span className="font-bold text-white">${alert.entry_price.toFixed(2)}</span>.
                </p>
            </div>}

        {/* Risk Analysis */}
        {calculations && <div className="space-y-3">
            <div className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              Risk Analysis
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800/50 rounded-md p-3 border border-gray-700">
                <div className="text-xs text-gray-400 mb-1">Total Risk</div>
                <div className="text-lg font-bold text-red-400">
                  {formatCurrency(calculations.totalRisk)}
                </div>
              </div>
              <div className={`bg-gray-800/50 rounded-md p-3 border transition-all duration-300 ${calculations.riskPercentage > 10 ? 'border-red-500' : calculations.riskPercentage > 5 ? 'border-orange-500' : 'border-gray-700'}`}>
                <div className="text-xs text-gray-400 mb-1">Risk of Account</div>
                <div className={`text-lg font-bold transition-all duration-300 ${riskWarningFlash && calculations.riskPercentage > 5 ? 'scale-105' : ''} ${calculations.riskPercentage > 10 ? 'text-red-400' : calculations.riskPercentage > 5 ? 'text-orange-400' : 'text-emerald-400'}`}>
                  {calculations.riskPercentage.toFixed(2)}%
                </div>
                {calculations.riskPercentage > 10 && <div className="text-xs text-red-300 mt-1 flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    Critical Risk
                  </div>}
                {calculations.riskPercentage > 5 && calculations.riskPercentage <= 10 && <div className="text-xs text-orange-300 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    High Risk
                  </div>}
              </div>
            </div>
            
            {/* Progress to Stop Loss */}
            <div className={`rounded-md p-3 border transition-all duration-300 ${calculations.stopLossDistance.isVeryClose ? 'bg-red-800/30 border-red-500' : calculations.stopLossDistance.isClose ? 'bg-red-900/20 border-red-600' : 'bg-gray-800/50 border-gray-700'}`}>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium text-red-400">Stop Loss</div>
                  {calculations.stopLossDistance.isVeryClose && <Badge variant="outline" className="text-xs px-1 py-0 text-red-300 border-red-500">
                      Critical
                    </Badge>}
                  {calculations.stopLossDistance.isClose && !calculations.stopLossDistance.isVeryClose && <Badge variant="outline" className="text-xs px-1 py-0 text-orange-300 border-orange-500">
                      Close
                    </Badge>}
                </div>
                <div className="text-xs text-gray-400">
                  ${formatPrice(alert.stop_loss, alert.tradermade_symbol)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-gray-400 mb-1">Distance</div>
                  <div className="text-white font-bold text-sm">
                    {calculatePipDistance(alert.entry_price, alert.stop_loss)} {getPipTerminology()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Total Risk $$$</div>
                  <div className="text-red-400 font-bold text-sm">
                    {formatCurrency(calculations.totalRisk)}
                  </div>
                </div>
              </div>
              {/* Progress bar showing how close to stop loss */}
              <div className="mt-2 pt-2 border-t border-gray-700">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">Progress to Stop Loss</span>
                  <span className={`text-xs font-medium ${calculations.stopLossDistance.isHit ? 'text-red-400' : calculations.stopLossDistance.progressPercent >= 75 ? 'text-red-300' : calculations.stopLossDistance.progressPercent >= 50 ? 'text-orange-400' : 'text-emerald-400'}`}>
                    {calculations.stopLossDistance.isHit ? '✗ Hit' : `${calculations.stopLossDistance.progressPercent.toFixed(1)}% exposed`}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full transition-all duration-500 ${calculations.stopLossDistance.isHit ? 'bg-red-500' : calculations.stopLossDistance.progressPercent >= 75 ? 'bg-red-400' : calculations.stopLossDistance.progressPercent >= 50 ? 'bg-orange-400' : 'bg-emerald-400'}`} style={{
                width: `${Math.max(2, calculations.stopLossDistance.progressPercent)}%`
              }}></div>
                </div>
              </div>
              {!isPending && <div className="mt-2 pt-2 border-t border-gray-700">
                  <div className="text-xs text-gray-400">
                    {calculations.stopLossDistance.progressPercent === 0 ? 'Price is moving away from stop loss (favorable)' : `Price needs to move ${calculations.stopLossDistance.direction} by ${(100 - calculations.stopLossDistance.pipPercent).toFixed(1)}% more to avoid stop loss`}
                  </div>
                </div>}
            </div>
          </div>}

        {/* Limit Order Status Management */}
        <LimitOrderStatus alert={alert} />

        {/* Enhanced Reward Targets */}
        {calculations && calculations.rewards.length > 0 && <div className="space-y-3">
            <div className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Reward Targets {!isPending && <span className="text-xs text-gray-400">(from current price)</span>}
            </div>
            <div className="space-y-2">
              {calculations.rewards.map(reward => <div key={reward.level} className={`rounded-md p-3 border transition-all duration-300 ${reward.isClose ? 'bg-emerald-800/20 border-emerald-600' : 'bg-gray-800/50 border-gray-700'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium text-emerald-400">
                        Take Profit {reward.level}
                      </div>
                      {reward.isClose && <Badge variant="outline" className="text-xs px-1 py-0 text-emerald-400 border-emerald-600">
                          Close
                        </Badge>}
                    </div>
                    <div className="text-xs text-gray-400">
                      ${formatPrice(reward.price, alert.tradermade_symbol)}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <div className="text-xs text-gray-400 mb-1">
                        {isPending ? 'Potential' : 'Current'} Reward
                      </div>
                      <div className="text-emerald-400 font-bold text-sm">
                        {formatCurrency(reward.usd)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Risk:Reward</div>
                      <div className={`font-bold text-sm ${reward.ratio >= 2 ? 'text-emerald-400' : reward.ratio >= 1 ? 'text-orange-400' : 'text-red-400'}`}>
                        1:{reward.ratio.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Distance</div>
                      <div className="text-white text-sm">
                        {reward.distancePips.toFixed(1)} {getPipTerminology()}
                      </div>
                    </div>
                  </div>
                  {/* Progress indicator for how close price is to TP */}
                  <div className="mt-2 pt-2 border-t border-gray-700">
                     <div className="flex items-center justify-between mb-1">
                       <span className="text-xs text-gray-400">Progress to TP{reward.level}</span>
                       <span className={`text-xs font-medium ${reward.isPassed ? 'text-emerald-400' : reward.progressPercent >= 75 ? 'text-orange-400' : 'text-gray-400'}`}>
                         {reward.isPassed ? '✓ Passed' : `${reward.progressPercent.toFixed(1)}% complete`}
                       </span>
                     </div>
                     <div className="w-full bg-gray-700 rounded-full h-1.5">
                       <div className={`h-1.5 rounded-full transition-all duration-500 ${reward.isPassed ? 'bg-emerald-400' : reward.progressPercent >= 75 ? 'bg-orange-400' : 'bg-blue-400'}`} style={{
                  width: `${Math.max(2, reward.progressPercent)}%`
                }}></div>
                     </div>
                  </div>
                  {!isPending && <div className="mt-2 pt-2 border-t border-gray-700">
                      <div className="text-xs text-gray-400">
                        Price needs to move {reward.direction} by {reward.pipBasedPercent.toFixed(1)}% in {getPipTerminology()} to reach this target
                      </div>
                    </div>}
                </div>)}
            </div>
          </div>}

        {!calculations && <div className="text-center py-4 text-gray-500 text-sm">
            Enter your account balance and position size to see calculations
          </div>}
      </CardContent>
    </Card>;
}
