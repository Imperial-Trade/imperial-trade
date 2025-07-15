
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Video } from "@/api/entities/index";
import AccessDenied from "@/components/AccessDenied";
import HeroSection from "@/components/learning/HeroSection";
import VideoRow from "@/components/learning/VideoRow";
import VideoPlayer from "@/components/learning/VideoPlayer";
import { categoryMap } from "@/components/learning/constants";
import { AnimatePresence } from "framer-motion";
import { EducationFunnel } from "@/components/analytics/FunnelTracker";
import { usePostHogTracking } from "@/hooks/usePostHogTracking";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

export default function Education() {
  const [user, setUser] = useState<User | null>(null);
  const [videos, setVideos] = useState([]);
  const [groupedVideos, setGroupedVideos] = useState([]);
  const [featuredVideo, setFeaturedVideo] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const { trackEducation } = usePostHogTracking();
  const { education } = useFeatureFlags();

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      try {
        // Get current user from Supabase
        const {
          data: { user },
        } = await supabase.auth.getUser();
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

  const handleVideoPlay = (video: any) => {
    setSelectedVideo(video);
    trackEducation.videoStart(video.id, video.title);
  };

  const handleVideoProgress = (video: any, percentage: number) => {
    trackEducation.videoProgress(video.id, video.title, percentage);
  };

  const handleVideoComplete = (video: any) => {
    trackEducation.videoComplete(video.id, video.title);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-green"></div>
      </div>
    );
  }

  const userAccessLevel = user?.user_metadata?.access_level || "free";
  if (userAccessLevel === "free") {
    return <AccessDenied requiredLevel="user" />;
  }

  return (
    <EducationFunnel step="page_visit">
      <div className="flex flex-col bg-background text-primary overflow-hidden">
        <HeroSection video={featuredVideo} onPlay={handleVideoPlay} />

        <div className="relative z-10 -mt-20 overflow-auto flex-1">
          {groupedVideos.map((group) => (
            <VideoRow
              key={group.category}
              title={group.title}
              videos={group.videos}
              onPlay={handleVideoPlay}
            />
          ))}
        </div>

        <AnimatePresence>
          {selectedVideo && (
            <VideoPlayer
              video={selectedVideo}
              onClose={() => setSelectedVideo(null)}
              onProgress={handleVideoProgress}
              onComplete={handleVideoComplete}
            />
          )}
        </AnimatePresence>
      </div>
    </EducationFunnel>
  );
}
