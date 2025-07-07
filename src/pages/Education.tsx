
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from '@supabase/supabase-js';
import { Video } from "@/api/entities/index";
import AccessDenied from "../components/AccessDenied";
import HeroSection from "../components/learning/HeroSection";
import VideoRow from "../components/learning/VideoRow";
import VideoPlayer from "../components/learning/VideoPlayer";
import { categoryMap } from "../components/learning/constants";
import { AnimatePresence } from "framer-motion";

export default function Education() {
  const [user, setUser] = useState<User | null>(null);
  const [videos, setVideos] = useState([]);
  const [groupedVideos, setGroupedVideos] = useState([]);
  const [featuredVideo, setFeaturedVideo] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      try {
        // Get current user from Supabase
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        const fetchedVideos = await Video.list("-created_date");
        setVideos(fetchedVideos);

        if (fetchedVideos.length > 0) {
          setFeaturedVideo(fetchedVideos[0]);

          const groups = fetchedVideos.reduce((acc, video) => {
            const category = video.category || "uncategorized";
            if (!acc[category]) {
              acc[category] = [];
            }
            acc[category].push(video);
            return acc;
          }, {});

          const sortedGroups = Object.keys(groups)
            .map((key) => ({
              category: key,
              title: categoryMap[key] ? categoryMap[key].name : "General",
              order: categoryMap[key] ? categoryMap[key].order : 99,
              videos: groups[key],
            }))
            .sort((a, b) => a.order - b.order);

          setGroupedVideos(sortedGroups);
        }
      } catch (error) {
        console.error("Error initializing page:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    initialize();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-green"></div>
      </div>
    );
  }

  const userAccessLevel = user?.user_metadata?.access_level || "free";
  if (userAccessLevel === "free") {
    return <AccessDenied requiredLevel="user" />;
  }

  return (
    <div className="min-h-screen bg-background text-primary overflow-x-hidden">
      <HeroSection video={featuredVideo} onPlay={setSelectedVideo} />

      <div className="relative z-10 -mt-20">
        {groupedVideos.map((group) => (
          <VideoRow
            key={group.category}
            title={group.title}
            videos={group.videos}
            onPlay={setSelectedVideo}
          />
        ))}
      </div>

      <AnimatePresence>
        {selectedVideo && (
          <VideoPlayer
            video={selectedVideo}
            onClose={() => setSelectedVideo(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
