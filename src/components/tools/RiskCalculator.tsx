
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Calculator, DollarSign, TrendingUp, AlertTriangle, Bot, Shield, Target, Brain, Search, Percent } from 'lucide-react';
import { useAssetSearch } from '@/hooks/useAssetSearch';
import { calculatePositionSize, calculateRiskAmount, calculatePnL, formatLotSize, getLotSizeSpec } from '@/utils/lotSizing';
import { ComplianceNotice, EducationalBadge, HypotheticalBadge } from '@/components/compliance/ComplianceNotice';

export default function RiskCalculator() {
  const [formData, setFormData] = useState({
    accountBalance: '',
    riskPercentage: [2],
    riskDollar: '',
    entryPrice: '',
    stopLoss: '',
    takeProfit: '',
    assetTicker: ''
  });
  
  // Risk type toggle state
  const [riskType, setRiskType] = useState<'percentage' | 'dollar'>('percentage');
  
  // Asset selection states
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);
  const dropdownTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Use asset search hook with automatic currency detection
  const { suggestions, saveRecentAsset } = useAssetSearch({ 
    query: formData.assetTicker,
    delay: 300 
  });
  
  const [results, setResults] = useState(null);
  const [aiSanityCheck, setAiSanityCheck] = useState(null);

  // Asset selection handlers
  const handleAssetSelect = useCallback((asset: string) => {
    handleInputChange('assetTicker', asset);
    saveRecentAsset(asset);
    setShowAssetDropdown(false);
  }, [saveRecentAsset]);

  const handleAssetFocus = useCallback(() => {
    setShowAssetDropdown(true);
  }, []);

  const handleAssetBlur = useCallback(() => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setShowAssetDropdown(false);
    }, 300);
  }, []);

  const handleDropdownMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
    }
  }, []);

  // Get asset badge for visual categorization
  const getAssetBadge = useCallback((asset: string) => {
    if (['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD'].some(pair => asset.includes(pair.replace('/', '')))) 
      return { label: "FX", variant: "outline" as const };
    if (['XAU/USD', 'XAG/USD', 'WTI/USD', 'BRENT/USD'].some(comm => asset.includes(comm.replace('/', '')))) 
      return { label: "Gold", variant: "outline" as const };
    if (['SPX500', 'US30', 'NAS100', 'UK100', 'DAX30', 'JP225'].includes(asset)) 
      return { label: "Index", variant: "outline" as const };
    if (asset.includes("USDT")) return { label: "Crypto", variant: "outline" as const };
    return null;
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Real-time calculation as user types
  useEffect(() => {
    const hasRequiredFields = formData.entryPrice && formData.stopLoss && formData.assetTicker &&
      ((riskType === 'percentage' && formData.accountBalance && formData.riskPercentage) ||
       (riskType === 'dollar' && formData.riskDollar));
    
    if (hasRequiredFields) {
      calculateRisk();
    }
  }, [formData, riskType]);

  const calculateRisk = () => {
    const {
      accountBalance,
      riskPercentage,
      riskDollar,
      entryPrice,
      stopLoss,
      takeProfit,
      assetTicker
    } = formData;
    
    const entry = parseFloat(entryPrice);
    const stop = parseFloat(stopLoss);
    const tp = takeProfit ? parseFloat(takeProfit) : null;
    
    // Calculate risk amount based on selected type
    let riskAmount;
    if (riskType === 'percentage') {
      if (!accountBalance || !riskPercentage || !entryPrice || !stopLoss || !assetTicker) {
        return;
      }
      const balance = parseFloat(accountBalance);
      const risk = riskPercentage[0];
      riskAmount = balance * risk / 100;
    } else {
      if (!riskDollar || !entryPrice || !stopLoss || !assetTicker) {
        return;
      }
      riskAmount = parseFloat(riskDollar);
    }
    
    // Use proper lot sizing mechanics
    const positionSize = calculatePositionSize(riskAmount, entry, stop, assetTicker);
    const potentialLoss = calculateRiskAmount(entry, stop, positionSize, assetTicker);
    const potentialProfit = tp ? Math.abs(calculatePnL(entry, tp, positionSize, assetTicker)) : 0;
    const riskReward = potentialLoss > 0 ? potentialProfit / potentialLoss : 0;
    
    const spec = getLotSizeSpec(assetTicker);
    const pipValue = Math.abs(entry - stop);
    
    setResults({
      riskAmount: riskAmount.toFixed(2),
      positionSize: positionSize.toFixed(2),
      potentialLoss: potentialLoss.toFixed(2),
      potentialProfit: potentialProfit.toFixed(2),
      riskReward: riskReward.toFixed(2),
      pipValue: pipValue.toFixed(2),
      assetType: spec.assetType,
      formattedLotSize: formatLotSize(positionSize, assetTicker)
    });

    // Educational Sanity Check
    const riskPercentageForAI = riskType === 'percentage' ? riskPercentage[0] : 
      (accountBalance ? (riskAmount / parseFloat(accountBalance)) * 100 : 0);
    generateEducationalSanityCheck(entry, stop, riskPercentageForAI, riskReward);
  };

  const generateEducationalSanityCheck = (entry, stop, risk, riskReward) => {
    const stopDistance = Math.abs((entry - stop) / entry * 100);
    let message = "";
    let type = "neutral";
    let confidence = 0;

    if (risk > 5) {
      message = "⚠️ Educational note: Risking more than 5% per setup significantly increases learning curve complexity.";
      type = "warning";
      confidence = 95;
    } else if (stopDistance < 0.5) {
      message = "🔍 Educational observation: Very tight stop loss detected. This setup may be challenging for learning due to market noise.";
      type = "warning"; 
      confidence = 82;
    } else if (riskReward > 3) {
      message = "✅ Excellent educational example! This setup offers strong learning potential with favorable risk-reward structure.";
      type = "positive";
      confidence = 88;
    } else if (riskReward < 1) {
      message = "❌ Educational concern: Poor risk-reward ratio detected. Consider adjusting levels for better learning value.";
      type = "negative";
      confidence = 90;
    } else {
      message = "👍 Solid educational setup. Risk and reward levels appear well-balanced for learning purposes.";
      type = "positive";
      confidence = 75;
    }

    setAiSanityCheck({
      message,
      type,
      confidence
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-2 sm:p-4 lg:p-6">
      <div className="max-w-6xl mx-auto space-y-3 sm:space-y-6">
        {/* Compliance Notice */}
        <ComplianceNotice type="educational" size="sm" />

        <Card className="bg-card/50 border-border/50 shadow-xl sm:shadow-2xl backdrop-blur-sm">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="truncate">Educational Setup Calculator</span>
            </CardTitle>
            <div className="flex gap-1 sm:gap-2 flex-wrap">
              <EducationalBadge />
              <HypotheticalBadge />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 space-y-4 sm:space-y-6">
            {/* Asset Selection Section */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Educational Asset / Learning Pair</label>
              <div className="relative">
                <Input
                  placeholder="Educational Asset (e.g., EURUSD, XAUUSD, BTCUSDT)"
                  value={formData.assetTicker}
                  onChange={e => handleInputChange('assetTicker', e.target.value)}
                  onFocus={handleAssetFocus}
                  onBlur={handleAssetBlur}
                  className="bg-background border-border text-foreground h-12 text-lg pr-8"
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />

                {showAssetDropdown && (
                  <div
                    className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-[100] max-h-48 overflow-y-auto"
                    onMouseDown={handleDropdownMouseDown}
                  >
                    {suggestions && suggestions.length > 0 ? (
                      <div className="p-1">
                        {!formData.assetTicker && (
                          <div className="px-3 py-2 text-xs text-muted-foreground font-medium border-b border-border/30 mb-1">
                            Recent Educational Assets
                          </div>
                        )}
                        {suggestions.map((asset) => {
                          const badge = getAssetBadge(asset);
                          return (
                            <button
                              key={asset}
                              type="button"
                              onClick={() => handleAssetSelect(asset)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 rounded-sm transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{asset}</span>
                                {badge && (
                                  <Badge variant={badge.variant} className="text-xs h-5 px-2">
                                    {badge.label}
                                  </Badge>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : formData.assetTicker ? (
                      <div className="p-3 text-sm text-muted-foreground text-center">
                        No matches found
                      </div>
                    ) : (
                      <div className="p-3 text-sm text-muted-foreground text-center">
                        Start typing to see educational suggestions
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Risk Type Toggle */}
              <div className="lg:col-span-2 space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 bg-muted/30 rounded-lg border border-border/50 gap-3 sm:gap-0">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 flex-shrink-0">
                      {riskType === 'percentage' ? (
                        <Percent className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                      ) : (
                        <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-foreground text-sm sm:text-base truncate">
                        {riskType === 'percentage' ? 'Educational Risk Percentage' : 'Educational Dollar Risk Amount'}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {riskType === 'percentage' 
                          ? 'Calculate educational risk as % of hypothetical account balance'
                          : 'Set a fixed educational dollar amount for learning'
                        }
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={riskType === 'dollar'}
                    onCheckedChange={(checked) => setRiskType(checked ? 'dollar' : 'percentage')}
                    className="flex-shrink-0"
                  />
                </div>
              </div>

              {riskType === 'percentage' ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Educational Account Balance ($)</label>
                    <Input 
                      type="number" 
                      placeholder="e.g., 10000 (hypothetical)" 
                      value={formData.accountBalance} 
                      onChange={e => handleInputChange('accountBalance', e.target.value)} 
                      className="bg-background border-border text-foreground h-12 text-lg" 
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <label className="text-sm font-medium text-foreground">Educational Risk Percentage: {formData.riskPercentage[0]}%</label>
                    <Slider
                      value={formData.riskPercentage}
                      onValueChange={(value) => handleInputChange('riskPercentage', value)}
                      max={10}
                      min={0.1}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Conservative Learning (0.1%)</span>
                      <span>Aggressive Learning (10%)</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-medium text-foreground">Educational Dollar Risk Amount ($)</label>
                  <Input 
                    type="number" 
                    placeholder="e.g., 200 (hypothetical)" 
                    value={formData.riskDollar} 
                    onChange={e => handleInputChange('riskDollar', e.target.value)} 
                    className="bg-background border-border text-foreground h-12 text-lg" 
                  />
                  <p className="text-xs text-muted-foreground">
                    Fixed hypothetical dollar amount for educational risk learning
                  </p>
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Educational Entry Price</label>
                <Input 
                  type="number" 
                  step="0.00001" 
                  placeholder="e.g., 1.1500 (hypothetical)" 
                  value={formData.entryPrice} 
                  onChange={e => handleInputChange('entryPrice', e.target.value)} 
                  className="bg-background border-border text-foreground h-12 text-lg" 
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Educational Stop Loss</label>
                <Input 
                  type="number" 
                  step="0.00001" 
                  placeholder="e.g., 1.1450 (learning example)" 
                  value={formData.stopLoss} 
                  onChange={e => handleInputChange('stopLoss', e.target.value)} 
                  className="bg-background border-border text-foreground h-12 text-lg" 
                />
              </div>
              
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-foreground">Educational Take Profit (Optional)</label>
                <Input 
                  type="number" 
                  step="0.00001" 
                  placeholder="e.g., 1.1600 (educational target)" 
                  value={formData.takeProfit} 
                  onChange={e => handleInputChange('takeProfit', e.target.value)} 
                  className="bg-background border-border text-foreground h-12 text-lg" 
                />
              </div>
            </div>

            {/* Real-time Educational Results */}
            {results && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-5 h-5 text-primary" />
                  <h3 className="text-xl font-semibold text-foreground">Instant Educational Risk Analysis</h3>
                  <HypotheticalBadge />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <Card className="bg-card/50 border-border/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
                    <CardContent className="p-3 sm:p-4 lg:p-6 text-center">
                      <div className="p-2 sm:p-3 rounded-xl bg-accent-red/10 w-fit mx-auto mb-2 sm:mb-3">
                        <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-accent-red" />
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">Educational $ Amount at Risk</p>
                      <p className="text-lg sm:text-xl lg:text-2xl font-bold text-accent-red">${results.riskAmount}</p>
                      <p className="text-xs text-muted-foreground italic">Hypothetical only</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-card/50 border-border/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
                    <CardContent className="p-6 text-center">
                      <div className="p-3 rounded-xl bg-primary/10 w-fit mx-auto mb-3">
                        <TrendingUp className="w-6 h-6 text-primary" />
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">Educational Position Size</p>
                      <p className="text-2xl font-bold text-foreground">{results.positionSize}</p>
                      <p className="text-xs text-muted-foreground mt-1">{results.formattedLotSize}</p>
                      <p className="text-xs text-muted-foreground italic">Learning example</p>
                    </CardContent>
                  </Card>
                  
                  {results.potentialProfit > 0 && (
                    <>
                      <Card className="bg-card/50 border-border/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
                        <CardContent className="p-6 text-center">
                          <div className="p-3 rounded-xl bg-accent-green/10 w-fit mx-auto mb-3">
                            <DollarSign className="w-6 h-6 text-accent-green" />
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">Educational Potential Profit</p>
                          <p className="text-2xl font-bold text-accent-green">${results.potentialProfit}</p>
                          <p className="text-xs text-muted-foreground italic">Hypothetical example</p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-card/50 border-border/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
                        <CardContent className="p-6 text-center">
                          <div className="p-3 rounded-xl bg-accent-gold/10 w-fit mx-auto mb-3">
                            <Target className="w-6 h-6 text-accent-gold" />
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">Educational Risk:Reward</p>
                          <p className="text-2xl font-bold text-accent-gold">1:{results.riskReward}</p>
                          <p className="text-xs text-muted-foreground italic">Learning ratio</p>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </div>

                {/* Educational AI Sanity Check */}
                {aiSanityCheck && (
                  <Card className={`border-2 ${aiSanityCheck.type === 'positive' ? 'border-accent-green/30 bg-accent-green/5' : aiSanityCheck.type === 'warning' ? 'border-accent-gold/30 bg-accent-gold/5' : 'border-accent-red/30 bg-accent-red/5'}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <Brain className={`w-6 h-6 ${aiSanityCheck.type === 'positive' ? 'text-accent-green' : aiSanityCheck.type === 'warning' ? 'text-accent-gold' : 'text-accent-red'}`} />
                        <h3 className="text-lg font-semibold text-foreground">Educational AI Analysis</h3>
                        <EducationalBadge />
                      </div>
                      <p className="text-muted-foreground mb-2">{aiSanityCheck.message}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Educational Confidence: {aiSanityCheck.confidence}%</span>
                        <span className="text-xs italic">• For learning purposes only</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
