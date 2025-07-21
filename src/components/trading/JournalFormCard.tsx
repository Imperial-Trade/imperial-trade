
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Upload, DollarSign, FileImage, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { ComplianceNotice, EducationalBadge } from '@/components/compliance/ComplianceNotice';

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
          <EducationalBadge />
        </div>
      </CardHeader>
      <CardContent>
        <ComplianceNotice type="educational" size="sm" className="mb-6" />
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="asset">Educational Asset</Label>
              <Input
                id="asset"
                placeholder="e.g., EURUSD, XAUUSD (educational example)"
                value={formData.asset_ticker}
                onChange={(e) => handleInputChange('asset_ticker', e.target.value)}
                className="bg-background"
                required
              />
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
