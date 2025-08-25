
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search,
  TrendingUp,
  TrendingDown,
  Calculator,
  Target,
  Shield,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface SignalCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (signalData: any) => void;
}

const ASSET_CATEGORIES = [
  { name: 'Forex', assets: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD'] },
  { name: 'Crypto', assets: ['BTCUSD', 'ETHUSD', 'ADAUSD', 'LINKUSD', 'DOTUSD'] },
  { name: 'Commodities', assets: ['XAUUSD', 'XAGUSD', 'USOIL', 'UKOIL', 'NATGAS'] },
  { name: 'Indices', assets: ['US30', 'US500', 'NAS100', 'GER40', 'UK100'] }
];

export const SignalCreationWizard: React.FC<SignalCreationWizardProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    assetName: '',
    tradermadeSymbol: '',
    tradeType: 'buy',
    entryPrice: '',
    stopLoss: '',
    tp1: '',
    tp2: '',
    tp3: '',
    tp4: '',
    tp5: '',
    notes: '',
    riskLevel: 'medium',
    confidence: '75',
    volume: '0.1'
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Forex');

  const steps = [
    { title: 'Asset Selection', icon: Search },
    { title: 'Trade Setup', icon: TrendingUp },
    { title: 'Risk Management', icon: Shield },
    { title: 'Analysis & Notes', icon: BarChart3 },
    { title: 'Review & Publish', icon: CheckCircle }
  ];

  const filteredAssets = ASSET_CATEGORIES.find(cat => cat.name === selectedCategory)?.assets.filter(
    asset => asset.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Risk calculation
  const calculateRisk = () => {
    const entry = parseFloat(formData.entryPrice);
    const sl = parseFloat(formData.stopLoss);
    if (entry && sl) {
      return ((Math.abs(entry - sl) / entry) * 100).toFixed(2);
    }
    return '0.00';
  };

  const calculateRiskReward = () => {
    const entry = parseFloat(formData.entryPrice);
    const sl = parseFloat(formData.stopLoss);
    const tp1 = parseFloat(formData.tp1);
    if (entry && sl && tp1) {
      const risk = Math.abs(entry - sl);
      const reward = Math.abs(tp1 - entry);
      return (reward / risk).toFixed(2);
    }
    return '0.00';
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    const signalData = {
      assetName: formData.assetName,
      tradermadeSymbol: formData.tradermadeSymbol || formData.assetName,
      tradeType: formData.tradeType,
      entryPrice: parseFloat(formData.entryPrice),
      stopLoss: parseFloat(formData.stopLoss),
      tp1: formData.tp1 ? parseFloat(formData.tp1) : undefined,
      tp2: formData.tp2 ? parseFloat(formData.tp2) : undefined,
      tp3: formData.tp3 ? parseFloat(formData.tp3) : undefined,
      tp4: formData.tp4 ? parseFloat(formData.tp4) : undefined,
      tp5: formData.tp5 ? parseFloat(formData.tp5) : undefined,
      notes: formData.notes,
    };
    onSubmit(signalData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <Card className="bg-trading-bg-secondary border-trading-border shadow-trading-elevated">
          <CardHeader className="border-b border-trading-border/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl text-trading-text-primary flex items-center space-x-2">
                <Zap className="w-6 h-6 text-trading-success" />
                <span>Create Professional Signal</span>
              </CardTitle>
              <Button
                variant="ghost"
                onClick={onClose}
                className="text-trading-text-muted hover:text-trading-text-primary"
              >
                ✕
              </Button>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-between mt-6">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className={`flex items-center space-x-2 ${
                    index <= currentStep 
                      ? 'text-trading-success' 
                      : 'text-trading-text-muted'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                    index <= currentStep 
                      ? 'border-trading-success bg-trading-success-bg' 
                      : 'border-trading-border'
                  }`}>
                    {index < currentStep ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <step.icon className="w-4 h-4" />
                    )}
                  </div>
                  <span className="text-sm font-medium hidden md:block">{step.title}</span>
                  {index < steps.length - 1 && (
                    <div className={`w-8 h-0.5 mx-2 ${
                      index < currentStep ? 'bg-trading-success' : 'bg-trading-border'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <AnimatePresence mode="wait">
              {/* Step 1: Asset Selection */}
              {currentStep === 0 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-xl font-bold text-trading-text-primary mb-4">
                      Select Trading Asset
                    </h3>
                    
                    {/* Category Tabs */}
                    <div className="flex space-x-2 mb-4">
                      {ASSET_CATEGORIES.map((category) => (
                        <Button
                          key={category.name}
                          variant={selectedCategory === category.name ? "default" : "outline"}
                          onClick={() => setSelectedCategory(category.name)}
                          className={selectedCategory === category.name 
                            ? "bg-trading-success text-white"
                            : "border-trading-border text-trading-text-secondary"
                          }
                        >
                          {category.name}
                        </Button>
                      ))}
                    </div>

                    {/* Search */}
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-trading-text-muted" />
                      <Input
                        placeholder="Search assets..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-trading-bg-tertiary border-trading-border text-trading-text-primary"
                      />
                    </div>

                    {/* Asset Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {filteredAssets.map((asset) => (
                        <motion.div
                          key={asset}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setFormData({...formData, assetName: asset, tradermadeSymbol: asset})}
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            formData.assetName === asset
                              ? 'border-trading-success bg-trading-success-bg'
                              : 'border-trading-border bg-trading-bg-tertiary hover:border-trading-success/50'
                          }`}
                        >
                          <div className="text-center">
                            <div className="font-bold text-trading-text-primary">{asset}</div>
                            <div className="text-xs text-trading-text-muted mt-1">
                              {selectedCategory}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Trade Setup */}
              {currentStep === 1 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <h3 className="text-xl font-bold text-trading-text-primary mb-4">
                    Trade Setup
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Trade Direction */}
                    <div>
                      <Label className="text-trading-text-primary">Trade Direction</Label>
                      <Select value={formData.tradeType} onValueChange={(value) => setFormData({...formData, tradeType: value})}>
                        <SelectTrigger className="bg-trading-bg-tertiary border-trading-border text-trading-text-primary">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-trading-bg-tertiary border-trading-border">
                          <SelectItem value="buy" className="text-trading-success">
                            <div className="flex items-center space-x-2">
                              <TrendingUp className="w-4 h-4" />
                              <span>BUY (Long)</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="sell" className="text-trading-danger">
                            <div className="flex items-center space-x-2">
                              <TrendingDown className="w-4 h-4" />
                              <span>SELL (Short)</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="buy_limit">BUY LIMIT</SelectItem>
                          <SelectItem value="sell_limit">SELL LIMIT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Entry Price */}
                    <div>
                      <Label className="text-trading-text-primary">Entry Price</Label>
                      <Input
                        type="number"
                        step="0.00001"
                        placeholder="0.00000"
                        value={formData.entryPrice}
                        onChange={(e) => setFormData({...formData, entryPrice: e.target.value})}
                        className="bg-trading-bg-tertiary border-trading-border text-trading-text-primary font-mono"
                      />
                    </div>

                    {/* Stop Loss */}
                    <div>
                      <Label className="text-trading-text-primary">Stop Loss</Label>
                      <Input
                        type="number"
                        step="0.00001"
                        placeholder="0.00000"
                        value={formData.stopLoss}
                        onChange={(e) => setFormData({...formData, stopLoss: e.target.value})}
                        className="bg-trading-bg-tertiary border-trading-border text-trading-text-primary font-mono"
                      />
                    </div>

                    {/* Volume */}
                    <div>
                      <Label className="text-trading-text-primary">Volume (Lots)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.10"
                        value={formData.volume}
                        onChange={(e) => setFormData({...formData, volume: e.target.value})}
                        className="bg-trading-bg-tertiary border-trading-border text-trading-text-primary font-mono"
                      />
                    </div>
                  </div>

                  {/* Risk Display */}
                  {formData.entryPrice && formData.stopLoss && (
                    <div className="bg-trading-bg-tertiary rounded-lg p-4 border border-trading-border">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="w-4 h-4 text-trading-warning" />
                          <span className="text-trading-text-primary">Risk: {calculateRisk()}%</span>
                        </div>
                        <div className="text-trading-text-muted">|</div>
                        <div className="text-trading-text-primary">
                          Distance: {Math.abs(parseFloat(formData.entryPrice) - parseFloat(formData.stopLoss)).toFixed(5)} pips
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Step 3: Risk Management */}
              {currentStep === 2 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <h3 className="text-xl font-bold text-trading-text-primary mb-4">
                    Take Profit Levels
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div key={level}>
                        <Label className="text-trading-text-primary">TP{level} (Optional)</Label>
                        <Input
                          type="number"
                          step="0.00001"
                          placeholder="0.00000"
                          value={formData[`tp${level}` as keyof typeof formData]}
                          onChange={(e) => setFormData({...formData, [`tp${level}`]: e.target.value})}
                          className="bg-trading-bg-tertiary border-trading-border text-trading-text-primary font-mono"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Risk/Reward Display */}
                  {formData.entryPrice && formData.stopLoss && formData.tp1 && (
                    <div className="bg-trading-success-bg rounded-lg p-4 border border-trading-success/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Target className="w-5 h-5 text-trading-success" />
                          <span className="font-bold text-trading-success">Risk/Reward Ratio</span>
                        </div>
                        <div className="text-2xl font-bold text-trading-success">
                          1:{calculateRiskReward()}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Risk Level */}
                  <div>
                    <Label className="text-trading-text-primary">Risk Level</Label>
                    <Select value={formData.riskLevel} onValueChange={(value) => setFormData({...formData, riskLevel: value})}>
                      <SelectTrigger className="bg-trading-bg-tertiary border-trading-border text-trading-text-primary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-trading-bg-tertiary border-trading-border">
                        <SelectItem value="low" className="text-trading-success">Low Risk</SelectItem>
                        <SelectItem value="medium" className="text-trading-warning">Medium Risk</SelectItem>
                        <SelectItem value="high" className="text-trading-danger">High Risk</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Analysis & Notes */}
              {currentStep === 3 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <h3 className="text-xl font-bold text-trading-text-primary mb-4">
                    Analysis & Market Notes
                  </h3>

                  <div>
                    <Label className="text-trading-text-primary">Confidence Level (%)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      placeholder="75"
                      value={formData.confidence}
                      onChange={(e) => setFormData({...formData, confidence: e.target.value})}
                      className="bg-trading-bg-tertiary border-trading-border text-trading-text-primary"
                    />
                  </div>

                  <div>
                    <Label className="text-trading-text-primary">Market Analysis & Notes</Label>
                    <Textarea
                      rows={6}
                      placeholder="Provide your technical analysis, market context, key levels, news events, or any other relevant information for this signal..."
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      className="bg-trading-bg-tertiary border-trading-border text-trading-text-primary resize-none"
                    />
                  </div>

                  {/* Quick Analysis Templates */}
                  <div>
                    <Label className="text-trading-text-primary mb-2 block">Quick Templates</Label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "Strong support/resistance level",
                        "Breakout strategy",
                        "Trend continuation",
                        "Reversal pattern",
                        "News-based trade"
                      ].map((template) => (
                        <Button
                          key={template}
                          variant="outline"
                          size="sm"
                          onClick={() => setFormData({...formData, notes: formData.notes + (formData.notes ? '\n\n' : '') + template + ': '})}
                          className="border-trading-border text-trading-text-secondary hover:border-trading-success/50"
                        >
                          {template}
                        </Button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 5: Review & Publish */}
              {currentStep === 4 && (
                <motion.div
                  key="step5"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <h3 className="text-xl font-bold text-trading-text-primary mb-4">
                    Review Your Signal
                  </h3>

                  <div className="bg-trading-bg-tertiary rounded-lg p-6 border border-trading-border">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-bold text-trading-text-primary mb-3">Trade Details</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-trading-text-muted">Asset:</span>
                            <span className="text-trading-text-primary font-mono">{formData.assetName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-trading-text-muted">Direction:</span>
                            <Badge className={formData.tradeType.includes('buy') ? 'bg-trading-success-bg text-trading-success' : 'bg-trading-danger-bg text-trading-danger'}>
                              {formData.tradeType.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-trading-text-muted">Entry:</span>
                            <span className="text-trading-text-primary font-mono">{formData.entryPrice}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-trading-text-muted">Stop Loss:</span>
                            <span className="text-trading-danger font-mono">{formData.stopLoss}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold text-trading-text-primary mb-3">Risk Management</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-trading-text-muted">Risk:</span>
                            <span className="text-trading-warning">{calculateRisk()}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-trading-text-muted">R:R Ratio:</span>
                            <span className="text-trading-success">1:{calculateRiskReward()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-trading-text-muted">Confidence:</span>
                            <span className="text-trading-text-primary">{formData.confidence}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-trading-text-muted">Volume:</span>
                            <span className="text-trading-text-primary">{formData.volume} lots</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Take Profit Levels */}
                    {(formData.tp1 || formData.tp2 || formData.tp3) && (
                      <div className="mt-6">
                        <h4 className="font-bold text-trading-text-primary mb-3">Take Profit Levels</h4>
                        <div className="flex flex-wrap gap-2">
                          {[formData.tp1, formData.tp2, formData.tp3, formData.tp4, formData.tp5].filter(Boolean).map((tp, index) => (
                            <Badge key={index} className="bg-trading-success-bg text-trading-success">
                              TP{index + 1}: {tp}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {formData.notes && (
                      <div className="mt-6">
                        <h4 className="font-bold text-trading-text-primary mb-3">Analysis</h4>
                        <p className="text-trading-text-secondary text-sm leading-relaxed">
                          {formData.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-trading-border/50">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0}
                className="border-trading-border text-trading-text-secondary hover:border-trading-success/50"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>

              {currentStep < steps.length - 1 ? (
                <Button
                  onClick={nextStep}
                  disabled={!formData.assetName || (currentStep === 1 && (!formData.entryPrice || !formData.stopLoss))}
                  className="bg-trading-success hover:bg-trading-success/90 text-white"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  className="bg-trading-success hover:bg-trading-success/90 text-white"
                >
                  <Zap className="w-4 h-4 mr-1" />
                  Publish Signal
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
