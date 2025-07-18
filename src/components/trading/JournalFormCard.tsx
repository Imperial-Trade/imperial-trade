
import React, { memo, useCallback, useRef, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Camera, Search } from "lucide-react";
import { useAssetSearch, FOREX_PAIRS, COMMODITIES, INDICES } from '@/hooks/useAssetSearch';
import { useJournalForm } from '@/hooks/useJournalForm';

interface JournalFormCardProps {
  onSubmit: (data: { asset_ticker: string; pnl: string; notes: string; screenshotFile?: File }) => Promise<void>;
  isSubmitting: boolean;
}

const JournalFormCard = memo(({ onSubmit, isSubmitting }: JournalFormCardProps) => {
  const { formState, handleInputChange, setAsset, resetForm } = useJournalForm();
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);
  const dropdownTimeoutRef = useRef<NodeJS.Timeout>();

  const { suggestions } = useAssetSearch({ 
    query: formState.asset_ticker,
    delay: 300 
  });

  const handleAssetSelect = useCallback((asset: string) => {
    setAsset(asset);
    setShowAssetDropdown(false);
  }, [setAsset]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setScreenshotFile(e.target.files[0]);
    }
  }, []);

  const handleFormSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.asset_ticker || !formState.pnl) {
      alert("Please fill in Asset and P&L.");
      return;
    }

    await onSubmit({
      ...formState,
      screenshotFile: screenshotFile || undefined,
    });

    resetForm();
    setScreenshotFile(null);
  }, [formState, screenshotFile, onSubmit, resetForm]);

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

  const getAssetBadge = useCallback((asset: string) => {
    if (FOREX_PAIRS.includes(asset)) return { label: "FX", variant: "outline" as const };
    if (COMMODITIES.includes(asset)) return { label: "Gold", variant: "outline" as const };
    if (INDICES.includes(asset)) return { label: "Index", variant: "outline" as const };
    if (asset.includes("/USDT")) return { label: "Crypto", variant: "outline" as const };
    return null;
  }, []);

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-6">
        <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" />
          Add New Trade
        </h3>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <div className="relative">
                <Input
                  name="asset_ticker"
                  placeholder="Asset / Ticker (e.g., EURUSD, AAPL)"
                  value={formState.asset_ticker}
                  onChange={handleInputChange}
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
                        {!formState.asset_ticker && (
                          <div className="px-3 py-2 text-xs text-muted-foreground font-medium border-b border-border/30 mb-1">
                            Recent Assets
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
                    ) : formState.asset_ticker ? (
                      <div className="p-3 text-sm text-muted-foreground text-center">
                        No matches found
                      </div>
                    ) : (
                      <div className="p-3 text-sm text-muted-foreground text-center">
                        Start typing to see suggestions
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <Input
              name="pnl"
              type="number"
              placeholder="P&L (e.g., 150.50 or -75.25)"
              value={formState.pnl}
              onChange={handleInputChange}
              className="bg-background"
              required
            />
          </div>

          <Textarea
            name="notes"
            placeholder="Your insights: Why did you take this trade? What did you learn?"
            value={formState.notes}
            onChange={handleInputChange}
            className="bg-background h-24"
          />

          <div className="flex items-center gap-4">
            <label htmlFor="screenshot-upload" className="cursor-pointer flex-1">
              <div className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:bg-muted/30 transition">
                <Camera className="w-5 h-5" />
                <span>
                  {screenshotFile ? screenshotFile.name : "Upload Screenshot"}
                </span>
              </div>
              <input
                id="screenshot-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-accent-green to-primary hover:from-accent-green/90 hover:to-primary/90 text-white"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Save Trade
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
});

JournalFormCard.displayName = 'JournalFormCard';

export default JournalFormCard;
