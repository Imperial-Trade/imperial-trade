import React from 'react';
import { ImageGallery } from '@/components/ui/image-gallery';
import { useSignedUrls } from '@/hooks/useSignedUrls';

interface ImageGalleryWithUrlsProps {
  paths: string[];
  alt?: string;
  className?: string;
}

export const ImageGalleryWithUrls: React.FC<ImageGalleryWithUrlsProps> = ({ 
  paths, 
  alt = "Trade charts", 
  className = "mt-3"
}) => {
  const { signedUrls, loading, error } = useSignedUrls(paths);
  
  if (loading) return <div className="text-sm text-muted-foreground mt-3">Loading images...</div>;
  if (error) return <div className="text-sm text-red-600 mt-3">Error loading images: {error}</div>;
  if (signedUrls.length === 0) return null;
  
  return <ImageGallery images={signedUrls} alt={alt} className={className} />;
};