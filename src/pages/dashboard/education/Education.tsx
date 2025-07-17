
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import ImperialHeroSection from "@/components/education/ImperialHeroSection";
import ModuleGrid from "@/components/education/ModuleGrid";
import LearningStats from "@/components/education/LearningStats";
import { motion } from "framer-motion";

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  lessons: any[];
  thumbnail_url: string;
  created_at: string;
}

interface UserProfile {
  learning_streak?: number;
  trading_points?: number;
  trading_identity_level?: string;
}

export default function Education() {
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        if (user) {
          // Fetch user profile with gamification data (handle missing columns gracefully)
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (profile) {
            setUserProfile({
              learning_streak: (profile as any).learning_streak || 0,
              trading_points: (profile as any).trading_points || 0,
              trading_identity_level: (profile as any).trading_identity_level || 'Aspiring Trader'
            });
          }
        }

        // Fetch Imperial Academy courses
        const { data: coursesData, error } = await supabase
          .from('courses')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching courses:', error);
        } else {
          // Transform the data to match our interface
          const transformedCourses = (coursesData || []).map(course => ({
            ...course,
            lessons: Array.isArray(course.lessons) ? course.lessons : []
          }));
          setCourses(transformedCourses);
        }
      } catch (error) {
        console.error("Error initializing Imperial Academy:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  const handleCourseSelect = (course: Course) => {
    navigate(`/dashboard/education/course/${course.id}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
          <p className="text-muted-foreground">Loading Imperial Academy...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-background"
    >
      {/* Imperial Academy Hero Section */}
      <ImperialHeroSection 
        featuredCourse={courses[0]}
        onCourseSelect={handleCourseSelect}
      />

      {/* Learning Stats Dashboard */}
      {userProfile && (
        <div className="px-4 md:px-8 -mt-16 relative z-10">
          <LearningStats
            learningStreak={userProfile.learning_streak || 0}
            tradingPoints={userProfile.trading_points || 0}
            tradingIdentityLevel={userProfile.trading_identity_level || 'Aspiring Trader'}
          />
        </div>
      )}

      {/* Module Grid */}
      <div className="px-4 md:px-8 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">
              Imperial Academy Modules
            </h2>
            <p className="text-muted-foreground">
              Master trading with our comprehensive curriculum designed by professionals
            </p>
          </div>
          
          <ModuleGrid 
            courses={courses}
            onCourseSelect={handleCourseSelect}
          />
        </div>
      </div>
    </motion.div>
  );
}
