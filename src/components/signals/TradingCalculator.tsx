
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calculator, DollarSign, Percent, TrendingUp, AlertTriangle, Hourglass } from 'lucide-react';
import { calculatePnL, calculateRiskAmount, formatLotSize, getLotSizeSpec, calculatePositionSize } from '@/utils/lotSizing';

// Enhanced pip value calculator
const calculatePipValue = (symbol, lotSize = 0.01) => {
  const upperSymbol = (symbol || '').toUpperCase();
  
  if (upperSymbol.includes('JPY')) {
    // JPY pairs: 1 pip = 0.01, so for 0.01 lots (1,000 units) = $0.10 per pip
    return (lotSize * 100000 * 0.01) / 150; // Approximate USD/JPY rate
  } else if (upperSymbol.startsWith('XAU')) {
    // Gold: 1 pip = 0.1, so for 0.01 lots = $1 per pip
    return lotSize * 100 * 0.1;
  } else if (upperSymbol.startsWith('BTC')) {
    // Bitcoin: Direct price movement
    return lotSize;
  } else {
    // Standard forex: 1 pip = 0.0001, so for 0.01 lots = $1 per pip
    return lotSize * 100000 * 0.0001;
  }
};

// Calculate pips between two prices
const calculatePipsBetweenPrices = (price1, price2, symbol) => {
  const difference = Math.abs(price2 - price1);
  const upperSymbol = (symbol || '').toUpperCase();
  
  if (upperSymbol.includes('JPY')) {
    return difference / 0.01;
  } else if (upperSymbol.startsWith('XAU')) {
    return difference / 0.1;
  } else if (upperSymbol.startsWith('BTC')) {
    return difference; // Points for crypto
  } else {
    return difference / 0.0001;
  }
};

export default function TradingCalculator({ alert, livePrice }) {
  const [accountBalance, setAccountBalance] = useState('10000');
  const [lotSize, setLotSize] = useState('0.01');
  
  const isPending = alert.status === 'pending';
  
  // Enhanced max lot size calculation with proper risk management
  const maxLotSizeByRisk = useMemo(() => {
    const balance = parseFloat(accountBalance) || 0;
    const entryPrice = alert.entry_price || 0;
    const stopLoss = alert.stop_loss || 0;
    const symbol = alert.tradermade_symbol || alert.asset_name || '';
    
    if (!balance || !entryPrice || !stopLoss || !symbol) return null;
    
    // Use current price for active trades, entry price for pending orders
    const currentPrice = typeof livePrice === 'number' && livePrice > 0 
      ? livePrice 
      : (livePrice?.price && livePrice.price > 0 ? livePrice.price : entryPrice);
    
    const basePrice = isPending ? entryPrice : currentPrice;
    
    // Calculate max risk (2% of account balance for conservative trading)
    const maxRiskAmount = balance * 0.02;
    const maxLotsByRisk = calculatePositionSize(maxRiskAmount, basePrice, stopLoss, symbol);
    
    return Math.max(0.01, Math.min(maxLotsByRisk, balance * 0.001)); // Cap at reasonable maximum
  }, [accountBalance, alert, livePrice, isPending]);

  const handleNumberInputWheel = (e) => {
    e.target.blur();
  };

  // Enhanced calculations with pip-based logic
  const calculations = useMemo(() => {
    const balance = parseFloat(accountBalance) || 0;
    const lots = parseFloat(lotSize) || 0;
    const entryPrice = alert.entry_price || 0;
    const stopLoss = alert.stop_loss || 0;
    
    const currentPrice = typeof livePrice === 'number' && livePrice > 0 
      ? livePrice 
      : (livePrice?.price && livePrice.price > 0 ? livePrice.price : entryPrice);

    if (!balance || !lots || !entryPrice || !stopLoss) {
      return null;
    }

    const isBuy = alert.trade_type.includes('buy');
    const symbol = alert.tradermade_symbol || alert.asset_name || '';
    
    // Calculate risk using appropriate base price
    const riskBasePrice = isPending ? entryPrice : currentPrice;
    const totalRisk = calculateRiskAmount(riskBasePrice, stopLoss, lots, symbol);
    const riskPercentage = (totalRisk / balance) * 100;

    // Calculate current P&L
    const currentPnL = calculatePnL(entryPrice, currentPrice, lots, symbol);
    const currentPnLPercentage = (currentPnL / balance) * 100;

    // Calculate pip values and distances
    const pipValue = calculatePipValue(symbol, lots);
    const riskInPips = calculatePipsBetweenPrices(riskBasePrice, stopLoss, symbol);
    const currentPnLInPips = calculatePipsBetweenPrices(entryPrice, currentPrice, symbol);

    // Calculate potential rewards for each TP level
    const takeProfits = [
      { level: 1, price: alert.tp1 },
      { level: 2, price: alert.tp2 },
      { level: 3, price: alert.tp3 },
      { level: 4, price: alert.tp4 },
      { level: 5, price: alert.tp5 }
    ].filter(tp => tp.price && tp.price > 0);

    const rewards = takeProfits.map(tp => {
      const basePrice = isPending ? entryPrice : currentPrice;
      const totalReward = calculatePnL(basePrice, tp.price, lots, symbol);
      const rewardInPips = calculatePipsBetweenPrices(basePrice, tp.price, symbol);
      const rewardRiskRatio = totalRisk > 0 ? Math.abs(totalReward) / totalRisk : 0;
      
      return {
        level: tp.level,
        price: tp.price,
        usd: Math.abs(totalReward),
        pips: rewardInPips,
        ratio: rewardRiskRatio
      };
    });

    return {
      totalRisk,
      riskPercentage,
      riskInPips,
      currentPnL,
      currentPnLPercentage,
      currentPnLInPips,
      pipValue,
      rewards,
      isCurrentlyProfit: currentPnL > 0
    };
  }, [accountBalance, lotSize, alert, livePrice, isPending]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPips = (pips, symbol) => {
    const upperSymbol = (symbol || '').toUpperCase();
    if (upperSymbol.startsWith('BTC')) {
      return `${pips.toFixed(0)} pts`;
    }
    return `${pips.toFixed(1)} pips`;
  };

  const formatPercentage = (value) => {
    const color = value >= 0 ? 'text-emerald-400' : 'text-red-400';
    const sign = value >= 0 ? '+' : '';
    return <span className={color}>{sign}{value.toFixed(2)}%</span>;
  };

  return (
    <Card className="bg-gray-900/50 border-gray-700 text-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
          <Calculator className="w-4 h-4 text-emerald-400" />
          Position Calculator - {alert.asset_name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input Fields */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs text-gray-400">Account Balance ($)</Label>
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
              Position Size (lots)
              {maxLotSizeByRisk && (
                <span className="ml-2 text-xs text-emerald-400">
                  Max: {maxLotSizeByRisk.toFixed(3)}
                </span>
              )}
            </Label>
            <Input
              type="number"
              step="0.001"
              placeholder="0.01"
              value={lotSize}
              max={maxLotSizeByRisk || undefined}
              onChange={(e) => {
                const inputValue = e.target.value;
                const numValue = parseFloat(inputValue);
                
                if (maxLotSizeByRisk && numValue > maxLotSizeByRisk) {
                  return;
                }
                setLotSize(inputValue);
              }}
              onWheel={handleNumberInputWheel}
              className={`bg-gray-800 border-gray-600 text-white h-8 text-sm ${
                maxLotSizeByRisk && parseFloat(lotSize) > maxLotSizeByRisk 
                  ? 'border-red-500 ring-1 ring-red-500' 
                  : ''
              }`}
            />
          </div>
        </div>

        {/* Live P&L Display (Only for Active Trades) */}
        {livePrice && !isPending && calculations && (
          <div className="bg-gray-800/50 rounded-md p-3 border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-blue-300">Current P&L</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-gray-400">USD P&L</div>
                <div className={`font-bold ${calculations.isCurrentlyProfit ? 'text-emerald-300' : 'text-red-300'}`}>
                  {formatCurrency(calculations.currentPnL)}
                </div>
              </div>
              <div>
                <div className="text-gray-400">Pip P&L</div>
                <div className={`font-bold ${calculations.isCurrentlyProfit ? 'text-emerald-300' : 'text-red-300'}`}>
                  {calculations.isCurrentlyProfit ? '+' : ''}{formatPips(calculations.currentPnLInPips, alert.tradermade_symbol)}
                </div>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-400">
              Pip Value: {formatCurrency(calculations.pipValue)} per pip
            </div>
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
              Risk/Reward based on limit price: <span className="font-bold text-white">${alert.entry_price.toFixed(2)}</span>
            </p>
          </div>
        )}

        {/* Calculations Display */}
        {calculations ? (
          <div className="space-y-3">
            {/* Risk Analysis */}
            <div className="bg-red-900/20 rounded-md p-3 border border-red-700/50">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-sm font-medium text-red-300">Risk Analysis</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-gray-400">Risk (USD)</div>
                  <div className="font-bold text-red-300">
                    {formatCurrency(calculations.totalRisk)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Risk (Pips)</div>
                  <div className="font-bold text-red-300">
                    {formatPips(calculations.riskInPips, alert.tradermade_symbol)}
                  </div>
                </div>
              </div>
              <div className="mt-2 text-xs">
                <span className="text-gray-400">Account Risk: </span>
                <span className={`font-bold ${calculations.riskPercentage > 2 ? 'text-red-400' : 'text-yellow-400'}`}>
                  {calculations.riskPercentage.toFixed(2)}%
                </span>
              </div>
              {calculations.riskPercentage > 2 && (
                <div className="mt-2 text-xs text-red-300 bg-red-900/30 p-2 rounded border border-red-700">
                  ⚠️ High Risk: Consider reducing position size (recommended max: 2%)
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
                          {formatPips(reward.pips, alert.tradermade_symbol)} • {reward.ratio.toFixed(1)}:1
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pip Value Information */}
            <div className="bg-blue-900/20 rounded-md p-3 border border-blue-700/50">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-300">Position Details</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-gray-400">Pip Value</div>
                  <div className="font-bold text-blue-300">
                    {formatCurrency(calculations.pipValue)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Position Size</div>
                  <div className="font-bold text-blue-300">
                    {formatLotSize(parseFloat(lotSize), alert.tradermade_symbol)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500 text-sm">
            Enter your account balance and position size to see pip-based calculations
          </div>
        )}
      </CardContent>
    </Card>
  );
}
