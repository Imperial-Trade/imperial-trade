import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, Download, ZoomIn } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageGalleryProps {
  images: string[];
  alt?: string;
  className?: string;
}

interface ImageLightboxProps {
  images: string[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  alt?: string;
}

const ImageLightbox: React.FC<ImageLightboxProps> = ({
  images,
  currentIndex,
  isOpen,
  onClose,
  alt = "Trade screenshot"
}) => {
  const [activeIndex, setActiveIndex] = useState(currentIndex);

  const goToPrevious = useCallback(() => {
    setActiveIndex(prev => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const goToNext = useCallback(() => {
    setActiveIndex(prev => (prev + 1) % images.length);
  }, [images.length]);

  const handleDownload = useCallback(() => {
    const link = document.createElement('a');
    link.href = images[activeIndex];
    link.download = `chart-${activeIndex + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [images, activeIndex]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden">
        <DialogHeader className="absolute top-0 left-0 right-0 z-10 bg-black/80 text-white p-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white">
              Chart {activeIndex + 1} of {images.length}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleDownload}
                className="text-white hover:bg-white/20"
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClose}
                className="text-white hover:bg-white/20"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="relative w-full h-full flex items-center justify-center bg-black">
          <img
            src={images[activeIndex]}
            alt={`${alt} ${activeIndex + 1}`}
            className="max-w-full max-h-full object-contain"
          />

          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20 z-10"
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={goToNext}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20 z-10"
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            </>
          )}

          {/* Thumbnail strip for multiple images */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/80 rounded-lg p-2">
              <div className="flex gap-2">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveIndex(index)}
                    className={cn(
                      "w-12 h-12 rounded-md overflow-hidden border-2 transition-all",
                      activeIndex === index 
                        ? "border-primary shadow-lg" 
                        : "border-white/30 hover:border-white/60"
                    )}
                  >
                    <img
                      src={image}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  alt = "Trade screenshot",
  className
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const openLightbox = useCallback((index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
  }, []);

  if (!images || images.length === 0) return null;

  // Render single image - centered with max height
  if (images.length === 1) {
    return (
      <>
        <div className={cn("cursor-pointer group relative flex justify-center", className)}>
          <div className="relative overflow-hidden rounded-lg">
            <img 
              src={images[0]} 
              alt={alt || 'Image'}
              className="max-h-48 w-auto object-contain transition-transform duration-300 group-hover:scale-105 rounded-lg"
              onClick={() => openLightbox(0)}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-all duration-200 flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full p-2">
                <ZoomIn className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        </div>

        <ImageLightbox
          images={images}
          currentIndex={currentIndex}
          isOpen={lightboxOpen}
          onClose={closeLightbox}
          alt={alt}
        />
      </>
    );
  }

  // Multiple images grid display - single row for 2-3 images
  return (
    <>
      <div className={cn("flex gap-2 justify-start", className)}>
        {images.slice(0, 3).map((image, index) => (
          <div key={index} className="cursor-pointer group relative flex-1 min-w-0">
            <div className="relative overflow-hidden rounded-lg">
              <img 
                src={image} 
                alt={`${alt} ${index + 1}`}
                className="w-full h-32 object-cover transition-transform duration-300 group-hover:scale-105"
                onClick={() => openLightbox(index)}
              />
              {index === 2 && images.length > 3 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white text-lg font-semibold">+{images.length - 3}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-all duration-200 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full p-1">
                  <ZoomIn className="w-3 h-3 text-white" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <ImageLightbox
        images={images}
        currentIndex={currentIndex}
        isOpen={lightboxOpen}
        onClose={closeLightbox}
        alt={alt}
      />
    </>
  );
};