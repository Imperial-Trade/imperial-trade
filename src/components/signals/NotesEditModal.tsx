import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { NotesSyncIndicator } from './NotesSyncIndicator';
import { tradingApiService } from '@/api/services/TradingApiService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface NotesEditModalProps {
  alert: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
}

export const NotesEditModal: React.FC<NotesEditModalProps> = ({
  alert,
  isOpen,
  onClose,
  onSave
}) => {
  const [notesDraft, setNotesDraft] = useState(alert?.notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSyncStatus, setNotesSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const { toast } = useToast();

  // Reset draft when alert changes or modal opens
  useEffect(() => {
    if (isOpen && alert) {
      setNotesDraft(alert.notes || '');
      setNotesSyncStatus('idle');
    }
  }, [isOpen, alert?.id, alert?.notes]);

  const handleSave = async () => {
    if (!alert) return;

    try {
      setIsSavingNotes(true);
      setNotesSyncStatus('saving');
      
      const originalNotes = alert.notes || '';
      const newNotes = notesDraft.trim();
      
      // Detect meaningful changes
      const lengthDiff = Math.abs(newNotes.length - originalNotes.length);
      const isMeaningfulChange = lengthDiff >= 10 || (newNotes.length > 20 && newNotes !== originalNotes);
      
      console.log(`📝 Saving notes for alert ${alert.id}:`, notesDraft);
      
      // ============================================
      // PHASE 5: OPTIMISTIC LOCKING
      // ============================================
      // Include expected version to prevent race conditions
      const result = await tradingApiService.updateAlert(
        alert.id,
        { 
          notes: notesDraft,
          expectedVersion: alert.updatedAt // Pass current version
        },
        alert.user_id
      );

      if (!result.success) throw new Error(result.error || 'Failed to save notes');

      console.log(`✅ Notes saved successfully for alert ${alert.id}`);
      setNotesSyncStatus('saved');
      
      // Trigger notifications for meaningful notes updates
      if (isMeaningfulChange && alert.status === 'active') {
        console.log(`🔔 Triggering notifications for meaningful notes update on signal ${alert.id}`);
        
        try {
          const { error: notifyError } = await supabase.functions.invoke('enhanced-signal-notification-dispatcher', {
            body: {
              notifications: [{
                signal_id: alert.id,
                user_id: alert.user_id,
                asset_name: alert.asset_name,
                trade_type: alert.trade_type,
                entry_price: alert.entry_price,
                stop_loss: alert.stop_loss,
                tp1: alert.tp1,
                tp2: alert.tp2,
                tp3: alert.tp3,
                tp4: alert.tp4,
                tp5: alert.tp5,
                symbol: alert.tradermade_symbol,
                tradermade_symbol: alert.tradermade_symbol,
                created_at: alert.created_at,
                updated_at: new Date().toISOString(),
                notification_type: 'notes_updated',
                alert_type: 'notes_updated',
                status: alert.status,
                notes: newNotes,
                change_types: ['notes_updated'],
                priority_level: 1,
                delivery_channels: ['push', 'in_app'],
                include_creator: false
              }]
            }
          });

          if (notifyError) {
            console.error('⚠️ Failed to send notes update notification:', notifyError);
          } else {
            console.log('✅ Notes update notification sent successfully');
          }
        } catch (notifyErr) {
          console.error('⚠️ Notes notification dispatch error:', notifyErr);
        }
      }
      
      // Clear success status after 2 seconds
      setTimeout(() => setNotesSyncStatus('idle'), 2000);
      
      toast({ 
        title: 'Notes updated', 
        description: isMeaningfulChange ? 'Users have been notified of the new notes.' : 'Everyone can now see the new notes.' 
      });

      // Refresh data and close modal
      await onSave();
      onClose();
    } catch (e: any) {
      console.error(`❌ Failed to save notes for alert ${alert.id}:`, e);
      setNotesSyncStatus('error');
      
      // Clear error status after 3 seconds
      setTimeout(() => setNotesSyncStatus('idle'), 3000);
      
      toast({ 
        variant: 'destructive', 
        title: 'Failed to update notes', 
        description: e?.message || 'Please try again.' 
      });
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleCancel = () => {
    setNotesDraft(alert?.notes || '');
    setNotesSyncStatus('idle');
    onClose();
  };

  if (!alert) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Edit Notes - {alert.asset_name}</span>
            <NotesSyncIndicator status={notesSyncStatus} />
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Textarea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            placeholder="Add notes about this signal..."
            className="min-h-[200px] resize-none"
            disabled={isSavingNotes}
          />
          
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isSavingNotes}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSavingNotes}
            >
              {isSavingNotes ? 'Saving...' : 'Save Notes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
