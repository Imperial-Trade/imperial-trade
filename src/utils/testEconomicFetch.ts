import { supabase } from '@/integrations/supabase/client';

export async function triggerEconomicEventsFetch() {
  try {
    console.log('Triggering economic events fetch...');
    
    const { data, error } = await supabase.functions.invoke('fetch-economic-events', {
      body: {}
    });
    
    if (error) {
      console.error('Error invoking fetch-economic-events:', error);
      throw error;
    }
    
    console.log('Economic events fetch result:', data);
    return data;
  } catch (error) {
    console.error('Failed to trigger economic events fetch:', error);
    throw error;
  }
}