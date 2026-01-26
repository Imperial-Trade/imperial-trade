
// Real implementations using Supabase Edge Functions
import { supabase } from '@/integrations/supabase/client';

export const UploadFile = async ({ file, userId = null }) => {
  try {
    console.log('Uploading file:', file.name, 'Size:', file.size);
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
    }
    
    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('File too large. Maximum size is 10MB.');
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop() || 'png';
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = userId 
      ? `${userId}/${timestamp}-${randomString}-${sanitizedFilename}`
      : `${timestamp}-${randomString}-${sanitizedFilename}`;
    
    // Upload directly to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('trade-screenshots')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      // Check for specific error types
      if (uploadError.message?.includes('Bucket not found')) {
        throw new Error('Storage bucket not configured. Please contact support.');
      }
      if (uploadError.message?.includes('new row violates') || uploadError.message?.includes('policy')) {
        throw new Error('Permission denied. Please make sure you are logged in.');
      }
      if (uploadError.message?.includes('duplicate')) {
        // File already exists, try with a new name
        const retryFileName = `${userId || 'uploads'}/${timestamp}-${Date.now()}-${randomString}-${sanitizedFilename}`;
        const { data: retryData, error: retryError } = await supabase.storage
          .from('trade-screenshots')
          .upload(retryFileName, file, {
            cacheControl: '3600',
            upsert: false
          });
        
        if (retryError) {
          throw new Error(retryError.message || 'Failed to upload file to storage.');
    }
    
        const { data: { publicUrl } } = supabase.storage
          .from('trade-screenshots')
          .getPublicUrl(retryData.path);
        
        console.log('File uploaded successfully (retry):', publicUrl);
        return { file_url: publicUrl };
      }
      throw new Error(uploadError.message || 'Failed to upload file to storage.');
    }
    
    if (!uploadData || !uploadData.path) {
      throw new Error('Upload succeeded but no file path returned.');
    }
    
    // Get public URL using the path from upload response
    const { data: { publicUrl } } = supabase.storage
      .from('trade-screenshots')
      .getPublicUrl(uploadData.path);
    
    console.log('File uploaded successfully:', publicUrl);
    return { file_url: publicUrl };
    
  } catch (error) {
    console.error('File upload failed:', error);
    // Return the actual error message for better debugging
    const errorMessage = error?.message || error?.error?.message || 'Failed to upload file. Please try again.';
    throw new Error(errorMessage);
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

export const AnalyzeSetup = async ({ user_id, file_urls = [], api_key = null }) => {
  try {
    console.log('Invoking deconstructor agent for educational setup analysis');
    console.log('File URLs to analyze:', file_urls.length);
    console.log('API key provided:', api_key ? 'Yes (user key)' : 'No (will use env var)');
    
    // Call Supabase Edge Function for deconstructor analysis
    // Note: file_urls should already be uploaded URLs from the frontend
    const { data, error } = await supabase.functions.invoke('deconstructor-agent', {
      body: {
        user_id,
        file_urls, // These should be already uploaded URLs
        api_key // Pass user's API key if available
      }
    });
    
    if (error) {
      console.error('Deconstructor agent analysis error:', error);
      // Check if error indicates API key issue
      if (error.message?.includes('API key') || error.message?.includes('requires_api_key')) {
        throw new Error('API key not configured. Please set your Gemini API key in Insight XX settings.');
      }
      throw error;
    }
    
    // Check if response indicates API key is needed
    if (data?.error && data.error.includes('API key')) {
      throw new Error('API key not configured. Please set your Gemini API key in Insight XX settings.');
    }
    
    console.log('Deconstructor agent analysis completed successfully');
    return data.reply;
    
  } catch (error) {
    console.error('Deconstructor agent analysis failed:', error);
    // Preserve the actual error message instead of generic one
    const errorMessage = error?.message || error?.error?.message || 'Failed to generate educational setup analysis. Please try again.';
    throw new Error(errorMessage);
  }
};
