
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Clock, BookOpen } from "lucide-react";
import { motion } from "framer-motion";

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  lessons: any[];
  thumbnail_url: string;
}

interface ModuleCardProps {
  course: Course;
  onClick: () => void;
  moduleNumber: number;
}

const difficultyColors = {
  beginner: "bg-green-500/10 text-green-400 border-green-500/20",
  intermediate: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  advanced: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  expert: "bg-red-500/10 text-red-400 border-red-500/20"
};

export default function ModuleCard({ course, onClick, moduleNumber }: ModuleCardProps) {
  const totalLessons = course.lessons?.length || 0;
  const totalDuration = course.lessons?.reduce((acc: number, lesson: any) => 
    acc + (lesson.duration || 0), 0) || 0;

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className="group cursor-pointer overflow-hidden bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 border-border/50 hover:border-accent/50"
        onClick={onClick}
      >
        <div className="relative">
          <div 
            className="h-48 bg-cover bg-center"
            style={{ backgroundImage: `url(${course.thumbnail_url})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
            <div className="absolute top-4 left-4">
              <Badge variant="secondary" className="text-xs font-semibold">
                Module {moduleNumber}
              </Badge>
            </div>
            <div className="absolute top-4 right-4">
              <Badge 
                variant="outline" 
                className={`text-xs capitalize ${difficultyColors[course.difficulty as keyof typeof difficultyColors] || difficultyColors.beginner}`}
              >
                {course.difficulty}
              </Badge>
            </div>
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="bg-accent/90 rounded-full p-3">
                <Play className="w-6 h-6 text-accent-foreground" />
              </div>
            </div>
          </div>
        </div>

        <CardContent className="p-6">
          <h3 className="font-bold text-lg mb-2 text-foreground group-hover:text-accent transition-colors">
            {course.title}
          </h3>
          <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
            {course.description}
          </p>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <BookOpen className="w-4 h-4" />
              <span>{totalLessons} lessons</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>{totalDuration}min</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
