
import React, { useRef } from "react";
import VideoCard from "./VideoCard";
import { trailerClips } from "./constants";

interface VideoRowProps {
  title: string;
  videos: any[];
  onPlay: (video: any) => void;
}

export default function VideoRow({ title, videos, onPlay }: VideoRowProps) {
  const scrollRef = useRef(null);
  
  return (
    <div className="mb-10">
      <h2 className="text-xl font-bold text-primary mb-3 px-6 lg:px-12">
        {title}
      </h2>
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex space-x-2 overflow-x-auto py-4 px-6 lg:px-12 scrollbar-hide"
        >
          {videos.map((video, index) => (
            <VideoCard
              key={video.id}
              video={video}
              onPlay={onPlay}
              trailerUrl={trailerClips[index % trailerClips.length]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
