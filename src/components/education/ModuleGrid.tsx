
import React from "react";
import { motion } from "framer-motion";
import ModuleCard from "./ModuleCard";

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  lessons: any[];
  thumbnail_url: string;
}

interface ModuleGridProps {
  courses: Course[];
  onCourseSelect: (course: Course) => void;
}

const difficultyOrder = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };

export default function ModuleGrid({ courses, onCourseSelect }: ModuleGridProps) {
  const sortedCourses = [...courses].sort((a, b) => {
    const aOrder = difficultyOrder[a.difficulty as keyof typeof difficultyOrder] || 999;
    const bOrder = difficultyOrder[b.difficulty as keyof typeof difficultyOrder] || 999;
    return aOrder - bOrder;
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {sortedCourses.map((course, index) => (
        <motion.div
          key={course.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.5 }}
        >
          <ModuleCard 
            course={course}
            onClick={() => onCourseSelect(course)}
            moduleNumber={index + 1}
          />
        </motion.div>
      ))}
    </div>
  );
}
