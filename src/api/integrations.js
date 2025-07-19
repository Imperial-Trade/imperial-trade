
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

export const InvokeLLM = async ({ prompt, file_urls = [] }) => {
  try {
    console.log('Invoking AI analysis with', file_urls.length, 'images');
    
    // Call Supabase Edge Function for AI analysis
    const { data, error } = await supabase.functions.invoke('ai-trade-analysis', {
      body: {
        prompt,
        file_urls
      }
    });
    
    if (error) {
      console.error('AI analysis error:', error);
      throw error;
    }
    
    console.log('AI analysis completed successfully');
    return data.result;
    
  } catch (error) {
    console.error('AI analysis failed:', error);
    throw new Error('Failed to analyze screenshots. Please try again.');
  }
};
