
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Clock } from 'lucide-react';

interface VideoRowProps {
  title: string;
  videos: any[];
  onPlay: (video: any) => void;
}

export default function VideoRow({ title, videos, onPlay }: VideoRowProps) {
  if (!videos || videos.length === 0) return null;

  return (
    <div className="px-6 py-8">
      <h2 className="text-2xl font-semibold text-primary mb-6">{title}</h2>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {videos.map((video) => (
          <Card
            key={video.id}
            className="min-w-[300px] bg-surface/80 border-default hover:border-accent-green transition-all cursor-pointer group"
            onClick={() => onPlay(video)}
          >
            <CardContent className="p-0">
              <div className="relative">
                {video.thumbnail_url ? (
                  <img
                    src={video.thumbnail_url}
                    alt={video.title}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-gray-800 to-gray-900 rounded-t-lg flex items-center justify-center">
                    <Play className="w-12 h-12 text-accent-green" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all rounded-t-lg flex items-center justify-center">
                  <Button
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-accent-green/90 hover:bg-accent-green"
                  >
                    <Play className="w-6 h-6 text-white" />
                  </Button>
                </div>
              </div>
              
              <div className="p-4">
                <h3 className="font-semibold text-primary mb-2 line-clamp-2">{video.title}</h3>
                {video.description && (
                  <p className="text-sm text-secondary mb-3 line-clamp-2">{video.description}</p>
                )}
                {video.duration && (
                  <div className="flex items-center text-xs text-secondary">
                    <Clock className="w-3 h-3 mr-1" />
                    {video.duration}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
