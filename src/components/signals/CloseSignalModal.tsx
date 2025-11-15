import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface CloseSignalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (closingReason: string) => Promise<void>;
  signalAssetName: string;
  isPending: boolean; // true for pending limit orders, false for active signals
}

export const CloseSignalModal: React.FC<CloseSignalModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  signalAssetName,
  isPending,
}) => {
  const [closingReason, setClosingReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!closingReason.trim()) {
      return; // Don't submit if empty
    }

    setIsSubmitting(true);
    try {
      await onConfirm(closingReason.trim());
      // Reset and close on success
      setClosingReason('');
      onClose();
    } catch (error) {
      console.error('Failed to close signal:', error);
      // Keep modal open on error so user can retry
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (closingReason.trim()) {
        handleSubmit();
      }
    }
  };

  const handleCancel = () => {
    setClosingReason('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isPending ? 'Cancel Order' : 'Close My Signal'}
          </DialogTitle>
          <DialogDescription>
            {isPending 
              ? `You are about to cancel the pending ${signalAssetName} order.` 
              : `You are about to close the ${signalAssetName} signal.`}
            {' '}Please provide a reason for {isPending ? 'cancellation' : 'closing'}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="closing-reason" className="text-sm font-medium">
              Closing Reason
            </label>
            <Textarea
              id="closing-reason"
              placeholder={isPending 
                ? "e.g., Market conditions changed, better entry point found..." 
                : "e.g., Taking profits early, re-evaluating market conditions..."}
              value={closingReason}
              onChange={(e) => setClosingReason(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[100px] resize-none"
              autoFocus
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Press Enter to submit or Shift+Enter for new line
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!closingReason.trim() || isSubmitting}
            className="min-w-[120px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isPending ? 'Cancelling...' : 'Closing...'}
              </>
            ) : (
              isPending ? 'Cancel Order' : 'Close Alert'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

