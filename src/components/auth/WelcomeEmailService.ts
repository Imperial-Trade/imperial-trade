
import { supabase } from '@/integrations/supabase/client';

export const sendWelcomeEmail = async (userEmail: string, userName: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-welcome-email', {
      body: {
        email: userEmail,
        name: userName,
      },
    });

    if (error) {
      console.error('Welcome email error:', error);
      return { success: false, error };
    }

    console.log('Welcome email sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Welcome email error:', error);
    return { success: false, error };
  }
};
