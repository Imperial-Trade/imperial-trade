
import { GraduationCapIcon, BookOpenIcon, PlayIcon } from "lucide-react";
import Education from "./pages/dashboard/education/Education";
import Course from "./pages/dashboard/education/Course";
import Watch from "./pages/dashboard/education/Watch";

/**
 * Central place for defining the navigation items. Used for navigation components and routing.
 */
export const navItems = [
  {
    title: "Imperial Academy",
    to: "/dashboard/education",
    icon: <GraduationCapIcon className="h-4 w-4" />,
    page: <Education />,
  },
];

// Additional routes that don't appear in main navigation
export const additionalRoutes = [
  {
    path: "education/course/:courseId",
    component: <Course />,
  },
  {
    path: "education/watch/:courseId/:lessonIndex", 
    component: <Watch />,
  },
];
