import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Video } from "@/api/entities/index";
import AccessDenied from "@/components/AccessDenied";
import { AnimatePresence, motion } from "framer-motion";
import { EducationFunnel } from "@/components/analytics/FunnelTracker";
import { usePostHogTracking } from "@/hooks/usePostHogTracking";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { Play, Star, Clock, TrendingUp, Award, BookOpen, Target, ChevronRight, Search, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function Education() {
  const [user, setUser] = useState<User | null>(null);
  const [videos, setVideos] = useState([]);
  const [groupedVideos, setGroupedVideos] = useState([]);
  const [featuredVideo, setFeaturedVideo] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  
  const { trackEducation } = usePostHogTracking();
  const { education } = useFeatureFlags();

  const categories = [
    { id: "all", name: "All Courses", icon: BookOpen },
    { id: "beginner", name: "Beginner", icon: Target },
    { id: "intermediate", name: "Intermediate", icon: TrendingUp },
    { id: "advanced", name: "Advanced", icon: Award },
    { id: "strategies", name: "Strategies", icon: Star }
  ];

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      try {
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

          setGroupedVideos(Object.entries(groups).map(([key, videos]) => ({
            category: key,
            title: key.charAt(0).toUpperCase() + key.slice(1),
            videos
          })));
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading your trading education...</p>
        </div>
      </div>
    );
  }

  const userAccessLevel = user?.user_metadata?.access_level || "free";
  if (userAccessLevel === "free") {
    return <AccessDenied requiredLevel="user" />;
  }

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         video.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || video.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <EducationFunnel step="page_visit">
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
        {/* Netflix-style Hero Section */}
        {featuredVideo && (
          <div className="relative h-[70vh] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent z-10"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-20"></div>
            
            {/* Background Video Thumbnail */}
            <div 
              className="absolute inset-0 bg-cover bg-center scale-110 blur-sm"
              style={{
                backgroundImage: featuredVideo.thumbnail_url ? `url(${featuredVideo.thumbnail_url})` : 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-glow)) 100%)'
              }}
            />
            
            {/* Hero Content */}
            <div className="relative z-30 h-full flex items-center px-6 md:px-12">
              <div className="max-w-2xl space-y-6">
                <Badge className="bg-primary/20 text-primary border-primary/30 mb-4">
                  Featured Course
                </Badge>
                
                <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
                  {featuredVideo.title}
                </h1>
                
                <p className="text-lg text-white/80 leading-relaxed max-w-xl">
                  {featuredVideo.description || "Master professional trading strategies with our comprehensive video courses designed by industry experts."}
                </p>
                
                <div className="flex items-center space-x-6 text-white/70">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>{featuredVideo.duration ? `${Math.floor(featuredVideo.duration / 60)}m` : "30m"}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Star className="w-4 h-4 text-yellow-400" />
                    <span>4.9</span>
                  </div>
                  <Badge variant="outline" className="border-white/30 text-white">
                    {featuredVideo.difficulty || "Intermediate"}
                  </Badge>
                </div>
                
                <div className="flex items-center space-x-4">
                  <Button 
                    onClick={() => handleVideoPlay(featuredVideo)}
                    className="bg-white text-black hover:bg-white/90 px-8 py-3 text-lg font-semibold"
                  >
                    <Play className="w-5 h-5 mr-2 fill-current" />
                    Play Course
                  </Button>
                  <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 px-6">
                    More Info
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="px-6 md:px-12 py-8 space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search courses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background/50 border-border/50 focus:bg-background"
              />
            </div>
            
            <div className="flex items-center space-x-2 overflow-x-auto">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? "default" : "outline"}
                    onClick={() => setSelectedCategory(category.id)}
                    className="whitespace-nowrap"
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {category.name}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Continue Watching Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-bold text-foreground flex items-center">
              <BookOpen className="w-6 h-6 mr-3 text-primary" />
              Continue Learning
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredVideos.slice(0, 8).map((video, index) => (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  className="group cursor-pointer"
                  onClick={() => handleVideoPlay(video)}
                >
                  <Card className="bg-card/50 border-border/50 group-hover:border-primary/50 transition-all duration-300 overflow-hidden">
                    <div className="aspect-video relative overflow-hidden">
                      <div 
                        className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                        style={{
                          backgroundImage: video.thumbnail_url ? `url(${video.thumbnail_url})` : undefined,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }}
                      >
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Play className="w-5 h-5 text-black ml-1 fill-current" />
                          </div>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
                        <div className="h-full bg-primary" style={{ width: `${Math.random() * 60 + 10}%` }}></div>
                      </div>
                    </div>
                    
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-2">
                        {video.title}
                      </h3>
                      
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-3 h-3" />
                          <span>{video.duration ? `${Math.floor(video.duration / 60)}m` : "25m"}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {video.difficulty || "Beginner"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Course Categories */}
          {groupedVideos.map((group, groupIndex) => (
            <motion.div
              key={group.category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: groupIndex * 0.2 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground flex items-center">
                  <TrendingUp className="w-6 h-6 mr-3 text-primary" />
                  {group.title}
                  <span className="ml-2 text-sm text-muted-foreground">({group.videos.length})</span>
                </h2>
                <Button variant="ghost" className="text-primary hover:text-primary/80">
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {group.videos.slice(0, 4).map((video, index) => (
                  <motion.div
                    key={video.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    className="group cursor-pointer"
                    onClick={() => handleVideoPlay(video)}
                  >
                    <Card className="bg-card/30 border-border/30 group-hover:border-primary/30 transition-all duration-300 overflow-hidden backdrop-blur-sm">
                      <div className="aspect-video relative overflow-hidden">
                        <div 
                          className="w-full h-full bg-gradient-to-br from-muted/20 to-muted/5 flex items-center justify-center"
                          style={{
                            backgroundImage: video.thumbnail_url ? `url(${video.thumbnail_url})` : undefined,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                          }}
                        >
                          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <div className="w-10 h-10 bg-white/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Play className="w-4 h-4 text-black ml-0.5 fill-current" />
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <CardContent className="p-4">
                        <h3 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-2">
                          {video.title}
                        </h3>
                        
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>{video.duration ? `${Math.floor(video.duration / 60)} min` : "20 min"}</span>
                          <div className="flex items-center space-x-1">
                            <Star className="w-3 h-3 text-yellow-400 fill-current" />
                            <span>4.8</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Video Player Modal */}
        <AnimatePresence>
          {selectedVideo && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedVideo(null)}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="bg-background rounded-lg overflow-hidden max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="aspect-video bg-black">
                  <video
                    src={selectedVideo.video_url}
                    controls
                    autoPlay
                    className="w-full h-full"
                  />
                </div>
                <div className="p-6 space-y-4">
                  <h2 className="text-2xl font-bold text-foreground">{selectedVideo.title}</h2>
                  <p className="text-muted-foreground">{selectedVideo.description}</p>
                  <div className="flex items-center space-x-4">
                    <Badge variant="outline">{selectedVideo.difficulty || "Intermediate"}</Badge>
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{selectedVideo.duration ? `${Math.floor(selectedVideo.duration / 60)} minutes` : "30 minutes"}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </EducationFunnel>
  );
}