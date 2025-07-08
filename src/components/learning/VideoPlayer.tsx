
import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface VideoPlayerProps {
  video: any;
  onClose: () => void;
}

export default function VideoPlayer({ video, onClose }: VideoPlayerProps) {
  if (!video) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className="relative w-full max-w-6xl bg-surface rounded-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-4 right-4 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="bg-black/50 hover:bg-black/70 text-white"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>
        
        <div className="aspect-video bg-black">
          {video.video_url ? (
            <video
              src={video.video_url}
              controls
              autoPlay
              className="w-full h-full"
              poster={video.thumbnail_url}
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white">
              <div className="text-center">
                <p className="text-xl mb-2">Video not available</p>
                <p className="text-secondary">Please check back later</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="p-6">
          <h2 className="text-2xl font-bold text-primary mb-2">{video.title}</h2>
          {video.description && (
            <p className="text-secondary">{video.description}</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
