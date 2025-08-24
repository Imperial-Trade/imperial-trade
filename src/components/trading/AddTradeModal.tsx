
import React, { memo, useCallback, useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, Zap, CalendarIcon, Upload, X, Image } from "lucide-react";
import { useTradeForm, TradeFormData } from "@/hooks/useTradeForm";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { validateImageFile, compressImage } from "@/utils/imageCompression";
import { UploadFile } from "@/api/integrations";

// Static data to prevent re-creation on every render
const TRADING_STRATEGIES = [
  "Breakout",
  "Reversal",
  "Continuation",
  "Trend Following",
  "Support/Resistance",
  "Fibonacci",
  "Moving Average",
  "RSI Divergence",
  "News Trading",
  "Scalping",
  "Swing Trading",
  "Day Trading",
  "Custom Strategy",
];

const EMOTIONS = [
  "Confident",
  "Anxious",
  "Greedy",
  "Fearful",
  "Neutral",
  "Excited",
  "Frustrated",
  "Disciplined",
  "Impulsive",
  "Focused",
];

const SESSIONS = [
  { value: "sydney", label: "Sydney (9PM-6AM GMT)" },
  { value: "tokyo", label: "Tokyo (11PM-8AM GMT)" },
  { value: "london", label: "London (7AM-4PM GMT)" },
  { value: "newyork", label: "New York (12PM-9PM GMT)" },
] as const;

interface AddTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TradeFormData & { date: string }) => Promise<void>;
  selectedDate?: string;
}

const AddTradeModal = memo<AddTradeModalProps>(({ 
  isOpen, 
  onClose, 
  onSave,
  selectedDate 
}) => {
  const [tradeDate, setTradeDate] = useState<Date | undefined>(() => {
    if (selectedDate) {
      return new Date(selectedDate);
    }
    return new Date();
  });

  // Chart upload state
  const [chartFile, setChartFile] = useState<File | null>(null);
  const [chartPreview, setChartPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");

  const {
    formData,
    isSubmitting,
    isValid,
    updateAsset,
    updatePnL,
    updateDirection,
    updateOutcome,
    updateStrategy,
    updateEmotion,
    updateSession,
    updateNotes,
    updateScreenshotUrl,
    handleSubmit,
    resetForm,
  } = useTradeForm(async (formData: TradeFormData) => {
    let uploadedImageUrl = null;
    
    // Handle image upload first if there's a chart file
    if (chartFile) {
      try {
        setUploading(true);
        setStatusMessage("Compressing image...");
        
        const compressedFile = await compressImage(chartFile, {
          maxWidth: 1600,
          maxHeight: 1200,
          quality: 0.8,
          maxFileSize: 1.5 * 1024 * 1024 // 1.5MB
        });
        
        setStatusMessage("Uploading image...");
        const { file_url } = await UploadFile({ file: compressedFile });
        uploadedImageUrl = file_url;
        updateScreenshotUrl(file_url);
        
        console.log('Image uploaded successfully:', file_url);
      } catch (error) {
        console.error('Upload failed:', error);
        setUploadError('Failed to upload image. Please try again.');
        return;
      } finally {
        setUploading(false);
        setStatusMessage("");
      }
    }

    const dateToUse = tradeDate ? tradeDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    const dataToSave = {
      ...formData,
      date: dateToUse,
      ...(uploadedImageUrl && { screenshot_url: uploadedImageUrl })
    };
    
    console.log('Saving trade data:', dataToSave);
    await onSave(dataToSave);
    onClose();
  });

  const handleClose = useCallback(() => {
    resetForm();
    // Clean up upload state
    if (chartPreview) {
      URL.revokeObjectURL(chartPreview);
    }
    setChartFile(null);
    setChartPreview(null);
    setUploadError(null);
    setUploading(false);
    setStatusMessage("");
    onClose();
  }, [resetForm, onClose, chartPreview]);

  const handlePnLChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    updatePnL(value === '' ? '' : parseFloat(value));
  }, [updatePnL]);

  // Chart upload handlers
  const handleFileSelect = useCallback((file: File) => {
    const validationError = validateImageFile(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    setUploadError(null);
    setChartFile(file);
    
    // Create preview
    const previewUrl = URL.createObjectURL(file);
    if (chartPreview) {
      URL.revokeObjectURL(chartPreview);
    }
    setChartPreview(previewUrl);
  }, [chartPreview]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleRemoveChart = useCallback(() => {
    if (chartPreview) {
      URL.revokeObjectURL(chartPreview);
    }
    setChartFile(null);
    setChartPreview(null);
    setUploadError(null);
    setUploading(false);
    setStatusMessage("");
  }, [chartPreview]);

  useEffect(() => {
    if (!isOpen) {
      if (chartPreview) {
        URL.revokeObjectURL(chartPreview);
      }
      setChartFile(null);
      setChartPreview(null);
      setUploadError(null);
      setUploading(false);
      setStatusMessage("");
      resetForm();
    }
  }, [isOpen, chartPreview, resetForm]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="
          w-[92vw]
          max-w-[560px]
          sm:max-w-[560px]
          md:max-w-[560px]
          lg:max-w-[560px]
          max-h-[85dvh] overflow-y-auto
          px-6 py-6
        "
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Log New Trade
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <Label htmlFor="asset">Asset</Label>
              <Input
                id="asset"
                placeholder="e.g., EURUSD"
                value={formData.asset}
                onChange={(e) => updateAsset(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="min-w-0">
              <Label htmlFor="pnl">P&L ($)</Label>
              <Input
                id="pnl"
                type="number"
                step="0.01"
                placeholder="150.00"
                value={formData.pnl}
                onChange={handlePnLChange}
                className="w-full"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="tradeDate">Trade Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !tradeDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {tradeDate ? format(tradeDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={tradeDate}
                  onSelect={setTradeDate}
                  disabled={(date) => {
                    // Disable future dates - use precise current time
                    const now = new Date();
                    const endOfDay = new Date(date);
                    endOfDay.setHours(23, 59, 59, 999);
                    return endOfDay > now;
                  }}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Direction</Label>
              <div className="flex gap-2 mt-1">
                <Button
                  type="button"
                  variant={formData.direction === "long" ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateDirection("long")}
                >
                  Long
                </Button>
                <Button
                  type="button"
                  variant={formData.direction === "short" ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateDirection("short")}
                >
                  Short
                </Button>
              </div>
            </div>
            <div>
              <Label>Outcome</Label>
              <div className="flex gap-2 mt-1">
                <Button
                  type="button"
                  variant={formData.outcome === "win" ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateOutcome("win")}
                >
                  Win
                </Button>
                <Button
                  type="button"
                  variant={formData.outcome === "loss" ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => updateOutcome("loss")}
                >
                  Loss
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm">AI Coach Data Points</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="strategy">Strategy</Label>
                <Select onValueChange={updateStrategy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select strategy" />
                  </SelectTrigger>
                  <SelectContent 
                    side="bottom" 
                    avoidCollisions={false} 
                    position="popper" 
                    sideOffset={4}
                    className="max-h-60 overflow-y-auto"
                  >
                    {TRADING_STRATEGIES.map((strategy) => (
                      <SelectItem key={strategy} value={strategy}>
                        {strategy}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="emotion">Emotion</Label>
                <Select onValueChange={updateEmotion}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select emotion" />
                  </SelectTrigger>
                  <SelectContent 
                    side="bottom" 
                    avoidCollisions={false} 
                    position="popper" 
                    sideOffset={4}
                    className="max-h-60 overflow-y-auto"
                  >
                    {EMOTIONS.map((emotion) => (
                      <SelectItem key={emotion} value={emotion}>
                        {emotion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="session">Trading Session</Label>
              <Select onValueChange={updateSession}>
                <SelectTrigger>
                  <SelectValue placeholder="Select session" />
                </SelectTrigger>
                <SelectContent>
                  {SESSIONS.map((session) => (
                    <SelectItem key={session.value} value={session.value}>
                      {session.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="What happened? What did you learn?"
              value={formData.notes}
              onChange={(e) => updateNotes(e.target.value)}
            />
          </div>

          {/* Upload your chart section */}
          <div>
            <Label>Upload your chart</Label>
            <div className="mt-2">
              {!chartFile ? (
                <div
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/40 transition-colors cursor-pointer"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('chart-upload')?.click()}
                >
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-1">
                    Drag and drop your chart here, or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, WEBP up to 10MB
                  </p>
                  <input
                    id="chart-upload"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {chartPreview && (
                        <img
                          src={chartPreview}
                          alt="Chart preview"
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{chartFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(chartFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveChart}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Error message */}
              {uploadError && (
                <p className="mt-2 text-sm text-destructive" aria-live="polite">
                  {uploadError}
                </p>
              )}
              
              {/* Status message */}
              {statusMessage && (
                <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
                  {statusMessage}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isValid || isSubmitting || uploading || !!uploadError}
            >
              <Zap className="h-4 w-4 mr-2" />
              {uploading ? "Uploading..." : isSubmitting ? "Saving..." : "Save Trade"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

AddTradeModal.displayName = "AddTradeModal";

export default AddTradeModal;
