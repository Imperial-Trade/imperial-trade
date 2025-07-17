import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calculator, DollarSign, AlertTriangle } from 'lucide-react';

interface CalculationResult {
  positionSize: number;
  riskAmount: number;
  potentialProfit: number;
  riskRewardRatio: number;
}

const RiskCalculator: React.FC = () => {
  const [formData, setFormData] = useState({
    accountBalance: '',
    riskPercentage: '2',
    entryPrice: '',
    stopLoss: '',
    takeProfit: ''
  });
  
  const [result, setResult] = useState<CalculationResult | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculateRisk = () => {
    const balance = parseFloat(formData.accountBalance);
    const riskPercent = parseFloat(formData.riskPercentage) / 100;
    const entry = parseFloat(formData.entryPrice);
    const stopLoss = parseFloat(formData.stopLoss);
    const takeProfit = parseFloat(formData.takeProfit);

    if (!balance || !entry || !stopLoss || !takeProfit) return;

    const riskAmount = balance * riskPercent;
    const stopDistance = Math.abs(entry - stopLoss);
    const profitDistance = Math.abs(takeProfit - entry);
    const positionSize = riskAmount / stopDistance;
    const potentialProfit = positionSize * profitDistance;
    const riskRewardRatio = profitDistance / stopDistance;

    setResult({
      positionSize,
      riskAmount,
      potentialProfit,
      riskRewardRatio
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent mb-2">
          Risk Calculator
        </h2>
        <p className="text-muted-foreground">
          Calculate position size, risk, and potential returns for optimal trade management.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Trade Parameters
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
                <Label htmlFor="entryPrice">Entry Price</Label>
                <Input
                  id="entryPrice"
                  type="number"
                  step="0.00001"
                  placeholder="1.08500"
                  value={formData.entryPrice}
                  onChange={(e) => handleInputChange('entryPrice', e.target.value)}
                />
              </div>
              
              <Button onClick={calculateRisk} className="w-full">
                Calculate Risk
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Results
            </h3>
            
            {result ? (
              <div className="space-y-4">
                <div className="bg-primary/5 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Risk/Reward Ratio</p>
                  <p className="text-2xl font-bold text-primary">
                    1:{result.riskRewardRatio.toFixed(2)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Enter parameters to see calculations
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RiskCalculator;