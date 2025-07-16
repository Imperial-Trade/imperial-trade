import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calculator, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';
export default function RiskCalculator() {
  const [formData, setFormData] = useState({
    accountBalance: '',
    riskPercentage: '2',
    entryPrice: '',
    stopLoss: '',
    takeProfit: ''
  });
  const [results, setResults] = useState(null);
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const calculateRisk = () => {
    const {
      accountBalance,
      riskPercentage,
      entryPrice,
      stopLoss,
      takeProfit
    } = formData;
    if (!accountBalance || !riskPercentage || !entryPrice || !stopLoss) {
      alert('Please fill in all required fields');
      return;
    }
    const balance = parseFloat(accountBalance);
    const risk = parseFloat(riskPercentage);
    const entry = parseFloat(entryPrice);
    const stop = parseFloat(stopLoss);
    const tp = takeProfit ? parseFloat(takeProfit) : null;
    const riskAmount = balance * risk / 100;
    const pipValue = Math.abs(entry - stop);
    const positionSize = riskAmount / pipValue;
    const potentialLoss = riskAmount;
    const potentialProfit = tp ? Math.abs(tp - entry) * positionSize : 0;
    const riskReward = tp ? Math.abs(tp - entry) / Math.abs(entry - stop) : 0;
    setResults({
      riskAmount: riskAmount.toFixed(2),
      positionSize: positionSize.toFixed(2),
      potentialLoss: potentialLoss.toFixed(2),
      potentialProfit: potentialProfit.toFixed(2),
      riskReward: riskReward.toFixed(2),
      pipValue: pipValue.toFixed(5)
    });
  };
  return <Card className="glass-effect">
      <CardHeader>
        <CardTitle>
          
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-2">Account Balance ($)</label>
            <Input type="number" placeholder="e.g., 10000" value={formData.accountBalance} onChange={e => handleInputChange('accountBalance', e.target.value)} className="bg-surface border-default text-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-2">Risk Percentage (%)</label>
            <Input type="number" placeholder="e.g., 2" value={formData.riskPercentage} onChange={e => handleInputChange('riskPercentage', e.target.value)} className="bg-surface border-default text-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-2">Entry Price</label>
            <Input type="number" step="0.00001" placeholder="e.g., 1.1500" value={formData.entryPrice} onChange={e => handleInputChange('entryPrice', e.target.value)} className="bg-surface border-default text-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-2">Stop Loss</label>
            <Input type="number" step="0.00001" placeholder="e.g., 1.1450" value={formData.stopLoss} onChange={e => handleInputChange('stopLoss', e.target.value)} className="bg-surface border-default text-primary" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-primary mb-2">Take Profit (Optional)</label>
            <Input type="number" step="0.00001" placeholder="e.g., 1.1600" value={formData.takeProfit} onChange={e => handleInputChange('takeProfit', e.target.value)} className="bg-surface border-default text-primary" />
          </div>
        </div>

        <Button onClick={calculateRisk} className="w-full bg-green-600 hover:bg-green-700 text-white">
          <Calculator className="w-5 h-5 mr-2" />
          Calculate Risk
        </Button>

        {results && <div className="space-y-4">
            <h3 className="text-xl font-semibold text-primary">Calculation Results</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-surface/50">
                <CardContent className="p-4 text-center">
                  <DollarSign className="w-8 h-8 text-accent-red mx-auto mb-2" />
                  <p className="text-sm text-secondary">Risk Amount</p>
                  <p className="text-2xl font-bold text-accent-red">${results.riskAmount}</p>
                </CardContent>
              </Card>
              
              <Card className="bg-surface/50">
                <CardContent className="p-4 text-center">
                  <TrendingUp className="w-8 h-8 text-accent-blue mx-auto mb-2" />
                  <p className="text-sm text-secondary">Position Size</p>
                  <p className="text-2xl font-bold text-primary">{results.positionSize}</p>
                </CardContent>
              </Card>
              
              {results.potentialProfit > 0 && <>
                  <Card className="bg-surface/50">
                    <CardContent className="p-4 text-center">
                      <DollarSign className="w-8 h-8 text-accent-green mx-auto mb-2" />
                      <p className="text-sm text-secondary">Potential Profit</p>
                      <p className="text-2xl font-bold text-accent-green">${results.potentialProfit}</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-surface/50">
                    <CardContent className="p-4 text-center">
                      <AlertTriangle className="w-8 h-8 text-accent-gold mx-auto mb-2" />
                      <p className="text-sm text-secondary">Risk:Reward Ratio</p>
                      <p className="text-2xl font-bold text-accent-gold">1:{results.riskReward}</p>
                    </CardContent>
                  </Card>
                </>}
            </div>
          </div>}
      </CardContent>
    </Card>;
}