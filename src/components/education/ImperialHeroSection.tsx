
import React from "react";
import { motion } from "framer-motion";
import { Play, TrendingUp, Award, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Course {
  id: string;
  title: string;
  description: string;
  lessons: any[];
  thumbnail_url: string;
}

interface ImperialHeroSectionProps {
  featuredCourse?: Course;
  onCourseSelect: (course: Course) => void;
}

export default function ImperialHeroSection({ featuredCourse, onCourseSelect }: ImperialHeroSectionProps) {
  if (!featuredCourse) {
    return (
      <div className="relative h-[70vh] bg-gradient-to-r from-background via-muted/20 to-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold gold-text-gradient mb-4">
            Imperial Academy
          </h1>
          <p className="text-xl text-muted-foreground">
            Loading your trading education journey...
          </p>
        </div>
      </div>
    );
  }

  const totalLessons = featuredCourse.lessons?.length || 0;
  const totalDuration = featuredCourse.lessons?.reduce((acc: number, lesson: any) => acc + (lesson.duration || 0), 0) || 0;

  return (
    <div className="relative h-[80vh] overflow-hidden">
      {/* Background with trading chart overlay */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${featuredCourse.thumbnail_url})`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/95" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex items-center">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="flex items-center space-x-2 mb-4">
                <Award className="w-6 h-6 text-accent" />
                <span className="text-accent font-semibold text-sm uppercase tracking-wider">
                  Imperial Academy
                </span>
              </div>

              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                <span className="gold-text-gradient">Master Trading</span>
                <br />
                <span className="text-foreground">Like a Professional</span>
              </h1>

              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                Transform your financial future with our comprehensive trading education. 
                Learn from industry experts and join thousands of successful traders.
              </p>

              <div className="flex items-center space-x-6 mb-8">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-accent" />
                  <span className="text-sm text-muted-foreground">10 Modules</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-accent" />
                  <span className="text-sm text-muted-foreground">Comprehensive Curriculum</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  onClick={() => onCourseSelect(featuredCourse)}
                  className="bg-accent hover:bg-accent/80 text-accent-foreground px-8 py-3 text-lg"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Start Learning
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-accent/50 text-accent hover:bg-accent/10 px-8 py-3 text-lg"
                >
                  View Curriculum
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 left-1/4 w-48 h-48 bg-primary/5 rounded-full blur-2xl" />
    </div>
  );
}
