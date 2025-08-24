import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Track in-flight coach requests to prevent duplicates
const inFlightRequests = new Set<string>();

export const useCoachInvocation = () => {
  const timeoutRef = useRef<NodeJS.Timeout>();

  const invokeCoach = useCallback(async (journalEntryId: string) => {
    // Prevent duplicate invocations for the same entry
    if (inFlightRequests.has(journalEntryId)) {
      console.log('Coach invocation already in progress for entry:', journalEntryId);
      return;
    }

    // Add to in-flight tracking
    inFlightRequests.add(journalEntryId);

    try {
      console.log('Invoking coach-agent for entry:', journalEntryId);

      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        timeoutRef.current = setTimeout(() => {
          reject(new Error('Coach invocation timed out after 15 seconds'));
        }, 15000);
      });

      // Create the coach invocation promise
      const coachPromise = supabase.functions.invoke('coach-agent', {
        body: {
          event_type: "LOG_TRADE",
          journal_entry_id: journalEntryId
        }
      });

      // Race the timeout against the coach call
      const { data: coachResponse, error: coachError } = await Promise.race([
        coachPromise,
        timeoutPromise
      ]) as any;

      // Clear the timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (coachError) {
        console.error('Coach invocation error:', coachError);
        toast.error('Coaching analysis failed, but entry was saved');
      } else if (coachResponse?.reply) {
        console.log('Coach feedback generated successfully');
        toast.success('AI coaching feedback generated!');
      } else {
        console.warn('Coach response missing reply field:', coachResponse);
      }

    } catch (error) {
      console.error('Coach invocation failed:', error);
      // Don't toast error for timeouts - they're expected sometimes
      if (!error.message?.includes('timed out')) {
        toast.error('Coaching analysis failed, but entry was saved');
      }
    } finally {
      // Always cleanup
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      inFlightRequests.delete(journalEntryId);
    }
  }, []);

  return { invokeCoach };
};