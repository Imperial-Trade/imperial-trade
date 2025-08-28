import React, { useState, useEffect, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LimitOrderStatus } from '@/components/signals/LimitOrderStatus';
import { AssetSelector, AssetOption } from '@/components/signals/AssetSelector';
import { useToast } from '@/hooks/use-toast';
import { TradeAlertWithProfile } from '@/types/trading';

const RISK_PERCENTAGES = [0.5, 1, 1.5, 2, 2.5, 3];

interface TradingCalculatorProps {
  alert?: TradeAlertWithProfile;
  livePrice?: number;
}

export const TradingCalculator: React.FC<TradingCalculatorProps> = ({ alert: passedAlert, livePrice: passedLivePrice }) => {
  const [asset, setAsset] = useState<AssetOption | null>(null);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [accountSize, setAccountSize] = useState(1000);
  const [riskPercentage, setRiskPercentage] = useState(1);
  const [entryPrice, setEntryPrice] = useState<number | null>(null);
  const [stopLossPips, setStopLossPips] = useState<number | null>(null);
  const [positionSize, setPositionSize] = useState<number | null>(null);
  const [alert, setAlert] = useState<TradeAlertWithProfile | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);

  const { toast } = useToast();

  // Initialize with passed alert data if available
  useEffect(() => {
    if (passedAlert) {
      setAsset({
        name: passedAlert.assetName,
        symbol: passedAlert.tradermadeSymbol,
        category: 'forex' // Default category, could be determined from symbol
      });
      setTradeType(passedAlert.tradeType.includes('buy') ? 'buy' : 'sell');
      setEntryPrice(passedAlert.entryPrice);
      
      // Calculate stop loss in pips
      const stopLossDistance = Math.abs(passedAlert.entryPrice - passedAlert.stopLoss);
      const pips = stopLossDistance * 10000; // Assuming 4 decimal places
      setStopLossPips(pips);
      
      setAlert(passedAlert);
    }
  }, [passedAlert]);

  // Update current price when passed
  useEffect(() => {
    if (typeof passedLivePrice === 'number') {
      setCurrentPrice(passedLivePrice);
    }
  }, [passedLivePrice]);

  const calculatePositionSize = useCallback(() => {
    if (!accountSize || !riskPercentage || !stopLossPips || !entryPrice) {
      return null;
    }

    const riskAmount = (accountSize * riskPercentage) / 100;
    const pipsAsDecimal = stopLossPips / 10000; // Assuming Forex pair with 4 decimal places
    const size = riskAmount / (entryPrice * pipsAsDecimal);

    return size;
  }, [accountSize, riskPercentage, stopLossPips, entryPrice]);

  useEffect(() => {
    const size = calculatePositionSize();
    setPositionSize(size !== null ? parseFloat(size.toFixed(2)) : null);
  }, [calculatePositionSize]);

  const handleAssetChange = (selectedAsset: AssetOption) => {
    setAsset(selectedAsset);
  };

  const handleEntryPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setEntryPrice(isNaN(value) ? null : value);
  };

  const handleStopLossPipsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setStopLossPips(isNaN(value) ? null : value);
  };

  const handleAccountSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setAccountSize(isNaN(value) ? 0 : value);
  };

  const handleRiskPercentageChange = (value: number[]) => {
    setRiskPercentage(value[0]);
  };

  const handleSimulateAlert = () => {
    if (!asset || !tradeType || !entryPrice || !stopLossPips) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill in all the required fields.',
        variant: 'destructive'
      });
      return;
    }

    const simulatedAlert: TradeAlertWithProfile = {
      id: 'simulated',
      userId: 'test-user',
      assetName: asset.name,
      tradermadeSymbol: asset.symbol,
      tradeType: tradeType === 'buy' ? 'buy_limit' : 'sell_limit',
      entryPrice: entryPrice,
      stopLoss: entryPrice - (stopLossPips / 10000),
      status: 'pending',
      tpHits: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      creator: {
        id: 'educator-123',
        display_name: 'Simulated Educator',
        role: 'educator',
        avatar_url: null,
        user_type: 'premium',
        access_level: 'full'
      }
    };

    setAlert(simulatedAlert);
    setCurrentPrice(entryPrice - (stopLossPips / 20000)); // Simulate price near entry
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Trading Position Size Calculator</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <AssetSelector
            value={asset ? asset.symbol : ''}
            onValueChange={(value) => {
              const selectedAsset = asset ? asset : null;
              handleAssetChange(selectedAsset as AssetOption);
            }}
            onAssetChange={handleAssetChange}
          />

          <div>
            <Label htmlFor="trade-type">Trade Type</Label>
            <Select value={tradeType} onValueChange={(value) => setTradeType(value as 'buy' | 'sell')}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select trade type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buy">Buy</SelectItem>
                <SelectItem value="sell">Sell</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="account-size">Account Size</Label>
            <Input
              type="number"
              id="account-size"
              placeholder="Enter account size"
              value={accountSize.toString()}
              onChange={handleAccountSizeChange}
            />
          </div>

          <div>
            <Label htmlFor="risk-percentage">Risk Percentage ({riskPercentage.toFixed(1)}%)</Label>
            <Slider
              id="risk-percentage"
              defaultValue={[riskPercentage]}
              max={RISK_PERCENTAGES[RISK_PERCENTAGES.length - 1]}
              step={0.1}
              onValueChange={handleRiskPercentageChange}
            />
          </div>

          <div>
            <Label htmlFor="entry-price">Entry Price</Label>
            <Input
              type="number"
              id="entry-price"
              placeholder="Enter entry price"
              value={entryPrice?.toString() || ''}
              onChange={handleEntryPriceChange}
            />
          </div>

          <div>
            <Label htmlFor="stop-loss-pips">Stop Loss (Pips)</Label>
            <Input
              type="number"
              id="stop-loss-pips"
              placeholder="Enter stop loss in pips"
              value={stopLossPips?.toString() || ''}
              onChange={handleStopLossPipsChange}
            />
          </div>

          <div>
            <Label>Calculated Position Size</Label>
            <div className="font-bold text-lg">
              {positionSize !== null ? positionSize.toString() : 'N/A'}
            </div>
          </div>

          {!passedAlert && (
            <Button onClick={handleSimulateAlert}>Simulate Limit Order</Button>
          )}
        </CardContent>
      </Card>
      
      {alert && (
        <LimitOrderStatus 
          signal={alert} 
          currentPrice={currentPrice}
        />
      )}
    </div>
  );
};
