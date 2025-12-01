
import React, { memo, useCallback, useState } from "react";
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
import { useImageUpload } from "@/hooks/useImageUpload";
import { ImageUpload } from "@/components/ui/image-upload";

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
  onSave: (data: TradeFormData & { date: string; screenshotFiles?: File[] }) => Promise<void>;
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

  const {
    imageFiles,
    isUploading,
    uploadErrors,
    addFiles,
    removeFile,
    clearFiles
  } = useImageUpload();

  const [saveButtonText, setSaveButtonText] = useState("Save Trade");

  const handleSave = useCallback(async (formData: TradeFormData) => {
    console.log('🔄 AddTradeModal: Starting save process');
    setSaveButtonText("Saving...");

    try {
      const dateToUse = tradeDate ? tradeDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const screenshotFiles = imageFiles.map(img => img.file);
      
      const tradeData = {
        ...formData,
        date: dateToUse,
        screenshotFiles
      };

      // Log all available selections from strategy, emotion, and trading session
      console.log('📋 AddTradeModal: All Available Selections:');
      console.log('📊 Strategies:', TRADING_STRATEGIES);
      console.log('😊 Emotions:', EMOTIONS);
      console.log('🕐 Trading Sessions:', SESSIONS);
      console.log('✅ Selected Strategy:', formData.strategy || 'None selected');
      console.log('✅ Selected Emotion:', formData.emotion || 'None selected');
      console.log('✅ Selected Trading Session:', formData.session || 'None selected');

      console.log('📤 AddTradeModal: Calling onSave with data:', tradeData);
      await onSave(tradeData);
      console.log('✅ AddTradeModal: Save completed successfully');
      
      // Only close modal on successful save
      handleClose();
    } catch (error) {
      console.error('❌ AddTradeModal: Save failed:', error);
      setSaveButtonText("Save Trade");
      // Don't close modal on error, let user retry
      throw error; // Re-throw to let calling component handle the error
    }
  }, [onSave, tradeDate, imageFiles]);

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
    console.log('🚪 AddTradeModal: Closing modal');
    resetForm();
    clearFiles();
    setSaveButtonText("Save Trade");
    onClose();
  }, [resetForm, clearFiles, onClose]);

  const handlePnLChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    updatePnL(value === '' ? '' : parseFloat(value));
  }, [updatePnL]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[calc(100vh-48px)] md:max-h-[85vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Log New Trade
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-2 space-y-4">
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

          <div>
            <Label htmlFor="charts" className="text-sm font-medium mb-2 block">
              Upload Charts
            </Label>
            <ImageUpload
              images={imageFiles}
              onAddFiles={addFiles}
              onRemoveFile={removeFile}
              maxFiles={3}
              disabled={isSubmitting || isUploading}
              errors={uploadErrors}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting || isUploading}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isValid || isSubmitting || isUploading}
            >
              <Zap className="h-4 w-4 mr-2" />
              {isSubmitting || isUploading ? "Saving..." : saveButtonText}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

AddTradeModal.displayName = "AddTradeModal";

export default AddTradeModal;
