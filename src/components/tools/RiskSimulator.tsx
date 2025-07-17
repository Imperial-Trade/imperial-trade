import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Scale, TrendingUp, TrendingDown, DollarSign, AlertTriangle } from 'lucide-react';

interface SimulationResult {
  riskRewardRatio: number;
  positionSize: number;
  potentialProfit: number;
  potentialLoss: number;
  riskPercentage: number;
  breakEvenPrice: number;
  recommendation: string;
}

const RiskSimulator: React.FC = () => {
  const [formData, setFormData] = useState({
    accountBalance: '',
    riskPercentage: '2',
    entryPrice: '',
    stopLoss: '',
    takeProfit: '',
    tradeType: 'buy' as 'buy' | 'sell'
  });
  
  const [result, setResult] = useState<SimulationResult | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculateSimulation = () => {
    const balance = parseFloat(formData.accountBalance);
    const risk = parseFloat(formData.riskPercentage) / 100;
    const entry = parseFloat(formData.entryPrice);
    const stopLoss = parseFloat(formData.stopLoss);
    const takeProfit = parseFloat(formData.takeProfit);

    if (!balance || !entry || !stopLoss || !takeProfit) return;

    const riskAmount = balance * risk;
    const stopDistance = Math.abs(entry - stopLoss);
    const profitDistance = Math.abs(takeProfit - entry);
    
    // Position size calculation
    const positionSize = riskAmount / stopDistance;
    
    // Risk/Reward ratio
    const riskRewardRatio = profitDistance / stopDistance;
    
    // Potential P&L
    const potentialLoss = riskAmount;
    const potentialProfit = positionSize * profitDistance;
    
    // Break-even calculation (simplified)
    const breakEvenPrice = entry;
    
    // Risk percentage of account
    const riskPercentage = (potentialLoss / balance) * 100;
    
    // Generate recommendation
    let recommendation = '';
    if (riskRewardRatio >= 2) {
      recommendation = 'Excellent Risk/Reward ratio. This setup looks favorable for entry.';
    } else if (riskRewardRatio >= 1.5) {
      recommendation = 'Good Risk/Reward ratio. Consider this trade with proper risk management.';
    } else {
      recommendation = 'Low Risk/Reward ratio. Consider adjusting your targets or avoid this trade.';
    }

    setResult({
      riskRewardRatio,
      positionSize,
      potentialProfit,
      potentialLoss,
      riskPercentage,
      breakEvenPrice,
      recommendation
    });
  };

  const resetForm = () => {
    setFormData({
      accountBalance: '',
      riskPercentage: '2',
      entryPrice: '',
      stopLoss: '',
      takeProfit: '',
      tradeType: 'buy'
    });
    setResult(null);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent mb-2">
          Risk Simulator
        </h2>
        <p className="text-muted-foreground">
          Simulate trade setups to assess risk before committing capital.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Trade Setup Parameters
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="accountBalance">Account Balance ($)</Label>
                <Input
                  id="accountBalance"
                  type="number"
                  placeholder="10000"
                  value={formData.accountBalance}
                  onChange={(e) => handleInputChange('accountBalance', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="riskPercentage">Risk Percentage (%)</Label>
                <Select value={formData.riskPercentage} onValueChange={(value) => handleInputChange('riskPercentage', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.5">0.5%</SelectItem>
                    <SelectItem value="1">1%</SelectItem>
                    <SelectItem value="2">2%</SelectItem>
                    <SelectItem value="3">3%</SelectItem>
                    <SelectItem value="5">5%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="tradeType">Trade Type</Label>
                <Select value={formData.tradeType} onValueChange={(value: 'buy' | 'sell') => handleInputChange('tradeType', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buy">Buy (Long)</SelectItem>
                    <SelectItem value="sell">Sell (Short)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="entryPrice">Entry Price</Label>
                <Input
                  id="entryPrice"
                  type="number"
                  step="0.00001"
                  placeholder="1.0850"
                  value={formData.entryPrice}
                  onChange={(e) => handleInputChange('entryPrice', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="stopLoss">Stop Loss</Label>
                <Input
                  id="stopLoss"
                  type="number"
                  step="0.00001"
                  placeholder="1.0800"
                  value={formData.stopLoss}
                  onChange={(e) => handleInputChange('stopLoss', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="takeProfit">Take Profit</Label>
                <Input
                  id="takeProfit"
                  type="number"
                  step="0.00001"
                  placeholder="1.0950"
                  value={formData.takeProfit}
                  onChange={(e) => handleInputChange('takeProfit', e.target.value)}
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button onClick={calculateSimulation} className="flex-1">
                  Calculate Risk
                </Button>
                <Button onClick={resetForm} variant="outline">
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Simulation Results
            </h3>
            
            {result ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">Risk/Reward Ratio</p>
                    <p className="text-2xl font-bold text-primary">
                      1:{result.riskRewardRatio.toFixed(2)}
                    </p>
                  </div>
                  
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">Position Size</p>
                    <p className="text-2xl font-bold">
                      {result.positionSize.toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-green-500/10 rounded-lg">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Potential Profit</span>
                    </div>
                    <span className="font-semibold text-green-500">
                      +${result.potentialProfit.toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-red-500/10 rounded-lg">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-500" />
                      <span className="text-sm">Potential Loss</span>
                    </div>
                    <span className="font-semibold text-red-500">
                      -${result.potentialLoss.toFixed(2)}
                    </span>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Risk Assessment</p>
                  <p className="text-sm">
                    This trade risks <strong>{result.riskPercentage.toFixed(2)}%</strong> of your account balance.
                  </p>
                </div>
                
                <div className="bg-blue-500/10 p-4 rounded-lg">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                    Recommendation
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    {result.recommendation}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Scale className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Enter your trade parameters to see risk simulation results
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Educational Note */}
      <Card className="bg-amber-500/10 border-amber-500/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-700 dark:text-amber-300 mb-1">
                Risk Management Reminder
              </p>
              <p className="text-amber-600 dark:text-amber-400">
                This simulator provides estimates based on your inputs. Always consider slippage, 
                spreads, and other trading costs. Never risk more than you can afford to lose.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RiskSimulator;