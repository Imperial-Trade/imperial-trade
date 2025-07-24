
import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calculator, TrendingDown, AlertTriangle, Target, BarChart3, DollarSign, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAssetSearch } from '@/hooks/useAssetSearch';
import { calculatePnL, calculateRiskAmount, formatLotSize, getLotSizeSpec } from '@/utils/lotSizing';
import { ComplianceNotice, EducationalBadge, HypotheticalBadge } from '@/components/compliance/ComplianceNotice';

export default function RiskSimulator() {
  const [tradeParams, setTradeParams] = useState({
    instrument: '',
    entry_price: '',
    stop_loss: '',
    take_profit: '',
    position_size: ''
  });
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);
  const [error, setError] = useState('');
  
  // Asset selection states
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);
  const dropdownTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Use asset search hook with automatic currency detection
  const { suggestions, saveRecentAsset } = useAssetSearch({ 
    query: tradeParams.instrument,
    delay: 300 
  });

  // Asset selection handlers
  const handleAssetSelect = useCallback((asset: string) => {
    handleInputChange('instrument', asset);
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
    setTradeParams(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const simulateRisk = async () => {
    // Validate inputs
    if (!tradeParams.instrument || !tradeParams.entry_price || !tradeParams.stop_loss || !tradeParams.take_profit || !tradeParams.position_size) {
      setError('Please fill in all fields for educational analysis');
      return;
    }
    
    setIsSimulating(true);
    setError('');
    
    try {
      // Calculate actual values using lot sizing mechanics
      const entry = parseFloat(tradeParams.entry_price);
      const stop = parseFloat(tradeParams.stop_loss);
      const tp = parseFloat(tradeParams.take_profit);
      const lotSize = parseFloat(tradeParams.position_size);
      
      const riskAmount = calculateRiskAmount(entry, stop, lotSize, tradeParams.instrument);
      const profitAmount = Math.abs(calculatePnL(entry, tp, lotSize, tradeParams.instrument));
      const riskRewardRatio = riskAmount > 0 ? profitAmount / riskAmount : 0;
      
      const spec = getLotSizeSpec(tradeParams.instrument);
      
      // Enhanced mock simulation result with real calculations for educational purposes
      const mockResult = {
        risk_reward_ratio: riskRewardRatio,
        stop_loss_probability: Math.floor(Math.random() * 30) + 20,
        take_profit_probability: Math.floor(Math.random() * 40) + 40,
        volatility_assessment: `Educational example: ${spec.assetType.charAt(0).toUpperCase() + spec.assetType.slice(1)} markets showing moderate volatility`,
        position_sizing_feedback: `Educational analysis: Position of ${formatLotSize(lotSize, tradeParams.instrument)} for learning ${spec.assetType} concepts`,
        overall_risk_score: Math.floor(Math.random() * 6) + 3,
        recommendations: [
          `Educational focus: Consider ${spec.assetType}-specific market conditions for learning`, 
          "Educational reminder: Monitor economic events affecting this asset class", 
          "Learning objective: Ensure position size aligns with educational risk management principles"
        ],
        market_conditions: `Educational example: ${spec.assetType.charAt(0).toUpperCase() + spec.assetType.slice(1)} markets showing mixed signals with moderate volatility`,
        calculated_risk: riskAmount,
        calculated_profit: profitAmount,
        asset_type: spec.assetType
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      setSimulationResult(mockResult);
    } catch (error) {
      setError('Educational simulation failed. Please check your inputs and try again.');
    }
    setIsSimulating(false);
  };

  const getRiskColor = score => {
    if (score <= 3) return 'text-accent-green';
    if (score <= 6) return 'text-accent-gold';
    return 'text-accent-red';
  };

  const getRiskLabel = score => {
    if (score <= 3) return 'Low Risk Example';
    if (score <= 6) return 'Medium Risk Example';
    return 'High Risk Example';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Compliance Notice */}
        <div className="mb-6">
          <ComplianceNotice type="hypothetical" size="md" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Pane - Educational Setup Analysis */}
          <div className="space-y-6">
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                  <Calculator className="w-6 h-6 text-blue-400" />
                  Educational Setup Analysis
                </h2>
                
                <div className="space-y-2 mb-4">
                  <EducationalBadge />
                  <HypotheticalBadge />
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Educational Asset</label>
                      <div className="relative">
                        <Input 
                          placeholder="Educational Asset (e.g., EURUSD, XAUUSD, BTCUSDT)" 
                          value={tradeParams.instrument} 
                          onChange={e => handleInputChange('instrument', e.target.value)} 
                          onFocus={handleAssetFocus}
                          onBlur={handleAssetBlur}
                          className="bg-background pr-8" 
                        />
                        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />

                        {showAssetDropdown && (
                          <div
                            className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-[100] max-h-48 overflow-y-auto"
                            onMouseDown={handleDropdownMouseDown}
                          >
                            {suggestions && suggestions.length > 0 ? (
                              <div className="p-1">
                                {!tradeParams.instrument && (
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
                            ) : tradeParams.instrument ? (
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
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Educational Position Size
                        {tradeParams.position_size && tradeParams.instrument && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({formatLotSize(parseFloat(tradeParams.position_size) || 0, tradeParams.instrument)})
                          </span>
                        )}
                      </label>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="0.1 (for educational analysis)" 
                        value={tradeParams.position_size} 
                        onChange={e => handleInputChange('position_size', e.target.value)} 
                        className="bg-background" 
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Educational Entry Price</label>
                    <Input 
                      type="number" 
                      step="0.00001" 
                      placeholder="1.0850 (hypothetical)" 
                      value={tradeParams.entry_price} 
                      onChange={e => handleInputChange('entry_price', e.target.value)} 
                      className="bg-background" 
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Educational Stop Loss</label>
                    <Input 
                      type="number" 
                      step="0.00001" 
                      placeholder="1.0800 (learning example)" 
                      value={tradeParams.stop_loss} 
                      onChange={e => handleInputChange('stop_loss', e.target.value)} 
                      className="bg-background" 
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Educational Take Profit</label>
                    <Input 
                      type="number" 
                      step="0.00001" 
                      placeholder="1.0950 (educational target)" 
                      value={tradeParams.take_profit} 
                      onChange={e => handleInputChange('take_profit', e.target.value)} 
                      className="bg-background" 
                    />
                  </div>
                </div>

                <Button 
                  onClick={simulateRisk} 
                  disabled={isSimulating} 
                  className="w-full mt-6 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white py-3"
                >
                  {isSimulating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                      Running Educational Analysis...
                    </>
                  ) : (
                    <>
                      <Target className="w-5 h-5 mr-2" />
                      Analyze Educational Setup
                    </>
                  )}
                </Button>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg"
                  >
                    {error}
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Pane - Educational Analysis Results */}
          <div className="space-y-6">
            {simulationResult ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {/* Educational Core Numbers */}
                <Card className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border-green-500/30">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-foreground mb-4">Educational Numbers</h3>
                    <div className="mb-2">
                      <HypotheticalBadge />
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <DollarSign className="w-8 h-8 text-green-400 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Hypothetical Profit</p>
                        <p className="text-xl font-bold text-green-400">
                          ${simulationResult.calculated_profit?.toFixed(2) || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <TrendingDown className="w-8 h-8 text-red-400 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Educational Loss</p>
                        <p className="text-xl font-bold text-red-400">
                          ${simulationResult.calculated_risk?.toFixed(2) || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <Target className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Learning R:R</p>
                        <p className="text-xl font-bold text-blue-400">{simulationResult.risk_reward_ratio?.toFixed(1)}:1</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground text-center mt-2 italic">
                      These are hypothetical educational examples only
                    </p>
                  </CardContent>
                </Card>

                {/* Educational Probability Analysis */}
                <Card className="bg-card border-border">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-purple-400" />
                      Educational Probability Analysis
                    </h3>
                    <div className="mb-2">
                      <HypotheticalBadge />
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Hypothetical Take Profit Hit:</span>
                        <span className="text-green-400 font-bold">65%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Educational Stop Loss Hit:</span>
                        <span className="text-red-400 font-bold">{simulationResult.stop_loss_probability}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-3 mt-4">
                        <div className="bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 h-3 rounded-full w-full"></div>
                      </div>
                      <p className="text-xs text-muted-foreground italic">
                        Educational probabilities for learning purposes only
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Educational Risk Assessment */}
                <Card className="bg-card border-border">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-foreground mb-4">Educational Risk Assessment</h3>
                    <div className="mb-2">
                      <EducationalBadge />
                    </div>
                    <p className="text-muted-foreground mb-4">{simulationResult.market_conditions}</p>
                    <div className="space-y-2">
                      {simulationResult.recommendations?.slice(0, 2).map((rec, index) => (
                        <div key={index} className="flex items-start gap-2 p-3 bg-yellow-500/5 rounded-lg border border-yellow-500/20">
                          <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{rec}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground text-center mt-4 italic">
                      All assessments are for educational purposes and learning only
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-8 text-center">
                  <BarChart3 className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">Ready for Educational Analysis</h3>
                  <p className="text-muted-foreground mb-2">Enter your hypothetical setup parameters and click "Analyze Educational Setup"</p>
                  <EducationalBadge />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
