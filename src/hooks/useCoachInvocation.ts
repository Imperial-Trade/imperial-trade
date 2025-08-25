
import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Track in-flight coach requests to prevent duplicates
const inFlightRequests = new Set<string>();

export const useCoachInvocation = (): { invokeCoach: (journalEntryId: string) => Promise<string | undefined> } => {
  const invokeCoach = useCallback(async (journalEntryId: string): Promise<string | undefined> => {
    // Prevent duplicate invocations for the same entry
    if (inFlightRequests.has(journalEntryId)) {
      console.log('Coach invocation already in progress for entry:', journalEntryId);
      return undefined;
    }

    // Add to in-flight tracking
    inFlightRequests.add(journalEntryId);

    try {
      console.log('Invoking journal-coach for entry:', journalEntryId);

      // Create the journal coach invocation promise with 30s timeout
      const { data: coachResponse, error: coachError } = await Promise.race([
        supabase.functions.invoke('journal-coach', {
          body: {
            journal_entry_id: journalEntryId
          }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Coach invocation timed out after 30 seconds')), 30000)
        )
      ]) as any;

      if (coachError) {
        console.error('Coach invocation error:', coachError);
        toast.error('Coaching analysis failed, but entry was saved');
        return undefined;
      } 
      
      if (coachResponse?.reply) {
        console.log('Coach feedback generated successfully');
        return coachResponse.reply;
      } else {
        console.warn('Coach response missing reply field:', coachResponse);
        return undefined;
      }

    } catch (error) {
      console.error('Coach invocation failed:', error);
      // Don't toast error for timeouts - they're expected sometimes
      if (!error.message?.includes('timed out')) {
        toast.error('Coaching analysis failed, but entry was saved');
      }
      return undefined;
    } finally {
      // Always cleanup
      inFlightRequests.delete(journalEntryId);
    }
  }, []);

  return { invokeCoach };
};
