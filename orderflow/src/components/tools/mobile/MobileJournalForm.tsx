import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Upload, DollarSign, FileImage, X, Search, Camera, CheckCircle, ArrowLeft } from 'lucide-react';
import { useAssetSearch } from '@/hooks/useAssetSearch';

interface MobileJournalFormProps {
  onSubmit: (data: {
    asset_ticker: string;
    pnl: string;
    notes: string;
    screenshotFile?: File;
  }) => void;
  isSubmitting: boolean;
  onBack: () => void;
}

export default function MobileJournalForm({ onSubmit, isSubmitting, onBack }: MobileJournalFormProps) {
  const [formData, setFormData] = useState({
    asset_ticker: '',
    pnl: '',
    notes: ''
  });
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string>('');
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  const dropdownTimeoutRef = useRef<NodeJS.Timeout>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Use asset search hook
  const { suggestions, saveRecentAsset } = useAssetSearch({ 
    query: formData.asset_ticker,
    delay: 300 
  });

  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleAssetSelect = useCallback((asset: string) => {
    handleInputChange('asset_ticker', asset);
    saveRecentAsset(asset);
    setShowAssetDropdown(false);
  }, [handleInputChange, saveRecentAsset]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshotFile(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setScreenshotPreview(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const removeScreenshot = useCallback(() => {
    setScreenshotFile(null);
    setScreenshotPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    onSubmit({
      ...formData,
      screenshotFile: screenshotFile || undefined
    });

    // Reset form
    setFormData({
      asset_ticker: '',
      pnl: '',
      notes: ''
    });
    setScreenshotFile(null);
    setScreenshotPreview('');
    setCurrentStep(1);
  }, [formData, screenshotFile, onSubmit]);

  const isStepValid = (step: number) => {
    switch (step) {
      case 1: return formData.asset_ticker.length > 0;
      case 2: return formData.pnl.length > 0;
      case 3: return formData.notes.length > 0;
      default: return false;
    }
  };

  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

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

  const StepIndicator = () => (
    <div className="flex items-center justify-center mb-6 space-x-2">
      {[1, 2, 3, 4].map((step) => (
        <div
          key={step}
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
            step === currentStep
              ? 'bg-primary text-primary-foreground'
              : step < currentStep
              ? 'bg-emerald-500 text-white'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {step < currentStep ? <CheckCircle className="w-4 h-4" /> : step}
        </div>
      ))}
    </div>
  );

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="w-5 h-5 text-primary" />
            Add Trading Entry
          </CardTitle>
          <div></div> {/* Spacer for centering */}
        </div>
        <StepIndicator />
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Asset Selection */}
          {currentStep === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="asset" className="text-base font-medium">Select Asset</Label>
                <p className="text-sm text-muted-foreground mb-3">Choose the trading instrument</p>
                
                <div className="relative">
                  <Input
                    id="asset"
                    placeholder="e.g., EURUSD, XAUUSD, BTCUSD"
                    value={formData.asset_ticker}
                    onChange={(e) => handleInputChange('asset_ticker', e.target.value)}
                    onFocus={() => setShowAssetDropdown(true)}
                    onBlur={() => {
                      setTimeout(() => setShowAssetDropdown(false), 200);
                    }}
                    className="bg-background text-lg h-12 pr-10"
                    autoComplete="off"
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />

                  {showAssetDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                      {suggestions && suggestions.length > 0 ? (
                        <div className="p-1">
                          {suggestions.map((asset) => {
                            const badge = getAssetBadge(asset);
                            return (
                              <button
                                key={asset}
                                type="button"
                                onClick={() => handleAssetSelect(asset)}
                                className="w-full text-left px-3 py-3 hover:bg-muted/50 rounded-md transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-base">{asset}</span>
                                  {badge && (
                                    <Badge variant={badge.variant} className="text-xs">
                                      {badge.label}
                                    </Badge>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-4 text-sm text-muted-foreground text-center">
                          {formData.asset_ticker ? 'No matches found' : 'Start typing to see suggestions'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <Button
                type="button"
                onClick={nextStep}
                disabled={!isStepValid(1)}
                className="w-full h-12 text-lg"
              >
                Continue
              </Button>
            </motion.div>
          )}

          {/* Step 2: P&L Entry */}
          {currentStep === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="pnl" className="text-base font-medium">Profit & Loss</Label>
                <p className="text-sm text-muted-foreground mb-3">Enter your trade result in USD</p>
                
                <Input
                  id="pnl"
                  type="number"
                  step="0.01"
                  placeholder="e.g., +150.50 or -75.25"
                  value={formData.pnl}
                  onChange={(e) => handleInputChange('pnl', e.target.value)}
                  className="bg-background text-lg h-12 text-center"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  className="flex-1 h-12"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={!isStepValid(2)}
                  className="flex-1 h-12"
                >
                  Continue
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Notes */}
          {currentStep === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="notes" className="text-base font-medium">Trade Notes</Label>
                <p className="text-sm text-muted-foreground mb-3">Describe your trade setup and reasoning</p>
                
                <Textarea
                  id="notes"
                  placeholder="Why did you take this trade? What was your setup? How did you feel?"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  className="min-h-[120px] bg-background text-base resize-none"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  className="flex-1 h-12"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={!isStepValid(3)}
                  className="flex-1 h-12"
                >
                  Continue
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Screenshot & Submit */}
          {currentStep === 4 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div>
                <Label className="text-base font-medium">Screenshot (Optional)</Label>
                <p className="text-sm text-muted-foreground mb-3">Add a chart screenshot of your trade</p>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="mobile-screenshot-upload"
                />
                
                {!screenshotPreview ? (
                  <label
                    htmlFor="mobile-screenshot-upload"
                    className="block border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    <Camera className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <span className="text-sm text-muted-foreground block mb-1">
                      Tap to add screenshot
                    </span>
                    <span className="text-xs text-muted-foreground">
                      PNG, JPG up to 10MB
                    </span>
                  </label>
                ) : (
                  <div className="relative">
                    <img
                      src={screenshotPreview}
                      alt="Trade screenshot"
                      className="w-full max-h-48 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={removeScreenshot}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full shadow-md"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="mt-2 flex items-center justify-center gap-2">
                      <FileImage className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm text-emerald-500 font-medium">Screenshot ready</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  className="flex-1 h-12"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 h-12 bg-primary hover:bg-primary/90"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      Saving...
                    </>
                  ) : (
                    'Save Trade'
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}