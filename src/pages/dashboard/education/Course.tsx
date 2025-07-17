
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import { ArrowLeft, Play, Clock, BookOpen, CheckCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Course {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  lessons: Lesson[];
  thumbnail_url: string;
}

interface Lesson {
  title: string;
  duration: number;
  youtube_video_id: string;
  summary: string;
}

interface UserProgress {
  id: string;
  completed_lessons?: number[];
  progress_percentage?: number;
  current_lesson_index?: number;
}

export default function Course() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      if (!courseId) return;

      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        // Fetch course data
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('*')
          .eq('id', courseId)
          .single();

        if (courseError) {
          console.error('Error fetching course:', courseError);
          navigate('/dashboard/education');
          return;
        }

        // Transform the course data to match our interface
        const transformedCourse: Course = {
          ...courseData,
          lessons: Array.isArray(courseData.lessons) ? courseData.lessons : []
        };
        setCourse(transformedCourse);

        // Fetch user progress if user is logged in
        if (user) {
          const { data: progressData } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', user.id)
            .eq('course_id', courseId)
            .single();

          if (progressData) {
            setUserProgress({
              id: progressData.id,
              completed_lessons: progressData.completed_lessons || [],
              progress_percentage: progressData.progress_percentage || 0,
              current_lesson_index: progressData.current_lesson_index || 0
            });
          }
        }
      } catch (error) {
        console.error('Error initializing course:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [courseId, navigate]);

  const handleLessonSelect = async (lessonIndex: number) => {
    if (!course || !user) return;

    // Navigate to watch page
    navigate(`/dashboard/education/watch/${course.id}/${lessonIndex}`);
  };

  const isLessonCompleted = (lessonIndex: number) => {
    return userProgress?.completed_lessons?.includes(lessonIndex) || false;
  };

  const isLessonUnlocked = (lessonIndex: number) => {
    if (lessonIndex === 0) return true; // First lesson is always unlocked
    return isLessonCompleted(lessonIndex - 1); // Can access if previous lesson is completed
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Course Not Found</h2>
          <Button onClick={() => navigate('/dashboard/education')}>
            Back to Imperial Academy
          </Button>
        </div>
      </div>
    );
  }

  const totalLessons = course.lessons.length;
  const completedLessons = userProgress?.completed_lessons?.length || 0;
  const progressPercentage = Math.round((completedLessons / totalLessons) * 100);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background"
    >
      {/* Course Header */}
      <div className="relative h-[50vh] overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${course.thumbnail_url})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/95" />
        
        <div className="relative z-10 h-full flex items-center">
          <div className="max-w-7xl mx-auto px-4 md:px-8 w-full">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard/education')}
              className="mb-6 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Imperial Academy
            </Button>

            <div className="max-w-3xl">
              <Badge variant="outline" className="mb-4 capitalize">
                {course.difficulty}
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                {course.title}
              </h1>
              <p className="text-xl text-muted-foreground mb-6">
                {course.description}
              </p>

              <div className="flex items-center space-x-6 mb-6">
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-5 h-5 text-accent" />
                  <span className="text-muted-foreground">{totalLessons} lessons</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-accent" />
                  <span className="text-muted-foreground">
                    {course.lessons.reduce((acc, lesson) => acc + lesson.duration, 0)} minutes
                  </span>
                </div>
              </div>

              {userProgress && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Progress</span>
                    <span className="text-sm text-muted-foreground">{progressPercentage}%</span>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lessons List */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        <h2 className="text-2xl font-bold text-foreground mb-8">Course Content</h2>
        
        <div className="space-y-4">
          {course.lessons.map((lesson, index) => {
            const isCompleted = isLessonCompleted(index);
            const isUnlocked = isLessonUnlocked(index);

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className={`group cursor-pointer transition-all duration-200 ${
                    isUnlocked ? 'hover:border-accent/50' : 'opacity-60'
                  } ${isCompleted ? 'border-green-500/30 bg-green-500/5' : ''}`}
                  onClick={() => isUnlocked && handleLessonSelect(index)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        {isCompleted ? (
                          <CheckCircle className="w-8 h-8 text-green-400" />
                        ) : isUnlocked ? (
                          <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center group-hover:bg-accent/30 transition-colors">
                            <Play className="w-4 h-4 text-accent" />
                          </div>
                        ) : (
                          <Lock className="w-8 h-8 text-muted-foreground" />
                        )}
                      </div>

                      <div className="flex-grow">
                        <div className="flex items-center justify-between">
                          <h3 className={`font-semibold ${isUnlocked ? 'text-foreground group-hover:text-accent' : 'text-muted-foreground'} transition-colors`}>
                            {index + 1}. {lesson.title}
                          </h3>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            <span>{lesson.duration}min</span>
                          </div>
                        </div>
                        <p className="text-muted-foreground text-sm mt-1">
                          {lesson.summary}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
