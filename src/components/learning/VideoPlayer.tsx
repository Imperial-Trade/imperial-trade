
import React from "react";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { motion } from "framer-motion";

interface VideoPlayerProps {
  video: any;
  onClose: () => void;
}

export default function VideoPlayer({ video, onClose }: VideoPlayerProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="max-w-6xl w-full max-h-full overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="glass-effect rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-primary">{video.title}</h2>
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-primary hover:bg-surface"
            >
              ✕
            </Button>
          </div>
          <div className="aspect-video bg-background rounded-lg mb-4 flex items-center justify-center">
            <div className="text-center">
              <Play className="w-16 h-16 text-accent-green mx-auto mb-4" />
              <p className="text-secondary">
                Video player would be integrated here
              </p>
              <p className="text-sm text-secondary/50 mt-2">
                URL: {video.video_url}
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <p className="text-secondary">{video.description}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
