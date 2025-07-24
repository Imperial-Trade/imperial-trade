import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Calculator, DollarSign, Percent, TrendingUp, AlertTriangle, Hourglass, Copy, BarChart3, Target, Zap, Shield, Settings } from 'lucide-react';
import { calculatePnL, calculateRiskAmount, formatLotSize, getLotSizeSpec, calculatePositionSize, getSuggestedLotSizes } from '@/utils/lotSizing';
import { useToast } from '@/hooks/use-toast';

export default function TradingCalculator({ alert, livePrice }) {
  const { toast } = useToast();
  const [accountBalance, setAccountBalance] = useState(() => 
    localStorage.getItem('tradingCalculator_accountBalance') || ''
  );
  const [lotSize, setLotSize] = useState('');
  const [riskPercentage, setRiskPercentage] = useState('2');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const isPending = alert.status === 'pending';

  // Persist account balance
  useEffect(() => {
    if (accountBalance) {
      localStorage.setItem('tradingCalculator_accountBalance', accountBalance);
    }
  }, [accountBalance]);

  // Prevent scroll wheel from changing number inputs
  const handleNumberInputWheel = (e) => {
    e.target.blur();
  };

  // Calculate all trading metrics in real-time with enhanced features
  const calculations = useMemo(() => {
    const balance = parseFloat(accountBalance) || 0;
    const lots = parseFloat(lotSize) || 0;
    const entryPrice = alert.entry_price || 0;
    const stopLoss = alert.stop_loss || 0;
    const currentPrice = livePrice?.price || livePrice || entryPrice;
    const symbol = alert.finnhub_symbol || alert.asset_name || '';

    if (!balance || !entryPrice || !stopLoss) {
      return null;
    }

    const isBuy = alert.trade_type.includes('buy');
    const priceDifference = Math.abs(entryPrice - stopLoss);
    
    // Enhanced calculations
    const riskPercent = parseFloat(riskPercentage) || 2;
    const maxRiskAmount = (balance * riskPercent) / 100;
    const suggestedLotSize = calculatePositionSize(maxRiskAmount, entryPrice, stopLoss, symbol);
    
    const totalRisk = lots > 0 ? calculateRiskAmount(entryPrice, stopLoss, lots, symbol) : 0;
    const actualRiskPercentage = balance > 0 ? (totalRisk / balance) * 100 : 0;

    // Current P&L calculation
    const currentPnL = lots > 0 ? calculatePnL(entryPrice, currentPrice, lots, symbol) : 0;
    const currentPnLPercentage = balance > 0 ? (currentPnL / balance) * 100 : 0;

    // Live validity checks
    const entryValidation = {
      entryPassed: isBuy ? currentPrice > entryPrice : currentPrice < entryPrice,
      stopLossPassed: isBuy ? currentPrice <= stopLoss : currentPrice >= stopLoss,
      isEntryStillValid: isBuy ? currentPrice <= entryPrice : currentPrice >= entryPrice,
      proximityToSL: Math.abs(currentPrice - stopLoss) / priceDifference
    };

    // Take profit analysis
    const takeProfits = [
      { level: 1, price: alert.tp1 },
      { level: 2, price: alert.tp2 },
      { level: 3, price: alert.tp3 },
      { level: 4, price: alert.tp4 },
      { level: 5, price: alert.tp5 }
    ].filter(tp => tp.price && tp.price > 0);

    const rewards = takeProfits.map(tp => {
      const totalReward = lots > 0 ? Math.abs(calculatePnL(entryPrice, tp.price, lots, symbol)) : 0;
      const rewardRiskRatio = totalRisk > 0 ? totalReward / totalRisk : 0;
      const priceMovement = Math.abs(tp.price - entryPrice);
      const isHit = isBuy ? currentPrice >= tp.price : currentPrice <= tp.price;
      
      return {
        level: tp.level,
        price: tp.price,
        usd: totalReward,
        ratio: rewardRiskRatio,
        priceMovement,
        isHit,
        percentage: balance > 0 ? (totalReward / balance) * 100 : 0
      };
    });

    // Break-even calculation
    const breakEvenPrice = entryPrice;
    const breakEvenDistance = Math.abs(currentPrice - breakEvenPrice);

    return {
      balance,
      lots,
      entryPrice,
      stopLoss,
      currentPrice,
      symbol,
      isBuy,
      totalRisk,
      actualRiskPercentage,
      suggestedLotSize,
      maxRiskAmount,
      currentPnL,
      currentPnLPercentage,
      rewards,
      isCurrentlyProfit: currentPnL > 0,
      entryValidation,
      breakEvenPrice,
      breakEvenDistance,
      profitFactor: rewards.length > 0 ? rewards[0].ratio : 0
    };
  }, [accountBalance, lotSize, riskPercentage, alert, livePrice]);

  // Quick lot size selection
  const handleQuickLotSize = useCallback((size) => {
    setLotSize(size.toString());
  }, []);

  // Risk percentage presets
  const handleRiskPreset = useCallback((percent) => {
    setRiskPercentage(percent.toString());
  }, []);

  // Copy to clipboard functionality
  const copyToClipboard = useCallback((text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
        duration: 2000,
      });
    });
  }, [toast]);

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
    <Card className="bg-gradient-to-br from-background via-background to-muted/10 border-border/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Calculator className="w-4 h-4 text-primary" />
            Enhanced Position Calculator
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="h-6 px-2 text-xs"
          >
            <Settings className="w-3 h-3 mr-1" />
            {showAdvanced ? 'Simple' : 'Advanced'}
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          {alert.asset_name} • {alert.trade_type.toUpperCase()} @ ${alert.entry_price?.toFixed(4)}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Enhanced Input Section */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Account Balance</Label>
              <Input
                type="number"
                step="any"
                placeholder="10000"
                value={accountBalance}
                onChange={(e) => setAccountBalance(e.target.value)}
                onWheel={handleNumberInputWheel}
                className="bg-background border-border text-foreground h-8 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Risk %</Label>
              <div className="flex gap-1">
                <Input
                  type="number"
                  step="0.1"
                  value={riskPercentage}
                  onChange={(e) => setRiskPercentage(e.target.value)}
                  onWheel={handleNumberInputWheel}
                  className="bg-background border-border text-foreground h-8 text-sm flex-1"
                />
                <div className="flex gap-1">
                  {['1', '2', '3', '5'].map(percent => (
                    <Button
                      key={percent}
                      variant={riskPercentage === percent ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleRiskPreset(percent)}
                      className="h-8 w-8 p-0 text-xs"
                    >
                      {percent}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Position Size Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-foreground">Position Size (Lots)</Label>
              {calculations && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLotSize(calculations.suggestedLotSize.toFixed(4))}
                  className="h-6 px-2 text-xs text-primary hover:text-primary"
                >
                  <Target className="w-3 h-3 mr-1" />
                  Use Suggested
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                type="number"
                step="any"
                placeholder="0.01"
                value={lotSize}
                onChange={(e) => setLotSize(e.target.value)}
                onWheel={handleNumberInputWheel}
                className="bg-background border-border text-foreground h-8 text-sm flex-1"
              />
              {calculations && (
                <div className="text-xs text-muted-foreground self-center">
                  {formatLotSize(parseFloat(lotSize) || 0, calculations.symbol)}
                </div>
              )}
            </div>
            
            {/* Quick Lot Size Buttons */}
            <div className="flex gap-1">
              {getSuggestedLotSizes(alert.finnhub_symbol || alert.asset_name || '').map(size => (
                <Button
                  key={size}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickLotSize(size)}
                  className="h-6 px-2 text-xs"
                >
                  {size}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Enhanced Live Price & Status Display */}
        {(livePrice || calculations) && (
          <Card className="bg-muted/30 border-border/50">
            <CardContent className="p-3 space-y-3">
              {/* Current Price & P&L */}
              {livePrice && !isPending && (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Current Price</span>
                    {calculations?.entryValidation && (
                      <div className="flex gap-1">
                        {calculations.entryValidation.stopLossPassed && (
                          <Badge variant="destructive" className="text-xs px-1 py-0">SL Hit</Badge>
                        )}
                        {!calculations.entryValidation.isEntryStillValid && !isPending && (
                          <Badge variant="secondary" className="text-xs px-1 py-0">Entry Passed</Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-foreground">
                      {formatCurrency(livePrice?.price || livePrice)}
                    </div>
                    {calculations && (
                      <div className="text-xs text-muted-foreground">
                        {calculations.isBuy ? '↗️' : '↘️'} {calculations.entryValidation.proximityToSL < 0.2 ? '⚠️ Near SL' : ''}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Real-time P&L */}
              {calculations && calculations.lots > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Unrealized P&L</span>
                  <div className="text-right">
                    <div className={`font-bold ${calculations.isCurrentlyProfit ? 'text-emerald-500' : 'text-red-500'}`}>
                      {formatCurrency(calculations.currentPnL)}
                    </div>
                    <div className="text-xs">
                      {formatPercentage(calculations.currentPnLPercentage)}
                    </div>
                  </div>
                </div>
              )}

              {/* Break-even Information */}
              {calculations && showAdvanced && (
                <div className="text-xs text-muted-foreground">
                  Break-even: {formatCurrency(calculations.breakEvenPrice)} 
                  ({formatCurrency(calculations.breakEvenDistance)} away)
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Enhanced Status Notices */}
        {isPending && (
          <Card className="bg-amber-500/10 border-amber-500/30">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400 font-medium">
                <Hourglass className="w-4 h-4"/>
                <span>Pending Order Analysis</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Calculations based on limit price: <span className="font-bold text-foreground">${alert.entry_price?.toFixed(4)}</span>
              </p>
              {calculations?.entryValidation.isEntryStillValid === false && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  ⚠️ Current price has moved past entry level
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Enhanced Risk Management Section */}
        {calculations && (
          <div className="space-y-4">
            {/* Suggested Position Size */}
            {!lotSize && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Suggested Position</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLotSize(calculations.suggestedLotSize.toFixed(4))}
                      className="h-6 px-2 text-xs"
                    >
                      Use {calculations.suggestedLotSize.toFixed(4)} lots
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Risk {riskPercentage}% ({formatCurrency(calculations.maxRiskAmount)}) of your account
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Risk Analysis */}
            <Card className="bg-destructive/5 border-destructive/20">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <span className="text-sm font-medium">Risk Analysis</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(calculations.totalRisk.toString(), 'Risk Amount')}
                    className="h-6 w-6 p-0"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                  <div>
                    <div className="text-muted-foreground">Total Risk</div>
                    <div className="font-bold text-destructive">
                      {formatCurrency(calculations.totalRisk)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">% of Account</div>
                    <div className={`font-bold ${calculations.actualRiskPercentage > 5 ? 'text-destructive' : calculations.actualRiskPercentage > 2 ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {calculations.actualRiskPercentage.toFixed(2)}%
                    </div>
                  </div>
                </div>
                
                {/* Risk Level Indicator */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Risk Level</span>
                    <span className={`font-medium ${
                      calculations.actualRiskPercentage <= 1 ? 'text-emerald-500' :
                      calculations.actualRiskPercentage <= 2 ? 'text-blue-500' :
                      calculations.actualRiskPercentage <= 5 ? 'text-amber-500' : 'text-destructive'
                    }`}>
                      {calculations.actualRiskPercentage <= 1 ? 'Conservative' :
                       calculations.actualRiskPercentage <= 2 ? 'Moderate' :
                       calculations.actualRiskPercentage <= 5 ? 'Aggressive' : 'Dangerous'}
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(calculations.actualRiskPercentage * 10, 100)} 
                    className="h-2"
                  />
                </div>
                
                {calculations.actualRiskPercentage > 5 && (
                  <div className="mt-3 text-xs text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">
                    ⚠️ High Risk: Consider reducing position size
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Enhanced Reward Analysis */}
            {calculations.rewards.length > 0 && (
              <Card className="bg-emerald-500/5 border-emerald-500/20">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm font-medium">Profit Targets</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Best R:R {calculations.rewards[0]?.ratio.toFixed(1)}:1
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {calculations.rewards.map((reward, index) => (
                      <div key={index} className="flex justify-between items-center p-2 rounded bg-background/50 border border-border/50">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={reward.isHit ? "default" : "outline"} 
                            className={`text-xs px-1.5 py-0.5 ${reward.isHit ? 'bg-emerald-500 text-white' : 'text-emerald-500 border-emerald-500'}`}
                          >
                            TP{reward.level}
                            {reward.isHit && ' ✓'}
                          </Badge>
                          <div className="text-xs">
                            <div className="text-muted-foreground">${reward.price.toFixed(4)}</div>
                            {showAdvanced && (
                              <div className="text-muted-foreground">+{reward.priceMovement.toFixed(4)} pips</div>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                                {formatCurrency(reward.usd)}
                              </div>
                              <div className="text-xs text-emerald-600 dark:text-emerald-400">
                                {reward.ratio.toFixed(1)}:1 • {reward.percentage.toFixed(1)}%
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(reward.usd.toString(), `TP${reward.level} Profit`)}
                              className="h-6 w-6 p-0"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {showAdvanced && (
                    <>
                      <Separator className="my-3" />
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div className="text-center">
                          <div className="text-muted-foreground">Total Reward</div>
                          <div className="font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(calculations.rewards.reduce((sum, r) => sum + r.usd, 0))}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground">Avg R:R</div>
                          <div className="font-bold">
                            {(calculations.rewards.reduce((sum, r) => sum + r.ratio, 0) / calculations.rewards.length).toFixed(1)}:1
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground">Profit Factor</div>
                          <div className="font-bold text-emerald-600 dark:text-emerald-400">
                            {calculations.profitFactor.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Advanced Analytics */}
            {showAdvanced && (
              <Card className="bg-muted/30 border-border/50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Advanced Analytics</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-muted-foreground">Position Value</div>
                      <div className="font-bold">
                        {formatCurrency(calculations.entryPrice * (calculations.lots || 0) * 100000)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Leverage Used</div>
                      <div className="font-bold">
                        {calculations.balance > 0 ? ((calculations.entryPrice * (calculations.lots || 0) * 100000) / calculations.balance).toFixed(1) : 0}:1
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Required Margin</div>
                      <div className="font-bold">
                        {formatCurrency((calculations.entryPrice * (calculations.lots || 0) * 100000) / 100)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Free Margin</div>
                      <div className="font-bold">
                        {formatCurrency(calculations.balance - ((calculations.entryPrice * (calculations.lots || 0) * 100000) / 100))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* No Calculations Placeholder */}
        {!calculations && (
          <Card className="bg-muted/20 border-dashed border-muted-foreground/30">
            <CardContent className="p-6 text-center">
              <Calculator className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <div className="text-sm text-muted-foreground mb-1">Enter your trading parameters</div>
              <div className="text-xs text-muted-foreground">
                Account balance and risk percentage to see comprehensive analysis
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}