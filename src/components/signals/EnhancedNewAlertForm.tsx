
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowUp, ArrowDown, TrendingUp, DollarSign, Target, AlertCircle, Zap, Calculator } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TradeAlertData } from '@/types/components';

// Popular trading assets
const POPULAR_ASSETS = [
  { symbol: 'XAUUSD', name: 'Gold', category: 'Metals', pipSize: 0.01 },
  { symbol: 'BTCUSD', name: 'Bitcoin', category: 'Crypto', pipSize: 1 },
  { symbol: 'EURUSD', name: 'Euro/Dollar', category: 'Forex', pipSize: 0.0001 },
  { symbol: 'GBPUSD', name: 'Pound/Dollar', category: 'Forex', pipSize: 0.0001 },
  { symbol: 'USA30', name: 'Dow Jones', category: 'Indices', pipSize: 0.1 },
  { symbol: 'NAS100', name: 'Nasdaq', category: 'Indices', pipSize: 0.1 },
  { symbol: 'SPX500', name: 'S&P 500', category: 'Indices', pipSize: 0.1 },
  { symbol: 'USDJPY', name: 'Dollar/Yen', category: 'Forex', pipSize: 0.01 },
];

interface EnhancedNewAlertFormProps {
  onSubmit: (data: TradeAlertData) => void;
  isLoading?: boolean;
}

export default function EnhancedNewAlertForm({ onSubmit, isLoading = false }: EnhancedNewAlertFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState<Partial<TradeAlertData>>({
    asset: '',
    type: 'BUY',
    entry_price: 0,
    tp1: 0,
    tp2: 0,
    tp3: 0,
    tp4: 0,
    tp5: 0,
    stop_loss: 0,
    analysis: '',
    risk_level: 'medium'
  });

  // Live price and calculation states
  const [livePrice, setLivePrice] = useState<number>(0);
  const [useLivePrice, setUseLivePrice] = useState(false);
  const [pipMode, setPipMode] = useState(false);
  const [pipValues, setPipValues] = useState({
    tp1: 0, tp2: 0, tp3: 0, tp4: 0, tp5: 0, stopLoss: 0
  });

  // Get selected asset details
  const selectedAsset = useMemo(() => 
    POPULAR_ASSETS.find(asset => asset.symbol === formData.asset),
    [formData.asset]
  );

  // Mock live price (in real app, this would come from WebSocket)
  useEffect(() => {
    if (!selectedAsset) return;

    const mockPrices = {
      'XAUUSD': 2650.45,
      'BTCUSD': 95420.50,
      'EURUSD': 1.0845,
      'GBPUSD': 1.2678,
      'USA30': 44280.15,
      'NAS100': 18950.20,
      'SPX500': 5820.35,
      'USDJPY': 149.85
    };

    const basePrice = mockPrices[selectedAsset.symbol as keyof typeof mockPrices] || 1.0000;
    
    // Simulate price movement
    const interval = setInterval(() => {
      const change = (Math.random() - 0.5) * 0.002; // ±0.2% max change
      setLivePrice(prev => Math.max(0, prev + (prev * change)));
    }, 1000);

    setLivePrice(basePrice);
    return () => clearInterval(interval);
  }, [selectedAsset]);

  // Auto-sync between price and pip inputs
  const convertPipsToPrice = (pips: number, basePrice: number): number => {
    if (!selectedAsset) return 0;
    return basePrice + (pips * selectedAsset.pipSize);
  };

  const convertPriceToPips = (price: number, basePrice: number): number => {
    if (!selectedAsset) return 0;
    return Math.round((price - basePrice) / selectedAsset.pipSize);
  };

  // Handle pip input changes
  const handlePipChange = (field: keyof typeof pipValues, value: number) => {
    const basePrice = useLivePrice ? livePrice : (formData.entry_price || 0);
    if (basePrice === 0) return;

    setPipValues(prev => ({ ...prev, [field]: value }));
    
    const priceValue = convertPipsToPrice(value, basePrice);
    const formField = field === 'stopLoss' ? 'stop_loss' : field;
    
    setFormData(prev => ({ ...prev, [formField]: priceValue }));
  };

  // Handle price input changes
  const handlePriceChange = (field: string, value: number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Update pip values if in pip mode
    if (pipMode && selectedAsset) {
      const basePrice = useLivePrice ? livePrice : (formData.entry_price || 0);
      if (basePrice > 0) {
        const pipValue = convertPriceToPips(value, basePrice);
        const pipField = field === 'stop_loss' ? 'stopLoss' : field as keyof typeof pipValues;
        setPipValues(prev => ({ ...prev, [pipField]: pipValue }));
      }
    }
  };

  // Use current live price
  const handleUseLivePrice = () => {
    if (livePrice > 0) {
      setFormData(prev => ({ ...prev, entry_price: livePrice }));
      setUseLivePrice(true);
      toast({
        title: "Live Price Applied",
        description: `Entry price set to current market price: ${livePrice.toFixed(selectedAsset?.pipSize === 0.01 ? 2 : 4)}`
      });
    }
  };

  // Calculate risk/reward ratio
  const calculateRiskReward = useMemo(() => {
    const entry = formData.entry_price || 0;
    const tp1 = formData.tp1 || 0;
    const sl = formData.stop_loss || 0;
    
    if (entry === 0 || tp1 === 0 || sl === 0) return null;
    
    const risk = Math.abs(entry - sl);
    const reward = Math.abs(tp1 - entry);
    const ratio = reward / risk;
    
    return { risk, reward, ratio };
  }, [formData.entry_price, formData.tp1, formData.stop_loss]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.asset || !formData.entry_price) {
      toast({
        title: "Missing Information",
        description: "Please select an asset and set entry price.",
        variant: "destructive"
      });
      return;
    }

    const alertData: TradeAlertData = {
      ...formData as TradeAlertData,
      user_id: user?.id || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'pending'
    };

    onSubmit(alertData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="max-w-6xl mx-auto p-6 space-y-6"
      style={{ willChange: 'transform' }} // Optimize for animations
    >
      <Card className="bg-surface/50 backdrop-blur-sm border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Zap className="w-6 h-6 text-primary" />
            Create New Trade Alert
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Asset Selection & Live Price */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="asset" className="text-base font-medium">Trading Asset</Label>
                  <Select value={formData.asset} onValueChange={(value) => setFormData(prev => ({ ...prev, asset: value }))}>
                    <SelectTrigger className="h-12 text-base">
                      <SelectValue placeholder="Select trading asset" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(
                        POPULAR_ASSETS.reduce((acc, asset) => {
                          if (!acc[asset.category]) acc[asset.category] = [];
                          acc[asset.category].push(asset);
                          return acc;
                        }, {} as Record<string, typeof POPULAR_ASSETS>)
                      ).map(([category, assets]) => (
                        <div key={category}>
                          <div className="px-2 py-1 text-sm font-medium text-muted-foreground">{category}</div>
                          {assets.map((asset) => (
                            <SelectItem key={asset.symbol} value={asset.symbol}>
                              <div className="flex items-center justify-between w-full">
                                <span>{asset.name}</span>
                                <Badge variant="outline" className="ml-2 text-xs">{asset.symbol}</Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="type" className="text-base font-medium">Trade Direction</Label>
                  <Select value={formData.type} onValueChange={(value: 'BUY' | 'SELL') => setFormData(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger className="h-12 text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BUY">
                        <div className="flex items-center gap-2">
                          <ArrowUp className="w-4 h-4 text-accentGreen" />
                          <span>BUY / Long</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="SELL">
                        <div className="flex items-center gap-2">
                          <ArrowDown className="w-4 h-4 text-destructive" />
                          <span>SELL / Short</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Live Price Display */}
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Live Market Price
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedAsset ? (
                    <>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary mb-1">
                          {livePrice.toFixed(selectedAsset.pipSize === 0.01 ? 2 : 4)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {selectedAsset.name} ({selectedAsset.symbol})
                        </div>
                      </div>
                      <Button
                        type="button"
                        onClick={handleUseLivePrice}
                        className="w-full"
                        variant="outline"
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        Use Current Price
                      </Button>
                    </>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      Select an asset to view live price
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* Price/Pip Input Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Input Mode</Label>
                <p className="text-sm text-muted-foreground">Switch between price and pip calculations</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={pipMode ? "text-muted-foreground" : "text-primary font-medium"}>Price</span>
                <Switch
                  checked={pipMode}
                  onCheckedChange={setPipMode}
                  disabled={!selectedAsset}
                />
                <span className={pipMode ? "text-primary font-medium" : "text-muted-foreground"}>Pips</span>
              </div>
            </div>

            {/* Entry Price */}
            <div>
              <Label htmlFor="entry_price" className="text-base font-medium">Entry Price</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="entry_price"
                  type="number"
                  step="any"
                  value={formData.entry_price || ''}
                  onChange={(e) => handlePriceChange('entry_price', parseFloat(e.target.value) || 0)}
                  className="h-12 text-base"
                  placeholder="0.0000"
                />
                {useLivePrice && (
                  <Badge variant="secondary" className="self-center px-3 py-2">
                    Live Price Applied
                  </Badge>
                )}
              </div>
            </div>

            {/* Take Profit Levels */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-accentGreen" />
                <Label className="text-base font-medium">Take Profit Levels</Label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {(['tp1', 'tp2', 'tp3', 'tp4', 'tp5'] as const).map((tp, index) => (
                  <div key={tp}>
                    <Label htmlFor={tp} className="text-sm">TP {index + 1}</Label>
                    {pipMode && selectedAsset ? (
                      <Input
                        id={`${tp}_pips`}
                        type="number"
                        value={pipValues[tp] || ''}
                        onChange={(e) => handlePipChange(tp, parseFloat(e.target.value) || 0)}
                        className="mt-1"
                        placeholder="0"
                      />
                    ) : (
                      <Input
                        id={tp}
                        type="number"
                        step="any"
                        value={formData[tp] || ''}
                        onChange={(e) => handlePriceChange(tp, parseFloat(e.target.value) || 0)}
                        className="mt-1"
                        placeholder="0.0000"
                      />
                    )}
                    {pipMode && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Price: {formData[tp]?.toFixed(selectedAsset?.pipSize === 0.01 ? 2 : 4) || '0.0000'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Stop Loss */}
            <div>
              <Label htmlFor="stop_loss" className="text-base font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-destructive" />
                Stop Loss
              </Label>
              <div className="mt-1">
                {pipMode && selectedAsset ? (
                  <Input
                    id="stop_loss_pips"
                    type="number"
                    value={pipValues.stopLoss || ''}
                    onChange={(e) => handlePipChange('stopLoss', parseFloat(e.target.value) || 0)}
                    className="h-12 text-base"
                    placeholder="0"
                  />
                ) : (
                  <Input
                    id="stop_loss"
                    type="number"
                    step="any"
                    value={formData.stop_loss || ''}
                    onChange={(e) => handlePriceChange('stop_loss', parseFloat(e.target.value) || 0)}
                    className="h-12 text-base"
                    placeholder="0.0000"
                  />
                )}
                {pipMode && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Price: {formData.stop_loss?.toFixed(selectedAsset?.pipSize === 0.01 ? 2 : 4) || '0.0000'}
                  </div>
                )}
              </div>
            </div>

            {/* Risk/Reward Analysis */}
            {calculateRiskReward && (
              <Card className="bg-surface/30 border-primary/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calculator className="w-4 h-4" />
                    Trade Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-destructive">
                        {calculateRiskReward.risk.toFixed(selectedAsset?.pipSize === 0.01 ? 2 : 4)}
                      </div>
                      <div className="text-sm text-muted-foreground">Risk</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-accentGreen">
                        {calculateRiskReward.reward.toFixed(selectedAsset?.pipSize === 0.01 ? 2 : 4)}
                      </div>
                      <div className="text-sm text-muted-foreground">Reward</div>
                    </div>
                    <div>
                      <div className={`text-2xl font-bold ${calculateRiskReward.ratio >= 2 ? 'text-accentGreen' : calculateRiskReward.ratio >= 1 ? 'text-primary' : 'text-destructive'}`}>
                        1:{calculateRiskReward.ratio.toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">R:R Ratio</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Analysis */}
            <div>
              <Label htmlFor="analysis" className="text-base font-medium">Trade Analysis</Label>
              <Textarea
                id="analysis"
                value={formData.analysis || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, analysis: e.target.value }))}
                className="mt-1 min-h-[120px]"
                placeholder="Describe your trade setup, technical analysis, and reasoning..."
              />
            </div>

            {/* Risk Level */}
            <div>
              <Label htmlFor="risk_level" className="text-base font-medium">Risk Level</Label>
              <Select value={formData.risk_level} onValueChange={(value: 'low' | 'medium' | 'high') => setFormData(prev => ({ ...prev, risk_level: value }))}>
                <SelectTrigger className="mt-1 h-12 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-accentGreen"></div>
                      Low Risk
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      Medium Risk
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-destructive"></div>
                      High Risk
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-14 text-lg"
              disabled={isLoading || !formData.asset || !formData.entry_price}
            >
              {isLoading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
                  />
                  Creating Alert...
                </>
              ) : (
                'Create Trade Alert'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
