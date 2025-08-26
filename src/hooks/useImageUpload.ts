import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_FILES = 3;

interface ImageFile {
  file: File;
  preview: string;
  id: string;
}

export const useImageUpload = () => {
  const [imageFiles, setImageFiles] = useState<ImageFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `${file.name}: Invalid file type. Please use PNG, JPG, JPEG, or WebP.`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name}: File too large. Maximum size is 15MB.`;
    }
    return null;
  };

  const addFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const errors: string[] = [];
    const newFiles: ImageFile[] = [];

    // Check total count
    if (imageFiles.length + fileArray.length > MAX_FILES) {
      errors.push(`Maximum ${MAX_FILES} images allowed. You can upload ${MAX_FILES - imageFiles.length} more.`);
      return;
    }

    fileArray.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        const preview = URL.createObjectURL(file);
        newFiles.push({
          file,
          preview,
          id: Math.random().toString(36).substring(7)
        });
      }
    });

    if (errors.length > 0) {
      setUploadErrors(errors);
    } else {
      setUploadErrors([]);
    }

    if (newFiles.length > 0) {
      setImageFiles(prev => [...prev, ...newFiles]);
    }
  }, [imageFiles.length]);

  const removeFile = useCallback((fileId: string) => {
    setImageFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  }, []);

  const clearFiles = useCallback(() => {
    imageFiles.forEach(imageFile => {
      URL.revokeObjectURL(imageFile.preview);
    });
    setImageFiles([]);
    setUploadErrors([]);
  }, [imageFiles]);

  const uploadFiles = useCallback(async (userId: string, tradeDate: string): Promise<string[]> => {
    if (imageFiles.length === 0) return [];

    setIsUploading(true);
    const uploadPromises = imageFiles.map(async (imageFile, index) => {
      try {
        const timestamp = Date.now();
        const sanitizedFilename = imageFile.file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${userId}/${tradeDate}/${timestamp}-${index}-${sanitizedFilename}`;

        const { data, error } = await supabase.storage
          .from('journal-charts')
          .upload(filePath, imageFile.file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          console.error(`Upload failed for ${imageFile.file.name}:`, error);
          return null;
        }

        return data.path;
      } catch (error) {
        console.error(`Upload error for ${imageFile.file.name}:`, error);
        return null;
      }
    });

    const results = await Promise.all(uploadPromises);
    const successfulPaths = results.filter(path => path !== null) as string[];
    
    setIsUploading(false);
    return successfulPaths;
  }, [imageFiles]);

  const getSignedUrls = useCallback(async (paths: string[]): Promise<string[]> => {
    if (paths.length === 0) return [];

    try {
      const { data, error } = await supabase.storage
        .from('journal-charts')
        .createSignedUrls(paths, 3600); // 1 hour expiry

      if (error) {
        console.error('Error creating signed URLs:', error);
        return [];
      }

      return data.map(item => item.signedUrl || (item as any)['signedURL']);
    } catch (error) {
      console.error('Error creating signed URLs:', error);
      return [];
    }
  }, []);

  return {
    imageFiles,
    isUploading,
    uploadErrors,
    addFiles,
    removeFile,
    clearFiles,
    uploadFiles,
    getSignedUrls,
    canAddMore: imageFiles.length < MAX_FILES,
    remainingSlots: MAX_FILES - imageFiles.length
  };
};