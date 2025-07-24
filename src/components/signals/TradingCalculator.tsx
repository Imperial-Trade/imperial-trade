import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calculator, DollarSign, Percent, TrendingUp, AlertTriangle, Hourglass } from 'lucide-react';
import { calculatePnL, calculateRiskAmount, formatLotSize, getLotSizeSpec } from '@/utils/lotSizing';

export default function TradingCalculator({ alert, livePrice }) {
  const [accountBalance, setAccountBalance] = useState('');
  const [lotSize, setLotSize] = useState('');
  
  const isPending = alert.status === 'pending';

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
    // Ensure we use actual live price when available, fallback to entry only if no live data
    const currentPrice = livePrice?.price && livePrice.price > 0 ? livePrice.price : entryPrice;

    if (!balance || !lots || !entryPrice || !stopLoss) {
      return null;
    }

    const isBuy = alert.trade_type.includes('buy');
    const symbol = alert.finnhub_symbol || alert.asset_name || '';
    
    // Calculate risk using proper lot sizing mechanics
    const totalRisk = calculateRiskAmount(entryPrice, stopLoss, lots, symbol);
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
        <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
          <Calculator className="w-4 h-4 text-emerald-400" />
          Position Calculator - {alert.asset_name}
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
              {lotSize && (
                <span className="ml-2 text-xs text-gray-500">
                  ({formatLotSize(parseFloat(lotSize) || 0, alert.finnhub_symbol || alert.asset_name || '')})
                </span>
              )}
            </Label>
            <Input
              type="number"
              step="any"
              placeholder="0.1"
              value={lotSize}
              onChange={(e) => setLotSize(e.target.value)}
              onWheel={handleNumberInputWheel}
              className="bg-gray-800 border-gray-600 text-white h-8 text-sm"
            />
          </div>
        </div>

        {/* Live Price & P&L Display (Only for Active Trades) */}
        {livePrice && !isPending && (
          <div className="bg-gray-800/50 rounded-md p-3 border border-gray-700">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">Current Price</span>
              <span className="font-mono font-bold text-white">
                {formatCurrency(livePrice?.price || 0)}
              </span>
            </div>
            {calculations && (
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-400">Current P&L</span>
                <div className="text-right">
                  <div className={`font-bold ${calculations.isCurrentlyProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatCurrency(calculations.currentPnL)}
                  </div>
                  <div className="text-xs">
                    {formatPercentage(calculations.currentPnLPercentage)}
                  </div>
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
                  <div className="text-gray-400">Risk of Account</div>
                  <div className={`font-bold ${calculations.riskPercentage > 5 ? 'text-red-400' : 'text-yellow-400'}`}>
                    {calculations.riskPercentage.toFixed(2)}%
                  </div>
                </div>
              </div>
              {calculations.riskPercentage > 5 && (
                <div className="mt-2 text-xs text-red-300 bg-red-900/30 p-2 rounded border border-red-700">
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