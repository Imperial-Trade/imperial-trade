
import React from 'react';
import { Button } from '@/components/ui/button';
import { Play, BookOpen } from 'lucide-react';

interface HeroSectionProps {
  video: any;
  onPlay: (video: any) => void;
}

export default function HeroSection({ video, onPlay }: HeroSectionProps) {
  if (!video) {
    return (
      <div className="relative h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-green-900 flex items-center justify-center">
        <div className="text-center text-white">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-accent-green" />
          <h1 className="text-4xl font-bold mb-4">Premium Education</h1>
          <p className="text-xl text-gray-300">Loading your learning content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen overflow-hidden">
      {video.thumbnail_url && (
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: `url(${video.thumbnail_url})`,
            filter: 'brightness(0.4)'
          }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      
      <div className="relative z-10 h-full flex items-center justify-center px-6">
        <div className="text-center text-white max-w-4xl">
          <h1 className="text-5xl lg:text-7xl font-bold mb-6 leading-tight">
            Master the <span className="gold-text-gradient">Markets</span>
          </h1>
          <p className="text-xl lg:text-2xl text-gray-300 mb-8 max-w-2xl mx-auto">
            {video.description || "Unlock professional trading strategies with our comprehensive video library"}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              onClick={() => onPlay(video)}
              className="bg-accent-green hover:bg-green-500 text-white px-8 py-4 text-lg"
            >
              <Play className="w-6 h-6 mr-2" />
              Watch Featured Video
            </Button>
            <div className="text-sm text-gray-400">
              Featured: {video.title}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
