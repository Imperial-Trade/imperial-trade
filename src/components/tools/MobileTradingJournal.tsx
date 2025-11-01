import React from 'react';
import { TradingJournalApp } from '@/components/tools/TradingJournalApp';
interface MobileTradingJournalProps {
  entries: any[];
  isSubmitting: boolean;
  isLoading: boolean;
  onSubmit: (data: any) => void;
  onDelete: (entryId: string) => void;
  userProfile: any;
}
export default function MobileTradingJournal({
  entries,
  isSubmitting,
  isLoading,
  onSubmit,
  onDelete,
  userProfile
}: MobileTradingJournalProps) {
  // Mobile view - Only show Advanced Educational Journal
  return (
    <div className="min-h-screen bg-background">
      <TradingJournalApp />
    </div>
  );
}