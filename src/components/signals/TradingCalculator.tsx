import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calculator, DollarSign, Percent, TrendingUp, AlertTriangle, Hourglass, Activity, Target, ArrowUp, ArrowDown, Zap, RefreshCw, Wifi, WifiOff, Signal, TrendingDown } from 'lucide-react';
import { calculatePnL, calculateRiskAmount, formatLotSize, getLotSizeSpec, calculatePositionSize } from '@/utils/lotSizing';

export default function TradingCalculator({ alert, livePrice }) {
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
  const currentPrice = typeof livePrice === 'number' && livePrice > 0 
    ? livePrice 
    : (livePrice?.price && livePrice.price > 0 ? livePrice.price : alert.entry_price);
    
  // Calculate price change from entry
  const priceChangeFromEntry = currentPrice - alert.entry_price;
  const priceChangePercentage = ((priceChangeFromEntry / alert.entry_price) * 100);
  const isPriceUp = priceChangeFromEntry > 0;
  
  // Enhanced price tracking with trend detection
  useEffect(() => {
    if (prevPriceRef.current !== null && prevPriceRef.current !== currentPrice) {
      // Price change flash effect
      setPriceChangeFlash(true);
      const timer = setTimeout(() => setPriceChangeFlash(false), 300);

      // Update price history for trend detection
      const now = Date.now();
      priceHistoryRef.current = [
        ...priceHistoryRef.current.slice(-4), // Keep last 5 prices
        { price: currentPrice, timestamp: now }
      ];

      // Determine trend direction
      if (priceHistoryRef.current.length >= 3) {
        const recent = priceHistoryRef.current.slice(-3);
        const isUpTrend = recent.every((item, i) => i === 0 || item.price > recent[i - 1].price);
        const isDownTrend = recent.every((item, i) => i === 0 || item.price < recent[i - 1].price);
        
        if (isUpTrend) setTrendDirection('up');
        else if (isDownTrend) setTrendDirection('down');
        else setTrendDirection('neutral');
      }

      return () => clearTimeout(timer);
    }
    prevPriceRef.current = currentPrice;
  }, [currentPrice]);
  
  
  // Calculate pip distances to levels
  const calculatePipDistance = (fromPrice, toPrice) => {
    const symbol = alert.tradermade_symbol || alert.asset_name || '';
    const spec = getLotSizeSpec(symbol);
    
    // Calculate the actual price difference
    const priceDiff = Math.abs(toPrice - fromPrice);
    
    // Convert to pips based on asset type
    if (symbol.includes('JPY')) {
      return (priceDiff * 100).toFixed(1); // JPY pairs: 1 pip = 0.01
    } else if (symbol.includes('USD') && (symbol.includes('XAU') || symbol.includes('GOLD'))) {
      return (priceDiff * 10).toFixed(1); // Gold: 1 pip = 0.1
    } else if (symbol.includes('BTC') || symbol.includes('ETH')) {
      return priceDiff.toFixed(0); // Crypto: 1 pip = 1 point
    } else {
      return (priceDiff * 10000).toFixed(1); // Standard forex: 1 pip = 0.0001
    }
  };
  
  // Calculate maximum lot size based on both margin requirements AND risk limit
  const maxLotSizeByMargin = useMemo(() => {
    const balance = parseFloat(accountBalance) || 0;
    const entryPrice = alert.entry_price || 0;
    const stopLoss = alert.stop_loss || 0;
    const symbol = alert.tradermade_symbol || alert.asset_name || '';
    
    if (!balance || !entryPrice || !stopLoss || !symbol) return null;
    
    // Handle livePrice - use current price for active trades, entry price for pending
    const currentPrice = typeof livePrice === 'number' && livePrice > 0 
      ? livePrice 
      : (livePrice?.price && livePrice.price > 0 ? livePrice.price : entryPrice);
    
    // Use current price for active trades, entry price for pending orders
    const basePrice = isPending ? entryPrice : currentPrice;
    
    // Calculate max lot size based on risk (100% of account balance)
    const maxRiskAmount = balance; // Use 100% of account as max risk
    const maxLotsByRisk = calculatePositionSize(maxRiskAmount, basePrice, stopLoss, symbol);
    
    // Return the risk-based limit (this ensures risk never exceeds account balance)
    return Math.max(0.01, maxLotsByRisk); // Minimum 0.01 lots
  }, [accountBalance, alert, livePrice, isPending]);

  // Prevent scroll wheel from changing number inputs
  const handleNumberInputWheel = (e) => {
    e.target.blur();
  };

  // Calculate all trading metrics in real-time
  const calculations = useMemo(() => {
    const balance = parseFloat(accountBalance) || 0;
    const lots = parseFloat(lotSize) || 0;
    const entryPrice = alert.entry_price || 0;
    const stopLoss = alert.stop_loss || 0;
    
    // Handle livePrice - it can be a number or an object with price property
    const currentPrice = typeof livePrice === 'number' && livePrice > 0 
      ? livePrice 
      : (livePrice?.price && livePrice.price > 0 ? livePrice.price : entryPrice);

    if (!balance || !lots || !entryPrice || !stopLoss) {
      return null;
    }

    const isBuy = alert.trade_type.includes('buy');
    const symbol = alert.tradermade_symbol || alert.asset_name || '';
    
    // Calculate risk using current price for active trades, entry price for pending orders
    const riskBasePrice = isPending ? entryPrice : currentPrice;
    const totalRisk = calculateRiskAmount(riskBasePrice, stopLoss, lots, symbol);
    const riskPercentage = (totalRisk / balance) * 100;

    // Calculate current P&L using proper lot sizing mechanics
    const currentPnL = calculatePnL(entryPrice, currentPrice, lots, symbol);
    const currentPnLPercentage = (currentPnL / balance) * 100;

    // Calculate potential rewards for each TP level
    const takeProfits = [
      { level: 1, price: alert.tp1 },
      { level: 2, price: alert.tp2 },
      { level: 3, price: alert.tp3 },
      { level: 4, price: alert.tp4 },
      { level: 5, price: alert.tp5 }
    ].filter(tp => tp.price && tp.price > 0);

    const rewards = takeProfits.map(tp => {
      // For reward calculation: 
      // - Pending orders: Calculate from entry price to TP (potential reward if entered)
      // - Active trades: Calculate from CURRENT price to TP (reward from current position)
      const basePrice = isPending ? entryPrice : currentPrice;
      const totalReward = calculatePnL(basePrice, tp.price, lots, symbol);
      const rewardRiskRatio = totalRisk > 0 ? Math.abs(totalReward) / totalRisk : 0;
      return {
        level: tp.level,
        price: tp.price,
        usd: Math.abs(totalReward),
        ratio: rewardRiskRatio
      };
    });

    return {
      totalRisk,
      riskPercentage,
      currentPnL,
      currentPnLPercentage,
      rewards,
      isCurrentlyProfit: currentPnL > 0
    };
  }, [accountBalance, lotSize, alert, livePrice]);
  
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
        const currentRiskLevel = calculations.riskPercentage > 10 ? 'critical' : 
                               calculations.riskPercentage > 5 ? 'high' : 'normal';
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

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPercentage = (value) => {
    const color = value >= 0 ? 'text-emerald-400' : 'text-red-400';
    const sign = value >= 0 ? '+' : '';
    return <span className={color}>{sign}{value.toFixed(2)}%</span>;
  };

  return (
    <Card className="bg-gray-900/50 border-gray-700 text-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-gray-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-emerald-400" />
            Position Calculator - {alert.asset_name}
          </div>
          <div className="flex items-center gap-2">
            {/* Live Price Trend Indicator */}
            {trendDirection !== 'neutral' && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
                trendDirection === 'up' 
                  ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-700/50' 
                  : 'bg-red-900/30 text-red-400 border border-red-700/50'
              }`}>
                {trendDirection === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {trendDirection === 'up' ? 'Bullish' : 'Bearish'}
              </div>
            )}
            {/* Connection Status */}
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
              livePrice?.connectionStatus === 'connected' 
                ? 'bg-emerald-900/30 text-emerald-400' 
                : 'bg-red-900/30 text-red-400'
            }`}>
              {livePrice?.connectionStatus === 'connected' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {livePrice?.connectionStatus === 'connected' ? 'Live' : 'Offline'}
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input Fields */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs text-gray-400">Account Balance</Label>
            <Input
              type="number"
              step="any"
              placeholder="10000"
              value={accountBalance}
              onChange={(e) => setAccountBalance(e.target.value)}
              onWheel={handleNumberInputWheel}
              className="bg-gray-800 border-gray-600 text-white h-8 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-gray-400">
              Position Size 
              {maxLotSizeByMargin && (
                <span className="ml-2 text-xs text-emerald-400">
                  Max: {maxLotSizeByMargin.toFixed(2)}
                </span>
              )}
            </Label>
            <Input
              type="number"
              step="any"
              placeholder="0.1"
              value={lotSize}
              max={maxLotSizeByMargin || undefined}
              onChange={(e) => {
                const inputValue = e.target.value;
                const numValue = parseFloat(inputValue);
                
                // Prevent input if exceeding margin limit
                if (maxLotSizeByMargin && numValue > maxLotSizeByMargin) {
                  // Don't allow the input - enforce hard limit
                  return;
                }
                setLotSize(inputValue);
              }}
              onWheel={handleNumberInputWheel}
              className={`bg-gray-800 border-gray-600 text-white h-8 text-sm ${
                maxLotSizeByMargin && parseFloat(lotSize) > maxLotSizeByMargin 
                  ? 'border-red-500 ring-1 ring-red-500' 
                  : ''
              }`}
            />
            {maxLotSizeByMargin && parseFloat(lotSize) > maxLotSizeByMargin && (
              <div className="text-xs text-red-400 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Position size exceeds margin limit (100% margin used)
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Live Price & Market Data Display */}
        {livePrice && (
          <div className={`bg-gray-800/50 rounded-md p-3 border transition-all duration-300 ${
            priceChangeFlash 
              ? (isPriceUp ? 'border-emerald-400 bg-emerald-900/20' : 'border-red-400 bg-red-900/20')
              : 'border-gray-700'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity className={`w-4 h-4 ${livePrice?.connectionStatus === 'connected' ? 'text-emerald-400' : 'text-red-400'}`} />
                <span className="text-sm font-medium text-gray-300">Live Market Data</span>
                {livePrice?.connectionStatus && (
                  <Badge variant="outline" className={`text-xs px-1 py-0 ${
                    livePrice.connectionStatus === 'connected' ? 'text-emerald-400 border-emerald-600' : 'text-red-400 border-red-600'
                  }`}>
                    {livePrice.connectionStatus}
                  </Badge>
                )}
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
                  <span className={`text-lg font-bold transition-colors duration-300 ${
                    priceChangeFlash 
                      ? (isPriceUp ? 'text-emerald-400' : 'text-red-400')
                      : 'text-white'
                  }`}>
                    ${currentPrice.toFixed(alert.tradermade_symbol?.includes('JPY') ? 3 : 5)}
                  </span>
                  {priceChangeFromEntry !== 0 && (
                    <div className={`flex items-center gap-1 ${isPriceUp ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isPriceUp ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                      <span className="text-xs font-medium">
                        {isPriceUp ? '+' : ''}{priceChangeFromEntry.toFixed(alert.tradermade_symbol?.includes('JPY') ? 3 : 5)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-400">
                  Entry: ${alert.entry_price.toFixed(alert.tradermade_symbol?.includes('JPY') ? 3 : 5)}
                  {priceChangeFromEntry !== 0 && (
                    <span className={`ml-2 ${isPriceUp ? 'text-emerald-400' : 'text-red-400'}`}>
                      ({isPriceUp ? '+' : ''}{priceChangePercentage.toFixed(2)}%)
                    </span>
                  )}
                </div>
              </div>
              
              {/* Current P&L (only for active trades with position size) */}
              {calculations && !isPending && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">Current P&L</div>
                  <div className={`transition-all duration-400 ${
                    calculationFlash 
                      ? (calculations.isCurrentlyProfit ? 'scale-105 text-emerald-300' : 'scale-105 text-red-300')
                      : (calculations.isCurrentlyProfit ? 'text-emerald-400' : 'text-red-400')
                  }`}>
                    <div className="text-lg font-bold">
                      {formatCurrency(calculations.currentPnL)}
                    </div>
                    <div className="text-xs">
                      {formatPercentage(calculations.currentPnLPercentage)}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Distance to Levels (Pips) */}
            {calculations && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-300 flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  Distance to Levels (Pips)
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-red-900/30 rounded px-2 py-1 border border-red-700/50">
                    <div className="text-red-300 font-medium">Stop Loss</div>
                    <div className="text-white">{calculatePipDistance(currentPrice, alert.stop_loss)} pips</div>
                  </div>
                  {calculations.rewards.length > 0 && (
                    <div className="bg-emerald-900/30 rounded px-2 py-1 border border-emerald-700/50">
                      <div className="text-emerald-300 font-medium">Next TP{calculations.rewards[0].level}</div>
                      <div className="text-white">{calculatePipDistance(currentPrice, calculations.rewards[0].price)} pips</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Pending Order Notice */}
        {isPending && (
             <div className="bg-amber-900/20 rounded-md p-3 border border-amber-700/50 text-center">
                <div className="flex items-center justify-center gap-2 text-amber-300 font-medium">
                    <Hourglass className="w-4 h-4"/>
                    <span>Pending Order Calculation</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                    Risk/Reward is based on the limit price of <span className="font-bold text-white">${alert.entry_price.toFixed(2)}</span>.
                </p>
            </div>
        )}

        {/* Calculations Display (Risk/Reward) */}
        {calculations ? (
          <div className="space-y-3">
            {/* Enhanced Risk Analysis with Dynamic Alerts */}
            <div className={`rounded-md p-3 border transition-all duration-300 ${
              calculations.riskPercentage > 10 
                ? 'bg-red-900/40 border-red-600/60' 
                : calculations.riskPercentage > 5 
                  ? 'bg-red-900/20 border-red-700/50' 
                  : 'bg-yellow-900/20 border-yellow-700/50'
            } ${riskWarningFlash ? 'animate-pulse scale-105' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`w-4 h-4 transition-colors ${
                    calculations.riskPercentage > 10 ? 'text-red-300' : 
                    calculations.riskPercentage > 5 ? 'text-red-400' : 'text-yellow-400'
                  }`} />
                  <span className="text-sm font-medium text-red-300">Risk Analysis</span>
                </div>
                {calculations.riskPercentage > 10 && (
                  <Badge variant="outline" className="text-red-300 border-red-500 text-xs px-1 py-0">
                    CRITICAL
                  </Badge>
                )}
                {calculations.riskPercentage > 5 && calculations.riskPercentage <= 10 && (
                  <Badge variant="outline" className="text-yellow-300 border-yellow-500 text-xs px-1 py-0">
                    HIGH
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-gray-400">Risk (USD)</div>
                  <div className={`font-bold transition-colors ${
                    calculations.riskPercentage > 10 ? 'text-red-300' : 
                    calculations.riskPercentage > 5 ? 'text-red-400' : 'text-yellow-400'
                  }`}>
                    {formatCurrency(calculations.totalRisk)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Risk of Account</div>
                  <div className={`font-bold text-lg transition-all duration-300 ${
                    calculations.riskPercentage > 10 ? 'text-red-300 animate-pulse' : 
                    calculations.riskPercentage > 5 ? 'text-red-400' : 'text-yellow-400'
                  }`}>
                    {calculations.riskPercentage.toFixed(2)}%
                  </div>
                </div>
              </div>
              {calculations.riskPercentage > 10 && (
                <div className="mt-2 text-xs text-red-200 bg-red-900/50 p-2 rounded border border-red-600 animate-pulse">
                  🚨 CRITICAL RISK: Position may cause significant account damage
                </div>
              )}
              {calculations.riskPercentage > 5 && calculations.riskPercentage <= 10 && (
                <div className="mt-2 text-xs text-yellow-200 bg-yellow-900/30 p-2 rounded border border-yellow-600">
                  ⚠️ High Risk Warning: Risking more than 5% of account
                </div>
              )}
            </div>

            {/* Reward Analysis */}
            {calculations.rewards.length > 0 && (
              <div className="bg-emerald-900/20 rounded-md p-3 border border-emerald-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-300">Reward Targets</span>
                </div>
                <div className="space-y-2">
                  {calculations.rewards.map((reward, index) => (
                    <div key={index} className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-emerald-400 border-emerald-600 px-1 py-0 text-xs">
                          TP{reward.level}
                        </Badge>
                        <span className="text-gray-400">
                          ${reward.price.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-emerald-300">
                          {formatCurrency(reward.usd)}
                        </div>
                        <div className="text-emerald-400">
                          {reward.ratio.toFixed(1)}:1 R:R
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500 text-sm">
            Enter your account balance and position size to see calculations
          </div>
        )}
      </CardContent>
    </Card>
  );
}