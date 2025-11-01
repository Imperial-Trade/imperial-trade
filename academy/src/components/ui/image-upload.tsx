import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageFile {
  file: File;
  preview: string;
  id: string;
}

interface ImageUploadProps {
  images: ImageFile[];
  onAddFiles: (files: FileList) => void;
  onRemoveFile: (fileId: string) => void;
  maxFiles?: number;
  disabled?: boolean;
  errors?: string[];
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  images,
  onAddFiles,
  onRemoveFile,
  maxFiles = 3,
  disabled = false,
  errors = []
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onAddFiles(files);
    }
    // Reset input value so the same file can be selected again
    event.target.value = '';
  };

  const canAddMore = images.length < maxFiles;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Upload Charts</span>
          <Badge variant="secondary" className="text-xs">
            {images.length}/{maxFiles}
          </Badge>
        </div>
        
        {canAddMore && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleFileSelect}
            disabled={disabled}
            className="flex items-center gap-1.5 h-7 text-xs"
          >
            <Upload className="w-3 h-3" />
            Add Image
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((error, index) => (
            <p key={index} className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 px-2 py-1 rounded">
              {error}
            </p>
          ))}
        </div>
      )}

      {/* Image Previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((imageFile) => (
            <Card key={imageFile.id} className="relative overflow-hidden group">
              <CardContent className="p-0">
                <div className="aspect-square relative">
                  <img
                    src={imageFile.preview}
                    alt={imageFile.file.name}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Remove Button */}
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onRemoveFile(imageFile.id)}
                    disabled={disabled}
                  >
                    <X className="w-3 h-3" />
                  </Button>

                  {/* File Info Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                    <p className="text-white text-xs truncate">
                      {imageFile.file.name}
                    </p>
                    <p className="text-white/80 text-xs">
                      {(imageFile.file.size / (1024 * 1024)).toFixed(1)}MB
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Drop Area (when no images) */}
      {images.length === 0 && (
        <div
          className={cn(
            "border-2 border-dashed border-muted rounded-lg p-6 text-center transition-colors",
            canAddMore && !disabled && "hover:border-primary cursor-pointer",
            disabled && "opacity-50"
          )}
          onClick={canAddMore && !disabled ? handleFileSelect : undefined}
        >
          <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-1">
            {canAddMore ? 'Click to upload charts' : 'Maximum files reached'}
          </p>
          <p className="text-xs text-muted-foreground">
            PNG, JPG, JPEG, WebP • Max 15MB each • Up to {maxFiles} images
          </p>
        </div>
      )}
    </div>
  );
};