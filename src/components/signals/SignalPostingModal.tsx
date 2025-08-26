
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import OptimizedNewAlertForm from './OptimizedNewAlertForm';

interface SignalPostingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (signalData: any) => Promise<void>;
}

export const SignalPostingModal: React.FC<SignalPostingModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Post New Signal</DialogTitle>
        </DialogHeader>
        <OptimizedNewAlertForm
          onSubmit={onSubmit}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
};
