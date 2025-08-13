
import React, { useState, useEffect, useRef } from "react";
import { Play, Plus, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface VideoCardProps {
  video: any;
  onPlay: (video: any) => void;
  trailerUrl: string;
}

export default function VideoCard({ video, onPlay, trailerUrl }: VideoCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isHovered && videoRef.current) {
      videoRef.current
        .play()
        .catch((error) => console.log("Autoplay prevented:", error));
    } else if (!isHovered && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [isHovered]);

  return (
    <motion.div
      onClick={() => onPlay(video)}
      className="flex-shrink-0 w-64 md:w-72 rounded-md overflow-hidden group transition-transform duration-300 ease-in-out cursor-pointer relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.1, zIndex: 10, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative w-full h-full pt-[56.25%]">
        <AnimatePresence>
          {!isHovered && (
            <motion.img
              key="thumbnail"
              src={
                video.thumbnail_url ||
                `https://images.unsplash.com/photo-1612178524057-b0344547c327?w=400&h=225&fit=crop`
              }
              alt={video.title}
              className="absolute inset-0 w-full h-full object-cover"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {isHovered && (
            <motion.video
              key="trailer"
              ref={videoRef}
              src={trailerUrl}
              className="absolute inset-0 w-full h-full object-cover"
              loop
              muted
              playsInline
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            />
          )}
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent">
          <div className="p-3 absolute bottom-0 left-0 right-0">
            <h3 className="text-white font-bold text-sm truncate mb-2">
              {video.title}
            </h3>
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="flex items-center space-x-2">
                    <button className="w-9 h-9 flex items-center justify-center bg-white text-black rounded-full hover:bg-gray-200">
                      <Play className="w-5 h-5 ml-0.5 fill-black" />
                    </button>
                    <button className="w-9 h-9 flex items-center justify-center border-2 border-gray-400 text-white rounded-full hover:border-white">
                      <Plus className="w-5 h-5" />
                    </button>
                    <button className="w-9 h-9 flex items-center justify-center border-2 border-gray-400 text-white rounded-full hover:border-white ml-auto">
                      <ChevronDown className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
