
// Real implementations using Supabase Edge Functions
import { supabase } from '@/integrations/supabase/client';

export const UploadFile = async ({ file }) => {
  try {
    console.log('Uploading file:', file.name);
    
    // Create FormData to send the file
    const formData = new FormData();
    formData.append('file', file);
    
    // Call Supabase Edge Function for file upload
    const { data, error } = await supabase.functions.invoke('file-upload', {
      body: formData,
    });
    
    if (error) {
      console.error('Upload error:', error);
      throw error;
    }
    
    console.log('File uploaded successfully:', data.file_url);
    return { file_url: data.file_url };
    
  } catch (error) {
    console.error('File upload failed:', error);
    throw new Error('Failed to upload file. Please try again.');
  }
};

export const InvokeLLM = async ({ prompt, file_urls = [], user_id = null }) => {
  try {
    console.log('Invoking enhanced AI coaching analysis with', file_urls.length, 'images');
    
    // Call Supabase Edge Function for AI analysis with user context
    const { data, error } = await supabase.functions.invoke('ai-trade-analysis', {
      body: {
        prompt,
        file_urls,
        user_id // Pass user_id for enhanced coaching context
      }
    });
    
    if (error) {
      console.error('AI coaching analysis error:', error);
      throw error;
    }
    
    console.log('Enhanced AI coaching analysis completed successfully');
    return data;
    
  } catch (error) {
    console.error('AI coaching analysis failed:', error);
    throw new Error('Failed to generate coaching feedback. Please try again.');
  }
};

export const AnalyzeSetup = async ({ user_id, file_urls = [] }) => {
  try {
    console.log('Invoking deconstructor agent for educational setup analysis');
    console.log('File URLs to analyze:', file_urls.length);
    
    // Call Supabase Edge Function for deconstructor analysis
    // Note: file_urls should already be uploaded URLs from the frontend
    const { data, error } = await supabase.functions.invoke('deconstructor-agent', {
      body: {
        user_id,
        file_urls // These should be already uploaded URLs
      }
    });
    
    if (error) {
      console.error('Deconstructor agent analysis error:', error);
      throw error;
    }
    
    console.log('Deconstructor agent analysis completed successfully');
    return data.reply;
    
  } catch (error) {
    console.error('Deconstructor agent analysis failed:', error);
    throw new Error('Failed to generate educational setup analysis. Please try again.');
  }
};
