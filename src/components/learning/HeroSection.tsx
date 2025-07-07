
import React from "react";
import { Button } from "@/components/ui/button";
import { Play, Info } from "lucide-react";
import { motion } from "framer-motion";

interface HeroSectionProps {
  video: any;
  onPlay: (video: any) => void;
}

export default function HeroSection({ video, onPlay }: HeroSectionProps) {
  if (!video) return null;

  return (
    <div className="relative h-[65vh] w-full mb-12">
      <div className="absolute inset-0">
        <img
          src={
            video.thumbnail_url ||
            "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1920&h=1080&fit=crop"
          }
          alt={video.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent" />
      </div>
      <div className="relative z-10 flex flex-col justify-end h-full p-6 lg:p-12 text-left">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-4xl lg:text-6xl font-black text-primary mb-4 max-w-2xl">
            {video.title}
          </h1>
          <p className="text-secondary text-lg mb-8 max-w-2xl">
            {video.description}
          </p>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => onPlay(video)}
              className="bg-accent-green hover:bg-green-500 text-white font-bold text-lg px-8 py-6 rounded-lg"
            >
              <Play className="w-6 h-6 mr-2 fill-white" />
              Play
            </Button>
            <Button
              variant="outline"
              className="bg-surface/50 border-default text-primary font-bold text-lg px-8 py-6 rounded-lg hover:bg-surface"
            >
              <Info className="w-6 h-6 mr-2" />
              More Info
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
