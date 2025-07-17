
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle, Play, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface Course {
  id: string;
  title: string;
  lessons: Lesson[];
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
  current_lesson_index?: number;
  progress_percentage?: number;
}

export default function Watch() {
  const { courseId, lessonIndex } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasWatchedEnough, setHasWatchedEnough] = useState(false);

  const currentLessonIndex = parseInt(lessonIndex || '0');
  const currentLesson = course?.lessons[currentLessonIndex];

  useEffect(() => {
    const initialize = async () => {
      if (!courseId) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        const { data: courseData } = await supabase
          .from('courses')
          .select('id, title, lessons')
          .eq('id', courseId)
          .single();

        if (courseData) {
          const transformedCourse: Course = {
            ...courseData,
            lessons: Array.isArray(courseData.lessons) ? courseData.lessons : []
          };
          setCourse(transformedCourse);
        }

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
              current_lesson_index: progressData.current_lesson_index || 0,
              progress_percentage: progressData.progress_percentage || 0
            });
          }
        }
      } catch (error) {
        console.error('Error initializing watch page:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [courseId]);

  const markLessonComplete = async () => {
    if (!user || !course || !currentLesson) return;

    try {
      const completedLessons = userProgress?.completed_lessons || [];
      
      if (!completedLessons.includes(currentLessonIndex)) {
        const newCompletedLessons = [...completedLessons, currentLessonIndex];
        const newProgress = Math.round((newCompletedLessons.length / course.lessons.length) * 100);

        if (userProgress) {
          // Update existing progress - only update fields that exist in the table
          await supabase
            .from('user_progress')
            .update({
              status: newProgress === 100 ? 'completed' : 'in_progress',
              updated_at: new Date().toISOString()
            })
            .eq('id', userProgress.id);
        } else {
          // Create new progress record
          await supabase
            .from('user_progress')
            .insert({
              user_id: user.id,
              video_id: course.id, // Required field
              status: 'in_progress',
              user_email: user.email || '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
        }

        toast.success("Lesson completed! 🎉", {
          description: "Great job! You've earned 10 trading points."
        });

        // Navigate to next lesson or back to course
        if (currentLessonIndex < course.lessons.length - 1) {
          navigate(`/dashboard/education/watch/${courseId}/${currentLessonIndex + 1}`);
        } else {
          toast.success("Course completed! 🏆", {
            description: "Congratulations on completing the entire course!"
          });
          navigate(`/dashboard/education/course/${courseId}`);
        }
      }
    } catch (error) {
      console.error('Error marking lesson complete:', error);
      toast.error("Failed to save progress. Please try again.");
    }
  };

  const goToNextLesson = () => {
    if (!course) return;
    
    if (currentLessonIndex < course.lessons.length - 1) {
      navigate(`/dashboard/education/watch/${courseId}/${currentLessonIndex + 1}`);
    } else {
      navigate(`/dashboard/education/course/${courseId}`);
    }
  };

  // Simulate video watch progress (in real implementation, this would track actual video time)
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasWatchedEnough(true);
    }, 5000); // Allow completion after 5 seconds for demo

    return () => clearTimeout(timer);
  }, [currentLessonIndex]);

  if (isLoading || !course || !currentLesson) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  const isCompleted = userProgress?.completed_lessons?.includes(currentLessonIndex) || false;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background"
    >
      {/* Navigation */}
      <div className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate(`/dashboard/education/course/${courseId}`)}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Course
            </Button>
            <div className="text-sm text-muted-foreground">
              Lesson {currentLessonIndex + 1} of {course.lessons.length}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Video Player */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              <div className="aspect-video bg-muted flex items-center justify-center">
                {/* YouTube Player Placeholder */}
                <div className="text-center">
                  <Play className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    YouTube Player: {currentLesson.youtube_video_id}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Duration: {currentLesson.duration} minutes
                  </p>
                </div>
              </div>
            </Card>

            {/* Lesson Info */}
            <div className="mt-6">
              <h1 className="text-2xl font-bold text-foreground mb-2">
                {currentLesson.title}
              </h1>
              <p className="text-muted-foreground mb-6">
                {currentLesson.summary}
              </p>

              {/* Action Buttons */}
              <div className="flex items-center space-x-4">
                <Button
                  onClick={markLessonComplete}
                  disabled={!hasWatchedEnough || isCompleted}
                  size="lg"
                  className={isCompleted ? "bg-green-600 hover:bg-green-600" : ""}
                >
                  {isCompleted ? (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Completed
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Mark Complete
                    </>
                  )}
                </Button>

                {currentLessonIndex < course.lessons.length - 1 && (
                  <Button
                    variant="outline"
                    onClick={goToNextLesson}
                    size="lg"
                  >
                    <SkipForward className="w-5 h-5 mr-2" />
                    Next Lesson
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Course Navigation */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-4">Course Content</h3>
                <div className="space-y-2">
                  {course.lessons.map((lesson, index) => {
                    const isCurrentLesson = index === currentLessonIndex;
                    const isLessonCompleted = userProgress?.completed_lessons?.includes(index) || false;

                    return (
                      <div
                        key={index}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          isCurrentLesson 
                            ? 'bg-accent/20 border border-accent/30' 
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => navigate(`/dashboard/education/watch/${courseId}/${index}`)}
                      >
                        <div className="flex items-center space-x-3">
                          {isLessonCompleted ? (
                            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                          ) : (
                            <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ${
                              isCurrentLesson ? 'border-accent bg-accent' : 'border-muted-foreground'
                            }`} />
                          )}
                          <div className="flex-grow min-w-0">
                            <p className={`text-sm font-medium truncate ${
                              isCurrentLesson ? 'text-accent' : 'text-foreground'
                            }`}>
                              {index + 1}. {lesson.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {lesson.duration}min
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
