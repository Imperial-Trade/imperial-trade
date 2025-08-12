
import React, { memo, useCallback, useEffect, useState } from "react";
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
import { Plus, Zap, CalendarIcon } from "lucide-react";
import { useTradeForm, TradeFormData } from "@/hooks/useTradeForm";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { compressImage, validateImageFile } from "@/utils/imageCompression";
import { UploadFile } from "@/api/integrations";
import { toast } from "sonner";

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
      return new Date(`${selectedDate}T00:00:00`);
    }
    return new Date();
  });

  // Screenshot state
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | undefined>(undefined);
  const [isUploading, setIsUploading] = useState(false);

  // Sync selected date when modal opens or prop changes
  useEffect(() => {
    if (isOpen) {
      if (selectedDate) {
        setTradeDate(new Date(`${selectedDate}T00:00:00`));
      } else {
        setTradeDate(new Date());
      }
    }
  }, [selectedDate, isOpen]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      setIsUploading(true);
      toast.info("Compressing image...");
      const compressed = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.8,
        maxFileSize: 2 * 1024 * 1024,
      });

      setScreenshotFile(compressed);
      const previewUrl = URL.createObjectURL(compressed);
      setScreenshotPreview(previewUrl);

      toast.info("Uploading screenshot...");
      const { file_url } = await UploadFile({ file: compressed });
      setUploadedUrl(file_url);
      toast.success("Screenshot uploaded");
    } catch (error) {
      console.error("Screenshot upload failed:", error);
      toast.error("Failed to upload screenshot");
      setScreenshotFile(null);
      setScreenshotPreview(null);
      setUploadedUrl(undefined);
    } finally {
      setIsUploading(false);
    }
  }, []);

  const removeScreenshot = useCallback(() => {
    setScreenshotFile(null);
    if (screenshotPreview) {
      URL.revokeObjectURL(screenshotPreview);
    }
    setScreenshotPreview(null);
    setUploadedUrl(undefined);
  }, [screenshotPreview]);

  const handleSave = useCallback(async (formData: TradeFormData) => {
    const d = tradeDate ?? new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateToUse = `${yyyy}-${mm}-${dd}`;
    await onSave({
      ...formData,
      screenshot_url: uploadedUrl,
      date: dateToUse,
    });
    onClose();
  }, [onSave, onClose, tradeDate, uploadedUrl]);

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
    handleSubmit,
    resetForm,
  } = useTradeForm(handleSave);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handlePnLChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    updatePnL(value === '' ? '' : parseFloat(value));
  }, [updatePnL]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Log New Trade
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="asset">Asset</Label>
              <Input
                id="asset"
                placeholder="e.g., EURUSD"
                value={formData.asset}
                onChange={(e) => updateAsset(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="pnl">P&L ($)</Label>
              <Input
                id="pnl"
                type="number"
                step="0.01"
                placeholder="150.00"
                value={formData.pnl}
                onChange={handlePnLChange}
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

          <div className="grid grid-cols-2 gap-4">
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="strategy">Strategy</Label>
                <Select onValueChange={updateStrategy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select strategy" />
                  </SelectTrigger>
                  <SelectContent>
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
                  <SelectContent>
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

          <div className="space-y-3">
            <div>
              <Label htmlFor="screenshot">Add Picture (optional)</Label>
              <div className="mt-2 flex items-center gap-3">
                <Input
                  id="screenshot"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
              </div>
              {screenshotPreview && (
                <div className="mt-3 rounded-md overflow-hidden">
                  <img
                    src={screenshotPreview}
                    alt="Trade screenshot preview"
                    className="w-full h-40 object-cover"
                  />
                  <div className="mt-2">
                    <Button variant="outline" size="sm" onClick={removeScreenshot}>
                      Remove
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!isValid || isSubmitting || isUploading}
              >
                <Zap className="h-4 w-4 mr-2" />
                {isSubmitting ? "Saving..." : isUploading ? "Uploading..." : "Save Trade"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

AddTradeModal.displayName = "AddTradeModal";

export default AddTradeModal;
