
import React, { useState, useEffect, useRef } from "react";
import { User } from '@/api/entities';
import { Video } from "@/api/entities";
import AccessDenied from '../components/AccessDenied';
import { Button } from "@/components/ui/button";
import {
  Play,
  Info,
  ChevronDown,
  Plus
} from "lucide-react";
import { AnimatePresence, motion } from 'framer-motion';

// --- DATA MAPPING & CATEGORY DEFINITIONS ---
const categoryMap = {
  basics: { name: "Level 1: Enter the Trader’s Arena", order: 1 },
  technical_analysis: { name: "Level 2: Master the Charts", order: 2 },
  fundamental_analysis: { name: "Level 3: Read the Market's Mind", order: 3 },
  risk_management: { name: "Level 4: Protect Your Capital", order: 4 },
  psychology: { name: "Level 5: Conquer Your Emotions", order: 5 },
  advanced_strategies: { name: "Level 6: Elite Trading Techniques", order: 6 }
};

// --- TRAILER VIDEO CLIPS ---
const trailerClips = [
  "https://videos.pexels.com/video-files/853883/853883-hd_1920_1080_30fps.mp4", // Stock market graphs
  "https://videos.pexels.com/video-files/5915334/5915334-hd_1920_1080_25fps.mp4", // Digital data screen
  "https://videos.pexels.com/video-files/7578540/7578540-hd_1920_1080_25fps.mp4", // Person analyzing charts
  "https://videos.pexels.com/video-files/7679951/7679951-hd_1920_1080_25fps.mp4"  // Abstract financial data
];

// --- UI COMPONENTS ---

const HeroSection = ({ video, onPlay }) => {
  if (!video) return null;

  return (
    <div className="relative h-[65vh] w-full mb-12">
      <div className="absolute inset-0">
        <img src={video.thumbnail_url || 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1920&h=1080&fit=crop'} alt={video.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent" />
      </div>
      <div className="relative z-10 flex flex-col justify-end h-full p-6 lg:p-12 text-left">
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
        >
            <h1 className="text-4xl lg:text-6xl font-black text-primary mb-4 max-w-2xl">{video.title}</h1>
            <p className="text-secondary text-lg mb-8 max-w-2xl">{video.description}</p>
            <div className="flex items-center gap-3">
            <Button onClick={() => onPlay(video)} className="bg-accent-green hover:bg-green-500 text-white font-bold text-lg px-8 py-6 rounded-lg">
                <Play className="w-6 h-6 mr-2 fill-white" />
                Play
            </Button>
            <Button variant="outline" className="bg-surface/50 border-default text-primary font-bold text-lg px-8 py-6 rounded-lg hover:bg-surface">
                <Info className="w-6 h-6 mr-2" />
                More Info
            </Button>
            </div>
        </motion.div>
      </div>
    </div>
  );
};

const VideoCard = ({ video, onPlay, trailerUrl }) => {
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    if (isHovered && videoRef.current) {
      videoRef.current.play().catch(error => console.log("Autoplay prevented:", error));
    } else if (!isHovered && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0; // Reset video to start
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
        <div className="relative w-full h-full pt-[56.25%]"> {/* 16:9 Aspect Ratio */}
            <AnimatePresence>
                {!isHovered && (
                    <motion.img
                        key="thumbnail"
                        src={video.thumbnail_url || `https://images.unsplash.com/photo-1612178524057-b0344547c327?w=400&h=225&fit=crop`}
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
                    <h3 className="text-white font-bold text-sm truncate mb-2">{video.title}</h3>
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
};

const VideoRow = ({ title, videos, onPlay }) => {
    const scrollRef = useRef(null);
    return (
        <div className="mb-10">
            <h2 className="text-xl font-bold text-primary mb-3 px-6 lg:px-12">{title}</h2>
            <div className="relative">
                <div ref={scrollRef} className="flex space-x-2 overflow-x-auto py-4 px-6 lg:px-12" style={{ scrollbarWidth: 'none', '-ms-overflow-style': 'none' }}>
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
};

const VideoPlayer = ({ video, onClose }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
        onClick={onClose}
    >
      <div className="max-w-6xl w-full max-h-full overflow-auto" onClick={e => e.stopPropagation()}>
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
              <p className="text-secondary">Video player would be integrated here</p>
              <p className="text-sm text-secondary/50 mt-2">URL: {video.video_url}</p>
            </div>
          </div>
          <div className="space-y-4">
            <p className="text-secondary">{video.description}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );

export default function Education() {
  const [user, setUser] = useState(null);
  const [videos, setVideos] = useState([]);
  const [groupedVideos, setGroupedVideos] = useState([]);
  const [featuredVideo, setFeaturedVideo] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initialize = async () => {
        setIsLoading(true);
        try {
            const currentUser = await User.me();
            setUser(currentUser);

            const fetchedVideos = await Video.list("-created_date");
            setVideos(fetchedVideos);

            if (fetchedVideos.length > 0) {
                setFeaturedVideo(fetchedVideos[0]); // Feature the newest video

                const groups = fetchedVideos.reduce((acc, video) => {
                    const category = video.category || 'uncategorized';
                    if (!acc[category]) {
                        acc[category] = [];
                    }
                    acc[category].push(video);
                    return acc;
                }, {});

                const sortedGroups = Object.keys(groups)
                    .map(key => ({
                        category: key,
                        title: categoryMap[key] ? categoryMap[key].name : "General",
                        order: categoryMap[key] ? categoryMap[key].order : 99,
                        videos: groups[key]
                    }))
                    .sort((a, b) => a.order - b.order);

                setGroupedVideos(sortedGroups);
            }
        } catch (error) {
            console.error("Error initializing page:", error);
            setUser(null); // Ensure user is null on error
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

  const userAccessLevel = user?.access_level || "free";
  if (userAccessLevel === "free") {
    return <AccessDenied requiredLevel="user" />;
  }

  return (
    <div className="min-h-screen bg-background text-primary overflow-x-hidden">
        <HeroSection video={featuredVideo} onPlay={setSelectedVideo} />

        <div className="relative z-10 -mt-20">
            {groupedVideos.map(group => (
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
