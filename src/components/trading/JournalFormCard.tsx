
import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Upload, DollarSign, FileImage, X, Search } from 'lucide-react';
import { useAssetSearch } from '@/hooks/useAssetSearch';
import { motion } from 'framer-motion';


interface JournalFormCardProps {
  onSubmit: (data: {
    asset_ticker: string;
    pnl: string;
    notes: string;
    screenshotFile?: File;
  }) => void;
  isSubmitting: boolean;
}

export default function JournalFormCard({ onSubmit, isSubmitting }: JournalFormCardProps) {
  const [formData, setFormData] = useState({
    asset_ticker: '',
    pnl: '',
    notes: ''
  });
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string>('');
  
  // Asset selection states
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);
  const dropdownTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Use asset search hook
  const { suggestions, saveRecentAsset } = useAssetSearch({ 
    query: formData.asset_ticker,
    delay: 300 
  });

  // Asset selection handlers
  const handleAssetSelect = useCallback((asset: string) => {
    handleInputChange('asset_ticker', asset);
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshotFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setScreenshotPreview(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeScreenshot = () => {
    setScreenshotFile(null);
    setScreenshotPreview('');
  };

  const handleSubmit = (e: React.FormEvent) => {
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
  };

  const isValid = formData.asset_ticker && formData.pnl && formData.notes;

  return (
    <Card className="bg-card border-border shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          Log Educational Entry
        </CardTitle>
        <div className="flex gap-2">
          
        </div>
      </CardHeader>
      <CardContent>
        
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="asset">Educational Asset</Label>
              <div className="relative">
                <Input
                  id="asset"
                  placeholder="e.g., EURUSD, XAUUSD (educational example)"
                  value={formData.asset_ticker}
                  onChange={(e) => handleInputChange('asset_ticker', e.target.value)}
                  onFocus={handleAssetFocus}
                  onBlur={handleAssetBlur}
                  className="bg-background pr-8"
                  required
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />

                {showAssetDropdown && (
                  <div
                    className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-[100] max-h-48 overflow-y-auto"
                    onMouseDown={handleDropdownMouseDown}
                  >
                    {suggestions && suggestions.length > 0 ? (
                      <div className="p-1">
                        {!formData.asset_ticker && (
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
                    ) : formData.asset_ticker ? (
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
            
            <div className="space-y-2">
              <Label htmlFor="pnl">Educational P&L ($)</Label>
              <Input
                id="pnl"
                type="number"
                step="0.01"
                placeholder="e.g., +150.50 or -75.25 (hypothetical)"
                value={formData.pnl}
                onChange={(e) => handleInputChange('pnl', e.target.value)}
                className="bg-background"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Educational Analysis Notes</Label>
            <Textarea
              id="notes"
              placeholder="Why did you analyze this educational setup? What did you learn? What educational concepts were applied? (For learning purposes only)"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              className="min-h-[120px] bg-background"
              required
            />
          </div>

          {/* Educational Screenshot Upload */}
          <div className="space-y-4">
            <Label>Educational Screenshot (Optional)</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="screenshot-upload"
              />
              
              {!screenshotPreview ? (
                <label
                  htmlFor="screenshot-upload"
                  className="cursor-pointer flex flex-col items-center space-y-2"
                >
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Upload educational screenshot (optional)
                  </span>
                  <span className="text-xs text-muted-foreground">
                    PNG, JPG up to 10MB - For educational analysis only
                  </span>
                </label>
              ) : (
                <div className="relative">
                  <img
                    src={screenshotPreview}
                    alt="Educational screenshot preview"
                    className="max-w-full max-h-48 mx-auto rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={removeScreenshot}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <FileImage className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-green-400">Educational screenshot ready</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                  Saving Educational Entry...
                </>
              ) : (
                'Save Educational Entry'
              )}
            </Button>
          </motion.div>
        </form>
      </CardContent>
    </Card>
  );
}
